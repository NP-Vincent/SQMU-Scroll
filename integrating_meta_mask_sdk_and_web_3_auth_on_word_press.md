# Integrating MetaMask SDK and Web3Auth on a WordPress Site

This guide will show you how to add **MetaMask SDK** and **Web3Auth SDK** as login options on your WordPress.com site (via a Custom HTML block). By the end, users will be able to choose between logging in with **MetaMask** (for crypto-savvy users with a wallet) or **Web3Auth** (for users who prefer social logins that create a wallet for them). Both solutions are now closely integrated – Web3Auth’s technology is actually part of MetaMask’s **Embedded Wallets SDK** – so they work seamlessly together. All authentication will be done client-side in the browser, and both desktop and mobile users are supported out-of-the-box.

## Prerequisites

- **WordPress.com Plan**: Ensure you have the ability to add custom HTML/JavaScript (WordPress.com may require a Business plan or higher for custom scripts). You will be adding a **Custom HTML** block to your site’s page or template to include the integration.
- **MetaMask SDK Access**: Sign up for a free Infura project if possible, to get an **Infura API key**. While not strictly required, providing an Infura Project ID in the MetaMask SDK configuration is recommended for blockchain reads when the user is not connected. (MetaMask SDK uses Infura for fallback RPC calls.)
- **Web3Auth Project**: Register on the [Web3Auth Dashboard](https://dashboard.web3auth.io) and note your **Client ID** for your project. This is required to initialize Web3Auth in your app.
- **MetaMask Wallet**: Have MetaMask installed in your desktop browser (for testing the MetaMask login flow). For mobile testing, the MetaMask SDK can connect to the MetaMask mobile app via deep links.
- **Basic HTML/JS Knowledge**: The integration involves adding script tags and a bit of JavaScript within an HTML block. No build tools or frameworks are needed – we’ll use CDN links for the SDKs and plain JS.

## 1. Including the SDK Scripts

The first step is to include the MetaMask and Web3Auth SDK scripts in your page. In your WordPress.com editor, add a **Custom HTML** block where you want the login buttons or functionality. Inside that block, add the following script includes:

```html
<!-- Include MetaMask SDK (via CDN) -->
<script src="https://c0f4f41c-2f55-4863-921b-sdk-docs.github.io/cdn/metamask-sdk.js"></script>

<!-- Include Web3Auth SDK (via CDN) -->
<script src="https://cdn.jsdelivr.net/npm/@web3auth/web3auth@latest/dist/web3auth.umd.min.js"></script>
```

The first script brings in the MetaMask SDK library, and the second loads Web3Auth’s UMD bundle for use in vanilla JS. Once these are included, they will expose global objects we can use: `MetaMaskSDK` for MetaMask and `Web3Auth` for Web3Auth.

**Note:** WordPress might sanitize or delay loading of these scripts. If you encounter issues, ensure that the Custom HTML block is saved properly and that your WordPress plan allows external script inclusion. Both URLs are official CDN links provided by MetaMask and Web3Auth documentation.

## 2. Initializing the MetaMask SDK

Next, initialize the MetaMask SDK in a script. You can do this in the same Custom HTML block, after the script includes. For example:

```html
<script>
  // Configure MetaMask SDK
  const MMSDK = new MetaMaskSDK.MetaMaskSDK({
    dappMetadata: {
      name: "Your Dapp Name",              // Name of your application
      url: window.location.href           // Your site URL
    },
    infuraAPIKey: "YOUR_INFURA_API_KEY",  // (Optional) Infura Project ID for RPC
    headless: false                      // Use MetaMask UI modal if needed
  });

  // (We'll add connection logic in the next steps)
</script>
```

Let’s break down the options being used above:

- **dappMetadata.name** – A human-readable name for your app. This will be shown in the MetaMask connection prompt to identify the dApp. It’s **required** in the SDK config.
- **dappMetadata.url** – Your site’s URL. It’s good practice to include this (MetaMask may use it for display or security context).
- **infuraAPIKey** – (Optional) Your Infura API key. If provided, the SDK can perform read-only blockchain requests (e.g. to query chain ID or account state) even before the user connects their wallet. If you don’t have an Infura ID or prefer not to use one, you can omit this; just remove this line or leave it undefined.
- **headless** – By setting this to `false`, you enable the MetaMask SDK’s default modal UI when appropriate. For example, if a desktop user doesn’t have the MetaMask extension installed, the SDK might show a prompt or QR code to connect with MetaMask mobile. Generally, keep `headless: false` to leverage MetaMask’s built-in UI for connection (as recommended in MetaMask’s docs).

Once configured, you’ll have a `MMSDK` instance. From this, you can get the Ethereum provider or prompt connections. For instance, `MMSDK.getProvider()` will give the Web3 provider (similar to `window.ethereum`), and `MMSDK.connect()` will trigger the connection flow to MetaMask. We will call these methods on user interaction in a moment.

**MetaMask Mobile Support:** The MetaMask SDK is designed to work across desktop and mobile seamlessly. If a user on a mobile browser taps “Connect with MetaMask”, the SDK will securely deep-link to the MetaMask mobile app without requiring them to use an in-app browser. This means our integration will work on mobile devices as well, with no extra effort.

## 3. Initializing the Web3Auth SDK

Now, set up the Web3Auth SDK so users can log in with social accounts or other non-MetaMask methods. We will use Web3Auth’s **Modal** (Plug and Play) SDK, which provides a pre-built login modal. After including the script, initialize it as follows:

```html
<script>
  // Configure Web3Auth
  const web3auth = new Web3Auth({
    clientId: "YOUR_WEB3AUTH_CLIENT_ID",  // Your Web3Auth Client ID from dashboard
    network: "mainnet"                    // Network: "mainnet" (Sapphire Mainnet) or "testnet"
  });

  // Initialize Web3Auth modal (prepares the UX)
  async function initWeb3Auth() {
    try {
      await web3auth.init();  // initializes the modal (use initModal() if using an older version)
      console.log("Web3Auth ready");
    } catch (e) {
      console.error("Web3Auth initialization error:", e);
    }
  }
  initWeb3Auth();
</script>
```

Explanation of the configuration:

- **clientId** – This is the unique identifier for your application obtained from the Web3Auth developer dashboard. It’s required to use the service. Make sure to replace `"YOUR_WEB3AUTH_CLIENT_ID"` with your actual ID.
- **network** – This selects which Web3Auth network to use. Use `"mainnet"` for the production environment (also known as **Sapphire Mainnet** in Web3Auth v10), or `"testnet"` for testing (Sapphire Devnet). In the code above we use mainnet; for initial testing you might use testnet.

After creating the `web3auth` instance, we call `web3auth.init()`. This **must** be done before trying to connect, so that the Web3Auth modal is ready to launch. We’ve wrapped it in an `initWeb3Auth()` async function for convenience. This function is called immediately to initialize Web3Auth as the page loads. (If your WordPress environment doesn’t support top-level `await`, this pattern is a safe alternative.)

**Note:** In some examples (especially older versions of the SDK), you might see `web3auth.initModal()` used instead of `init()`. As of the latest Web3Auth SDK, simply use `init()` – it prepares the modal and recovers any existing login session if the user was previously logged in.

## 4. Adding Login Buttons and Handling User Actions

With both SDKs configured and initialized, the next step is to create UI elements for users to choose a login method, and to tie those buttons to the SDK connection functions.

In your Custom HTML block, you can add two buttons for the login options, for example:

```html
<button id="login-metamask">🔑 Login with MetaMask</button>
<button id="login-web3auth">🌐 Login with Web3Auth</button>
```

You can style these buttons with CSS as needed. The important part is to give them IDs so we can refer to them in our script. Now add event listeners in the script to handle clicks:

```html
<script>
  // ... (MetaMask and Web3Auth initialization as above) ...

  // Handle MetaMask login button click
  const metaMaskBtn = document.getElementById("login-metamask");
  metaMaskBtn.addEventListener("click", async () => {
    try {
      const accounts = await MMSDK.connect();  // Initiates MetaMask connection prompt
      console.log("MetaMask connected accounts:", accounts);
      // You can now use accounts[0] as the user's Ethereum address
    } catch (err) {
      console.error("MetaMask connection failed:", err);
    }
  });

  // Handle Web3Auth login button click
  const web3AuthBtn = document.getElementById("login-web3auth");
  web3AuthBtn.addEventListener("click", async () => {
    try {
      const provider = await web3auth.connect();  // Opens Web3Auth social login modal
      console.log("Web3Auth connected");
      // `provider` is an EIP-1193 compatible provider for the logged-in wallet
    } catch (err) {
      console.error("Web3Auth login failed:", err);
    }
  });
</script>
```

**How this works:** When the user clicks **“Login with MetaMask”**, we call `MMSDK.connect()`. This will prompt the MetaMask extension to connect (or if on mobile, it will deep-link to the MetaMask app) and return an array of accounts once the user approves. Typically you’ll get back an array like `["0x1234..."]` – the first address is the user’s wallet. You can use that for identification in your dApp (e.g., greet the user or display their address). The MetaMask SDK ensures this works across desktop and mobile seamlessly.

When the user clicks **“Login with Web3Auth”**, we call `web3auth.connect()`. This triggers the Web3Auth modal to appear, offering choices like Google login, Facebook, email, etc., depending on what you configured in the Web3Auth dashboard. After the user completes a social login, Web3Auth will internally generate or retrieve their private key and provide a **provider** object. The `provider` returned is analogous to an Ethereum wallet provider (just like MetaMask’s `window.ethereum`) that you can use for blockchain calls. We log a message for now; in a real app you might proceed to fetch the user’s account info or transition to the app’s logged-in state.

Both of these calls (`MMSDK.connect()` and `web3auth.connect()`) should be triggered by user interaction (a button click) to comply with browser pop-up blocking rules. The code above attaches the calls to button events, which is the recommended approach. If the user has already connected before and refreshed the page, Web3Auth’s `init()` might have retained their session – in that case `web3auth.connect()` may immediately return a provider without a new pop-up. MetaMask, on the other hand, will remember connected sites and typically `MMSDK.connect()` will return immediately with the account if the user had previously approved connection.

## 5. Using the Wallet Providers (Sending Transactions, Signing Messages)

After a successful login, your dApp has access to the user’s wallet via the provider objects:

- **MetaMask Provider:** You can get the MetaMask provider by `const ethereumProvider = MMSDK.getProvider()`. This is the same provider that `window.ethereum` would give when MetaMask is installed. You can use it to make RPC calls (e.g., `ethereumProvider.request({ method: 'eth_chainId' })`) or integrate it with libraries like **ethers.js** or **web3.js**. For instance, with ethers v6 you can do:

  ```js
  const ethersProvider = new ethers.BrowserProvider( ethereumProvider );
  ```

  This wraps the MetaMask provider for convenience in ethers. Signing a message or sending a transaction can then be done through ethers methods (which will prompt MetaMask to authorize the action). MetaMask SDK also provides a shortcut method `connectAndSign` if you want to do a one-step connect + sign message flow, but in most cases you can just use the provider to call `personal_sign` or other Ethereum JSON-RPC methods as needed.

- **Web3Auth Provider:** The object returned by `web3auth.connect()` or accessible via `web3auth.provider` is an EIP-1193 compatible provider backed by Web3Auth. This means you can use it in similar ways as a MetaMask provider. For example, you could again wrap it with an ethers.js BrowserProvider:

  ```js
  // Assuming `provider` is the Web3Auth provider from web3auth.connect()
  const ethersProvider = new ethers.BrowserProvider(provider);
  ```

  The Web3Auth docs explicitly demonstrate using the returned provider with ethers. Once wrapped or even used directly, you can request accounts, sign messages, and send transactions through this provider. Under the hood, Web3Auth handles the cryptographic signing with the key derived from the user’s social login. For instance, to get the connected account address without another library, you could call:

  ```js
  const accounts = await provider.request({ method: 'eth_accounts' });
  console.log(accounts[0]);
  ```

  You can similarly call `provider.request({ method: 'eth_sendTransaction', params: [txObject] })` to prompt a transaction signing, or use ethers’ `Signer` obtained from `ethersProvider.getSigner()`.

Both MetaMask and Web3Auth providers give you **full web3 functionality** – your dApp can interact with smart contracts, sign messages (for authentication or off-chain actions), and perform transactions on behalf of the user. The main difference is in how the user logs in and where the keys are managed:

- With **MetaMask**, the keys live in the user’s MetaMask wallet (browser extension or mobile app). When `MMSDK.connect()` is called, MetaMask will prompt the user to connect your site, and later prompts will appear in the MetaMask UI whenever you request a transaction or signature.
- With **Web3Auth**, the keys are managed by Web3Auth’s SDK (non-custodially, often using techniques like MPC). When `web3auth.connect()` is called, the user chooses a social login. After that, the Web3Auth modal might close and your site can directly invoke blockchain requests on the user’s behalf using the provided provider. The user experience here is different – signing a transaction might bring up a Web3Auth wallet UI or simply use the existing authenticated session to sign behind the scenes, depending on how Web3Auth is configured. The advantage is that a user *without* any crypto wallet or extension can start using your dApp with just a Google or Twitter login, lowering the barrier to entry.

## 6. Final Integration Tips (WordPress Specific)

- **Embedding the Code:** Place the scripts and code in the WordPress Custom HTML block in the order described: first the SDK `<script src="...">` tags, then your initialization and event-handling script. WordPress will execute this on the client side when the page loads. There’s no need for any server-side code.
- **Ordering:** Make sure the MetaMask and Web3Auth scripts are loaded **before** you try to use `new MetaMaskSDK(...)` or `new Web3Auth(...)`. In the example above, we included the SDKs at the top of the HTML block, and our initialization code after, which is the correct order. If you split the code into multiple `<script>` tags, ensure the ones loading libraries come first.
- **Security:** The integration as shown is client-side only. For most use-cases (like gating content or performing blockchain transactions) this is fine. If you plan to treat a crypto wallet login as an authentication method to your own backend or user system, you might later implement a signature challenge (e.g., have the user sign a message to prove ownership of the address and then create a session token). Both MetaMask and Web3Auth support message signing. MetaMask SDK even provides `connectAndSign({msg: "Sign in"})` for a one-step signin flow. Web3Auth’s provider can sign messages via `personal_sign` RPC calls.
- **Testing:** Test the MetaMask flow on a desktop browser with the MetaMask extension installed. You should see the MetaMask popup when clicking the button and the console logging the connected account. For Web3Auth, clicking the button should bring up the Web3Auth modal. Try a social login (e.g., Google) and ensure the console logs “Web3Auth connected” and possibly an account address if you request it. Check on a mobile device as well: on mobile Safari/Chrome, the MetaMask button should trigger a switch to the MetaMask app (if installed) or show a QR code to scan. The Web3Auth button on mobile will show a mobile-friendly login dialog. Both SDKs are designed to work across browsers and devices, so you should have a smooth experience.

By following these steps, you’ve enabled a dual login system on your WordPress-based dApp. Crypto-native users can use MetaMask for a familiar experience, and new users can sign up with Web3Auth’s social login to get an embedded wallet instantly. This combined approach simplifies onboarding without sacrificing functionality – both methods ultimately provide you with a web3 provider through which you can call blockchain APIs, sign messages, and send transactions as needed.

**Sources:**

- MetaMask SDK Documentation – *“Connect to MetaMask using JavaScript”*
- MetaMask SDK Documentation – *SDK Configuration Options*
- MetaMask SDK Introduction – *Benefits and Mobile Support*
- MetaMask SDK Introduction – *Embedded Wallet (Web3Auth) Info*
- Web3Auth Documentation – *Web JS SDK Quickstart*
- Web3Auth Community Forum – *Including Web3Auth via Script Tag (vanilla JS example)*


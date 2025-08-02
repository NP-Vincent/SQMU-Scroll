# Review of `wallet.js` and MetaMask SDK Integration

## MetaMask SDK Integration Requirements

MetaMask’s documentation recommends using the MetaMask JavaScript SDK (via CDN for plain JS) to connect and interact with MetaMask. The typical steps include:

- **Include the SDK via CDN:** Add a script tag for the MetaMask SDK in your HTML. For example:

  ```html
  <script src="https://.../metamask-sdk.js"></script>
  ```

  This provides a global `MetaMaskSDK` object for use in the page.

- **Initialize the SDK:** Create an SDK instance with your dApp’s metadata and (optionally) an Infura API key. For example:

  ```js
  const MMSDK = new MetaMaskSDK.MetaMaskSDK({
    dappMetadata: { name: "Your Dapp Name", url: window.location.href },
    infuraAPIKey: "YOUR_INFURA_API_KEY",  // optional, for RPC
    headless: false  // show modal UI if needed (default is false)
  });
  ```

  This aligns with the recommended usage (the CDN build attaches `MetaMaskSDK.MetaMaskSDK` as the constructor). Providing `dappMetadata` is **required**, and including an Infura key is recommended for read-only calls.

- **Obtain the provider:** Use `MMSDK.getProvider()` to get a provider object (which wraps `window.ethereum` or establishes a connection to MetaMask mobile). You can then use this provider to make RPC requests. For example:

  ```js
  const ethereum = MMSDK.getProvider();
  ```

- **Connect to MetaMask:** Invoke a connection request (usually on a user action like clicking a **Connect** button). The SDK offers a convenience method `MMSDK.connect()` which returns the array of accounts if the user approves. Alternatively, you can directly request the `eth_accounts` permission via `ethereum.request(...)`. MetaMask’s **Wallet API** suggests using `eth_requestAccounts` (which internally calls `wallet_requestPermissions` for the `eth_accounts` scope) to prompt the user for account access. In practice, both `MMSDK.connect()` and an explicit permission request achieve the same result of getting the user's Ethereum account.

- **Handle permissions and accounts:** When using `wallet_requestPermissions`, check that the `eth_accounts` permission was granted. The MetaMask docs illustrate finding the returned permission object for `eth_accounts` and confirming it exists. Upon success, you’ll have access to `ethereum.selectedAddress` or the result of `eth_accounts` for the user’s address.

- **Manage networks (optional):** If your dApp needs a specific network (chain), use `wallet_switchEthereumChain` to switch and catch the error for an unrecognized chain (error code `4902`). If the chain is not added in MetaMask, use `wallet_addEthereumChain` with the chain parameters, then call switch again. This sequence is the recommended way to programmatically ensure the user is on the correct network.

- **Cleanly disconnect (optional):** To revoke access, use `wallet_revokePermissions` for the `eth_accounts` permission, and terminate the SDK connection if needed. MetaMask’s API supports revoking permissions to essentially “disconnect” the wallet from the dApp. The MetaMask SDK also provides a `MMSDK.terminate()` method to end the session/bridge, which is useful especially if a mobile link was established.

## Evaluation of `wallet.js` Implementation

The provided `` code implements the above requirements largely in line with MetaMask’s best practices:

- **SDK Initialization:** The code creates a global SDK instance:

  ```js
  const MMSDK = new MetaMaskSDK.MetaMaskSDK({
      dappMetadata: { name: 'SQMU Wallet', url: window.location.href },
      infuraAPIKey: '822e08935dea4fb48f668ff353ac863a'
  });
  ```

  This matches the recommended pattern for a CDN integration. The dApp name and current URL are provided, and an Infura project key is included (so the SDK can perform read-only RPC calls through Infura when needed). This is a proper use of the SDK constructor. (Note: Exposing an Infura key in front-end code is generally acceptable since it’s not a secret, though you might rotate it if it’s a public project.)

- **Connecting to Wallet (Accounts Permission):** The `connectWallet(statusId)` function calls:

  ```js
  const ethereum = MMSDK.getProvider();
  await ethereum.request({
      method: 'wallet_requestPermissions',
      params: [ { eth_accounts: {} } ]
  });
  ```

  This is effectively requesting account access from the user, equivalent to the SDK’s `connect()` flow. The use of `wallet_requestPermissions` for `eth_accounts` is aligned with MetaMask’s latest API recommendations, as shown in MetaMask’s docs. The code then checks the returned permissions array to ensure the `eth_accounts` permission was granted, which is a good practice (throwing an error if not granted). This explicit check is slightly more verbose than using `MMSDK.connect()`, but it gives the developer control and avoids immediately calling `eth_requestAccounts` twice (the code’s comment notes that calling `eth_accounts` again right after could trigger a duplicate popup). In summary, the connection logic in `wallet.js` meets the requirement of prompting the user and obtaining their account **on a user action**, which is crucial for best practice (MetaMask will reject or warn if calls happen without user interaction).

- **Network Switching to Scroll:** After connecting, the code obtains the current chain via `eth_chainId`. If it’s not the expected Scroll chain (ID `0x82750`), it attempts to switch to that chain:

  ```js
  await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SCROLL_CHAIN_ID }] });
  ```

  If that fails with error code `4902` (chain not added), it then sends a `wallet_addEthereumChain` request with the predefined `SCROLL_PARAMS`, and subsequently calls `wallet_switchEthereumChain` again. This flow exactly follows MetaMask’s recommended approach for adding then switching networks programmatically. By wrapping this in a try/catch, the code handles both the case where the user’s MetaMask already knows about the Scroll network and the case where it doesn’t. If the user **rejects** the network switch or add request, the error is caught and displayed. This is a robust implementation for ensuring the dApp is on the right network.

- **Using Ethers.js Provider and Signer:** Once connected and on the correct chain, the code creates an `ethers.providers.Web3Provider` using the `ethereum` provider and then gets a `signer` from it. This is a common pattern to integrate the MetaMask provider with ethers.js for convenience. It’s not mandated by MetaMask’s SDK (you could use `ethereum.request` directly for all calls), but using ethers is fine and does not conflict with the SDK. It can be considered a best practice for easily interacting with contracts and signing transactions if your app uses ethers.js. There’s no issue here; the SDK’s provider works as a drop-in for Web3 libraries.

- **Updating UI Status:** The code updates a status DOM element with messages (“Connecting…”, “Connected to Scroll”, or error messages). This is outside the SDK’s scope but is good UX practice. One detail: it uses `innerHTML` to insert messages (including an error’s `err.message`). The messages from MetaMask (like `"User rejected the request."` for a denied request, or errors like `"Permissions request already pending."` for duplicate requests) are generally safe to display. However, always ensure no unescaped HTML is in those messages to avoid any injection (MetaMask error strings are plain text).

- **Disconnecting (Revoking Permissions):** The `disconnectWallet(statusId)` function does:

  ```js
  await ethereum.request({
      method: 'wallet_revokePermissions',
      params: [ { eth_accounts: {} } ]
  });
  MMSDK.terminate();
  ```

  This cleanly revokes the dApp’s access to the user’s accounts and terminates the MetaMask SDK session. It aligns with MetaMask’s guidance to use `wallet_revokePermissions` to remove the `eth_accounts` permission. Calling `MMSDK.terminate()` ensures that if a persistent connection (e.g., a WalletConnect session to MetaMask mobile) was established, it’s properly closed. This is indeed a **best practice** for a “disconnect” button, ensuring a seamless full disconnect. After this, the UI is updated to show a “Disconnected” state.

Overall, the `wallet.js` code covers the key requirements: **loading the SDK, connecting to MetaMask, handling accounts and network, and disconnecting**. It follows MetaMask’s SDK documentation and **implements best practices** (like permission requests, error handling, and network management).

## Best Practices and Recommendations

Your `wallet.js` implementation is solid and mostly meets the MetaMask SDK guidance for a CDN-based integration. Below are a few additional best-practice notes and minor suggestions to ensure error-free, seamless operation:

- **Load Order:** Ensure that the MetaMask SDK script is loaded **before** `wallet.js` in your HTML. Since `wallet.js` uses `MetaMaskSDK.MetaMaskSDK` immediately, the SDK library must be available. Typically, you’d include the CDN script in the `<head>` or before the closing `<body>` tag, then include `wallet.js` after it (or mark the SDK script with `defer` and put `wallet.js` after, etc.). This guarantees `MetaMaskSDK` is defined when `wallet.js` runs.

- **User Interaction for Connect:** It appears `connectWallet()` is likely called on a user clicking a connect button (since it updates a status element). This is correct – MetaMask requires the connection request to be triggered by a user gesture. Avoid calling `MMSDK.connect()` or the permission request automatically on page load. The provided code respects this by only calling `requestPermissions` inside `connectWallet()`, which is good.

- **Using **``** (Optional):** As mentioned, instead of manually requesting permissions, you could use the SDK’s `MMSDK.connect()` method for brevity. For example:

  ```js
  const accounts = await MMSDK.connect();
  ```

  This will prompt the user for connection and return the accounts array if approved. In practice, it does the same thing as your current code. Your approach with `wallet_requestPermissions` is perfectly fine and gives you the opportunity to handle the permission object in detail. There’s no need to change this if it’s working, but it’s good to know both approaches are valid.

- **Handling Duplicate Requests:** If the user clicks the connect button multiple times quickly, MetaMask may throw an error `-32002: Request of type 'wallet_requestPermissions' already pending.`. Your code catches any error and displays it (which would show a MetaMask-generated message in red). As a refinement, you might detect this specific error code and inform the user that a connection request is already in progress (instead of showing the raw error message). This can prevent confusion if they click twice. For example:

  ```js
  } catch (err) {
      if (err.code === -32002) {
         statusDiv.innerHTML = "<span style='color:red;'>Request already pending. Check MetaMask.</span>";
      } else {
         statusDiv.innerHTML = `<span style='color:red;'>${err.message}</span>`;
      }
      throw err;
  }
  ```

  This is a minor UX improvement to handle a common MetaMask scenario.

- **Mobile vs. Desktop Behavior:** The MetaMask SDK by default will detect if MetaMask extension is present. If not (e.g. on a mobile browser without MetaMask extension), it will likely open the MetaMask app connection flow (showing a QR code or deep linking to the MetaMask mobile app) when you call `connect` or make a request. Your current setup (`headless: false` by default) means a modal should appear guiding the user. This is desirable for a “seamless” connection on mobile. Just be aware that on mobile **network switching** (the `wallet_switchEthereumChain` call) is not supported via WalletConnect as of this writing – MetaMask Mobile will throw an error for that RPC method. In practice, if a mobile user connects and is not on the Scroll network, your code’s switch request might fail (likely with an error code or message). You already catch and rethrow non-4902 errors in the switch logic, which would display MetaMask’s error. As a best practice, consider detecting if the provider is a WalletConnect/mobile session (the SDK might expose something, or `ethereum.isMetaMask` and environment detection) and alert the user that they should manually switch networks if the automatic switch fails. This ensures the user knows how to proceed if on mobile. (Desktop MetaMask extension supports your network switching code fully.)

- **CDN Source:** The MetaMask docs show a sample CDN link with a GUID subdomain (perhaps for their demo). In a production setting, you can use a reliable CDN like **jsDelivr** or **unpkg** to fetch the SDK from NPM. For example:

  ```html
  <script src="https://cdn.jsdelivr.net/npm/@metamask/sdk@latest/dist/metamask-sdk.js"></script>
  ```

  This fetches the latest MetaMask SDK UMD bundle. Using an official CDN ensures your widget always loads the SDK script successfully. (Make sure to test and pin a version as needed for stability.)

- **Future Updates:** Keep an eye on the MetaMask SDK release notes. The SDK is actively developed, and new versions might bring improved methods (for example, a unified connect/disconnect or events for connection status). Upgrading the SDK in the future could simplify some logic (for instance, if they introduce a built-in disconnect method or better handling for multiple chains). For now, your manual implementation is correct, but staying updated will ensure your integration remains smooth.

In conclusion, **yes – the **``** code meets the MetaMask SDK guidance** for a CDN-based integration. It implements the recommended patterns for connecting to MetaMask, requesting permissions, handling network changes, and revoking permissions on disconnect. The code is following best practices and should operate seamlessly. With the minor suggestions above addressed, your MetaMask integration will be robust, user-friendly, and maintainable going forward.


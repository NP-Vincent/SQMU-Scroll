// wallet.js — SQMU unified wallet (MetaMask + Web3Auth via CDN)
// Expects globals from UMD bundles:
//   - MetaMaskSDK.MetaMaskSDK
//   - window.Web3Auth (modal)
//   - window.Web3AuthMetamaskAdapter (optional; preferred if present)
//   - ethers

/**************
 * Chain setup
 **************/
const SCROLL_CHAIN_ID = '0x82750';
const SCROLL_PARAMS = {
  chainId: SCROLL_CHAIN_ID,
  chainName: 'Scroll',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.scroll.io'],
  blockExplorerUrls: ['https://scrollscan.com'],
};

// Web3Auth client-side config (DO NOT embed your Client Secret / JWKS in frontend)
const WEB3AUTH_CLIENT_ID =
  'BAMYkJxLW4gIvsaIN2kOXDxyyz1gLyjnbqbF0hVKuc0RaCwyx2uhG9bBbbN_zVYfrfU5NH9K-QMG53GslEmCw4E';
const WEB3AUTH_NETWORK = 'sapphire_mainnet';

/************************
 * MetaMask SDK instance
 ************************/
const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Wallet', url: window.location.href },
  infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
});

/********************************************
 * Optional: register Web3Auth Adapter (UMD)
 ********************************************/
let web3auth;      // Web3Auth modal instance (fallback or for direct use)
let w3aProvider;   // EIP-1193 provider from Web3Auth
let w3aConnected = false;

async function setupWeb3AuthModal() {
  if (web3auth) return web3auth;
  const { Web3Auth } = window.Web3Auth || {};
  if (!Web3Auth) throw new Error('Web3Auth UMD not loaded.');
  web3auth = new Web3Auth({
    clientId: WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: WEB3AUTH_NETWORK,
    chainConfig: {
      chainNamespace: 'eip155',
      chainId: SCROLL_CHAIN_ID,
      rpcTarget: 'https://rpc.scroll.io',
      displayName: 'Scroll',
      ticker: 'ETH',
      tickerName: 'Ether',
      blockExplorer: 'https://scrollscan.com',
    },
    uiConfig: {
      appName: 'SQMU Wallet',
      mode: 'light',
      // Order is cosmetic; actual providers are toggled in your Web3Auth Dashboard
      loginMethodsOrder: ['farcaster', 'google', 'twitter', 'discord', 'email_passwordless'],
    },
  });
  await web3auth.initModal();
  return web3auth;
}

/**
 * If the MetaMask↔Web3Auth adapter UMD is present, attach it so MMSDK can orchestrate both.
 * If it's not present, we still support Web3Auth directly via the modal (fallback path below).
 */
async function attachWeb3AuthAdapterIfAvailable() {
  const W3Amm = window.Web3AuthMetamaskAdapter;
  if (!W3Amm?.Web3AuthAdapter) return false; // adapter UMD not present

  // Minimal adapter init: Web3Auth Modal is owned by the adapter internally
  const adapter = new W3Amm.Web3AuthAdapter({
    clientId: WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: WEB3AUTH_NETWORK,
    chainConfig: {
      chainNamespace: 'eip155',
      chainId: SCROLL_CHAIN_ID,
      rpcTarget: 'https://rpc.scroll.io',
    },
    uiConfig: {
      appName: 'SQMU Wallet',
      mode: 'light',
    },
  });

  // Some SDK builds expose a plugin/adapter registration API; if not, we keep a reference for use.
  // We’ll store on MMSDK for future detection (harmless if no internal registration exists).
  MMSDK.__web3authAdapter = adapter;
  return true;
}

/*******************************
 * Helpers: switch to Scroll
 *******************************/
async function ensureScrollNetwork(ethereumLikeProvider) {
  let chainId = await ethereumLikeProvider.request({ method: 'eth_chainId' });
  if (chainId !== SCROLL_CHAIN_ID) {
    try {
      await ethereumLikeProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SCROLL_CHAIN_ID }],
      });
    } catch (switchErr) {
      if (switchErr?.code === 4902) {
        await ethereumLikeProvider.request({
          method: 'wallet_addEthereumChain',
          params: [SCROLL_PARAMS],
        });
        await ethereumLikeProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SCROLL_CHAIN_ID }],
        });
      } else {
        // WalletConnect mobile often can’t programmatically switch
        const isWalletConnect =
          MMSDK.isWalletConnect ||
          ethereumLikeProvider.isWalletConnect ||
          ethereumLikeProvider.wc;
        const unsupportedMethod =
          switchErr?.code === 4200 || switchErr?.code === -32601;
        if (isWalletConnect && unsupportedMethod) {
          throw Object.assign(
            new Error('Please switch to the Scroll network manually in MetaMask Mobile.'),
            { handled: true }
          );
        }
        throw switchErr;
      }
    }
  }
}

/******************************************
 * Public API: connect / disconnect
 ******************************************/
export async function connectWallet(statusId, preferred = 'metamask') {
  const statusDiv = document.getElementById(statusId);
  await attachWeb3AuthAdapterIfAvailable(); // no-op if UMD not present

  // Decide route:
  // - 'metamask' => MetaMask SDK flow
  // - 'web3auth' => Prefer adapter, else fallback to direct Web3Auth modal
  const route = (preferred || 'metamask').toLowerCase();

  if (route === 'web3auth') {
    // 1) Try the adapter path if available
    if (MMSDK.__web3authAdapter) {
      statusDiv.innerText = 'Opening Web3Auth (MetaMask adapter)...';
      // Some builds expose a method like `connect` with a providerId; we use the adapter directly:
      const adapterProvider = await MMSDK.__web3authAdapter.connect();
      if (!adapterProvider) throw new Error('Web3Auth adapter returned no provider.');
      await ensureScrollNetwork(adapterProvider);
      const provider = new ethers.providers.Web3Provider(adapterProvider);
      const signer = provider.getSigner();
      statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll (Web3Auth via MetaMask SDK)</span>';
      return { provider, signer, source: 'web3auth-adapter' };
    }

    // 2) Fallback: direct Web3Auth modal
    statusDiv.innerText = 'Opening Web3Auth...';
    await setupWeb3AuthModal();
    w3aProvider = await web3auth.connect(); // user picks Farcaster/Google/etc. in modal
    if (!w3aProvider) throw new Error('No provider returned from Web3Auth.');
    try {
      await ensureScrollNetwork(w3aProvider);
    } catch (e) {
      if (!e?.handled) throw e;
    }
    const provider = new ethers.providers.Web3Provider(w3aProvider);
    const signer = provider.getSigner();
    w3aConnected = true;
    statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll (Web3Auth)</span>';
    return { provider, signer, source: 'web3auth' };
  }

  // Default: MetaMask SDK
  const ethereum = MMSDK.getProvider();
  const pendingMsg = 'Connecting to MetaMask...';
  statusDiv.innerText = pendingMsg;

  try {
    const accounts = await MMSDK.connect();
    if (!accounts || !accounts.length) throw new Error('No account returned from MetaMask.');
    await ensureScrollNetwork(ethereum);
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll (MetaMask)</span>';
    return { provider, signer, source: 'metamask' };
  } catch (err) {
    if (!err.handled) {
      if (err.code === -32002) {
        statusDiv.innerHTML =
          '<span style="color:red;">Request already pending. Check MetaMask.</span>';
      } else {
        statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
      }
    }
    throw err;
  }
}

export async function disconnectWallet(statusId, source) {
  const statusDiv = document.getElementById(statusId);

  try {
    if (source === 'web3auth' || source === 'web3auth-adapter') {
      if (MMSDK.__web3authAdapter && source === 'web3auth-adapter') {
        // Most adapter flows expose logout; if not, just clear local state
        try {
          await MMSDK.__web3authAdapter.logout?.();
        } catch (_) {}
        statusDiv.innerHTML = '<span style="color:orange;">Disconnected Web3Auth (adapter)</span>';
        return;
      }

      // Fallback modal logout
      if (web3auth && w3aConnected) {
        await web3auth.logout();
        w3aConnected = false;
        w3aProvider = null;
        statusDiv.innerHTML = '<span style="color:orange;">Disconnected Web3Auth</span>';
        return;
      }

      statusDiv.innerHTML = '<span style="color:gray;">Web3Auth not connected</span>';
      return;
    }

    // MetaMask branch
    const ethereum = MMSDK.getProvider();
    if (ethereum?.request) {
      await ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    }
    MMSDK.terminate();
    statusDiv.innerHTML = '<span style="color:orange;">Disconnected MetaMask</span>';
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

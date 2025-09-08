// wallet.js - shared wallet helpers for SQMU widgets
// Relies on ethers.js, MetaMask SDK, and Web3Auth Modal loaded via CDN.
// Globals expected:
//   - MetaMaskSDK.MetaMaskSDK
//   - window.Web3Auth (from @web3auth/modal UMD)
//   - ethers

/*****************
 * Chain config  *
 *****************/
const SCROLL_CHAIN_ID = '0x82750';

const SCROLL_PARAMS = {
  chainId: SCROLL_CHAIN_ID,
  chainName: 'Scroll',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.scroll.io'],
  blockExplorerUrls: ['https://scrollscan.com'],
};

/*************************
 * MetaMask (existing)   *
 *************************/
const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Wallet', url: window.location.href },
  infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
});

/**
 * Connect with MetaMask (unchanged behavior, cleaned up slightly)
 */
export async function connectWithMetaMask(statusId) {
  const ethereum = MMSDK.getProvider();
  const statusDiv = document.getElementById(statusId);
  statusDiv.innerText = 'Connecting to MetaMask...';

  try {
    const accounts = await MMSDK.connect();
    if (!accounts || !accounts.length) throw new Error('No account returned');

    let chainId = await ethereum.request({ method: 'eth_chainId' });

    if (chainId !== SCROLL_CHAIN_ID) {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SCROLL_CHAIN_ID }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          // Add then switch
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SCROLL_PARAMS],
          });
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SCROLL_CHAIN_ID }],
          });
        } else {
          const isWalletConnect =
            MMSDK.isWalletConnect || ethereum.isWalletConnect || ethereum.wc;
          const unsupportedMethod =
            switchErr.code === 4200 || switchErr.code === -32601;
          if (isWalletConnect && unsupportedMethod) {
            statusDiv.innerHTML =
              '<span style="color:red;">Please switch to the Scroll network manually in MetaMask Mobile.</span>';
            switchErr.handled = true;
            throw switchErr;
          }
          throw switchErr;
        }
      }
      chainId = await ethereum.request({ method: 'eth_chainId' });
    }

    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();

    statusDiv.innerHTML =
      '<span style="color:green;">Connected to Scroll (MetaMask)</span>';
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

export async function disconnectMetaMask(statusId) {
  const statusDiv = document.getElementById(statusId);
  try {
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

/**********************
 * Web3Auth (new)     *
 **********************/
let web3auth;        // instance of Web3AuthModalPack
let w3aProvider;     // EIP-1193 provider returned by Web3Auth
let w3aConnected = false;

// IMPORTANT: Do NOT embed your Client Secret in frontend code.
// Only the Client ID is used client-side. Secrets/JWKS are for backend validation flows.
const WEB3AUTH_CLIENT_ID = 'BAMYkJxLW4gIvsaIN2kOXDxyyz1gLyjnbqbF0hVKuc0RaCwyx2uhG9bBbbN_zVYfrfU5NH9K-QMG53GslEmCw4E';
const WEB3AUTH_NETWORK = 'sapphire_mainnet'; // from your config

async function ensureWeb3AuthInitialized() {
  if (web3auth) return;

  // window.Web3Auth is exposed by the UMD build we included via CDN
  const { Web3Auth } = window.Web3Auth;

  web3auth = new Web3Auth({
    clientId: WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: WEB3AUTH_NETWORK,
    chainConfig: {
      chainNamespace: 'eip155',
      chainId: SCROLL_CHAIN_ID,             // Scroll
      rpcTarget: 'https://rpc.scroll.io',
      displayName: 'Scroll',
      ticker: 'ETH',
      tickerName: 'Ether',
      blockExplorer: 'https://scrollscan.com',
    },
    uiConfig: {
      appName: 'SQMU Wallet',
      mode: 'light',
      loginMethodsOrder: ['google', 'twitter', 'github', 'facebook', 'email_passwordless', 'apple', 'discord'],
    },
  });

  // Initialize modal; this sets up adapters (OpenLogin, WalletConnect, etc.)
  await web3auth.initModal();
}

/**
 * Connect with Web3Auth (social/email + non-custodial key)
 * Returns an ethers.js Web3Provider + Signer pointed at Scroll.
 */
export async function connectWithWeb3Auth(statusId) {
  const statusDiv = document.getElementById(statusId);
  statusDiv.innerText = 'Opening Web3Auth...';
  try {
    await ensureWeb3AuthInitialized();

    // Show modal and connect
    w3aProvider = await web3auth.connect();
    if (!w3aProvider) throw new Error('No provider returned from Web3Auth');

    // At this point, the provider is already configured for the chain we passed in chainConfig (Scroll).
    // You can still sanity-check the chain.
    const chainId = await w3aProvider.request({ method: 'eth_chainId' });
    if (chainId !== SCROLL_CHAIN_ID) {
      // If the user picked a different chain via a wallet adapter, try switching back.
      try {
        await w3aProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SCROLL_CHAIN_ID }],
        });
      } catch (e) {
        // If switching is not supported by the adapter, we’ll proceed; transactions may fail if on wrong chain.
        console.warn('Could not switch chain on Web3Auth adapter:', e);
      }
    }

    const provider = new ethers.providers.Web3Provider(w3aProvider);
    const signer = provider.getSigner();
    w3aConnected = true;

    statusDiv.innerHTML =
      '<span style="color:green;">Connected to Scroll (Web3Auth)</span>';
    return { provider, signer, source: 'web3auth' };
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
    throw err;
  }
}

export async function disconnectWeb3Auth(statusId) {
  const statusDiv = document.getElementById(statusId);
  try {
    if (web3auth && w3aConnected) {
      await web3auth.logout();
      w3aConnected = false;
      w3aProvider = null;
      statusDiv.innerHTML =
        '<span style="color:orange;">Disconnected Web3Auth</span>';
    } else {
      statusDiv.innerHTML =
        '<span style="color:gray;">Web3Auth not connected</span>';
    }
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

/*******************************************
 * Optional: a tiny convenience dispatcher *
 *******************************************/
export async function connectWallet(statusId, preferred = 'metamask') {
  // Usage: connectWallet('statusDivId', 'web3auth') to force Web3Auth
  if (preferred === 'web3auth') {
    return connectWithWeb3Auth(statusId);
  }
  try {
    return await connectWithMetaMask(statusId);
  } catch (e) {
    // If MetaMask not available or user declines, fall back to Web3Auth
    if (String(e?.message || '').toLowerCase().includes('not installed') ||
        e?.code === 4001 || e?.code === -32002) {
      // Don’t auto-fallback on pending/denied, but you can choose to:
      // return connectWithWeb3Auth(statusId);
    }
    throw e;
  }
}

export async function disconnectWallet(statusId, source) {
  if (source === 'web3auth') return disconnectWeb3Auth(statusId);
  return disconnectMetaMask(statusId);
}

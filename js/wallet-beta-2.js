// wallet-beta.js — SQMU unified wallet (MetaMask SDK UMD + Web3Auth ESM)
// Preload in HTML: ethers UMD + MetaMask SDK UMD
// This module ESM-imports Web3Auth v10 directly (no window globals needed).

// ---------------------
// Chain configuration
// ---------------------
const SCROLL_CHAIN_ID = '0x82750';
const SCROLL_PARAMS = {
  chainId: SCROLL_CHAIN_ID,
  chainName: 'Scroll',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.scroll.io'],
  blockExplorerUrls: ['https://scrollscan.com'],
};

// Web3Auth client-side config (do NOT ship secrets)
const WEB3AUTH_CLIENT_ID =
  'BAMYkJxLW4gIvsaIN2kOXDxyyz1gLyjnbqbF0hVKuc0RaCwyx2uhG9bBbbN_zVYfrfU5NH9K-QMG53GslEmCw4E';
const WEB3AUTH_NETWORK = 'sapphire_mainnet';

// ---------------------
// Lazy resolvers
// ---------------------
function requireEthers() {
  if (!window.ethers) throw new Error('ethers UMD not loaded.');
  return window.ethers;
}

function getMMCtor() {
  // Mirror exposes MetaMaskSDK on window; support common shapes
  const ns = window.MetaMaskSDK;
  return ns?.MetaMaskSDK || ns?.default || ns || null;
}

// ---------------------
// Singletons (lazy)
// ---------------------
let _mmSDK = null;
function getMMSDK() {
  const MMCtor = getMMCtor();
  if (!MMCtor) throw new Error('MetaMask SDK UMD not loaded.');
  if (_mmSDK) return _mmSDK;
  _mmSDK = new MMCtor({
    dappMetadata: { name: 'SQMU Wallet', url: window.location.href },
    infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
  });
  return _mmSDK;
}

let _w3a = null;
let _w3aProvider = null;
let _w3aConnected = false;

async function ensureWeb3Auth() {
  if (_w3a) return _w3a;

  // 1) Try esm.sh (standalone)
  // 2) Try esm.run mirror (standalone)
  // 3) Try jsDelivr ESM file (path may change across versions)
  const candidates = [
    'https://esm.sh/@web3auth/modal@10.3.0?standalone',
    'https://esm.run/@web3auth/modal@10.3.0?standalone',
    // If Web3Auth publishes an explicit ESM bundle:
    'https://cdn.jsdelivr.net/npm/@web3auth/modal@10.3.0/dist/web3auth.esm.js',
  ];

  let Web3Auth = null;
  for (const url of candidates) {
    try {
      const mod = await import(url);
      if (mod?.Web3Auth) { Web3Auth = mod.Web3Auth; break; }
    } catch (e) {
      console.warn('Web3Auth ESM fetch failed:', url, e);
    }
  }

  // 4) Last-resort: use UMD global if you’ve added it in <head>
  // <script src="https://cdn.jsdelivr.net/npm/@web3auth/modal@10.3.0/dist/web3auth.umd.min.js" defer></script>
  if (!Web3Auth && window.Web3auth?.Web3Auth) {
    Web3Auth = window.Web3auth.Web3Auth;
  }
  if (!Web3Auth) {
    throw new Error('Unable to load Web3Auth: all CDN attempts failed.');
  }

  _w3a = new Web3Auth({
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
      loginMethodsOrder: ['farcaster','google','twitter','discord','email_passwordless'],
    },
  });

  await _w3a.init();      // v10 init() then connect()
  return _w3a;
}

// ---------------------
// Helpers
// ---------------------
async function ensureScrollNetwork(eip1193) {
  const chainId = await eip1193.request({ method: 'eth_chainId' });
  if (chainId === SCROLL_CHAIN_ID) return;

  try {
    await eip1193.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SCROLL_CHAIN_ID }],
    });
  } catch (err) {
    if (err?.code === 4902) {
      await eip1193.request({
        method: 'wallet_addEthereumChain',
        params: [SCROLL_PARAMS],
      });
      await eip1193.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SCROLL_CHAIN_ID }],
      });
    } else {
      const isWC = eip1193.isWalletConnect || eip1193.wc;
      const unsupported = err?.code === 4200 || err?.code === -32601;
      if (isWC && unsupported) {
        const e = new Error('Please switch to the Scroll network manually in MetaMask Mobile.');
        e.handled = true;
        throw e;
      }
      throw err;
    }
  }
}

// ---------------------
// Public API
// ---------------------
export async function connectWallet(statusId, preferred = 'metamask') {
  const statusDiv = document.getElementById(statusId);
  const ethers = requireEthers();

  const route = (preferred || 'metamask').toLowerCase();

  if (route === 'web3auth') {
    statusDiv.innerText = 'Opening Web3Auth…';
    const w3a = await ensureWeb3Auth();

    // Show the modal and connect
    _w3aProvider = await w3a.connect(); // v10: connect() shows the default modal
    if (!_w3aProvider) throw new Error('No provider returned from Web3Auth.');

    try {
      await ensureScrollNetwork(_w3aProvider);
    } catch (e) {
      if (!e?.handled) throw e;
    }
    const provider = new ethers.providers.Web3Provider(_w3aProvider);
    const signer = provider.getSigner();
    _w3aConnected = true;
    statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll (Web3Auth)</span>';
    return { provider, signer, source: 'web3auth' };
  }

  // Default: MetaMask SDK
  statusDiv.innerText = 'Connecting to MetaMask…';
  const mm = getMMSDK();
  const ethereum = mm.getProvider();

  try {
    const accounts = await mm.connect();
    if (!accounts || !accounts.length) throw new Error('No account returned from MetaMask.');
    await ensureScrollNetwork(ethereum);
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll (MetaMask)</span>';
    return { provider, signer, source: 'metamask' };
  } catch (err) {
    if (!err.handled) {
      statusDiv.innerHTML =
        err.code === -32002
          ? '<span style="color:red;">Request already pending. Check MetaMask.</span>'
          : `<span style="color:red;">${err.message}</span>`;
    }
    throw err;
  }
}

export async function disconnectWallet(statusId, source) {
  const statusDiv = document.getElementById(statusId);

  try {
    if (source === 'web3auth') {
      if (_w3a && _w3aConnected) {
        await _w3a.logout();
        _w3aConnected = false;
        _w3aProvider = null;
        statusDiv.innerHTML = '<span style="color:orange;">Disconnected Web3Auth</span>';
        return;
      }
      statusDiv.innerHTML = '<span style="color:gray;">Web3Auth not connected</span>';
      return;
    }

    // MetaMask branch
    const mm = getMMSDK();
    const ethereum = mm.getProvider();
    if (ethereum?.request) {
      await ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    }
    mm.terminate?.();
    statusDiv.innerHTML = '<span style="color:orange;">Disconnected MetaMask</span>';
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

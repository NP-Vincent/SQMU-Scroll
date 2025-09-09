// wallet-beta.js — SQMU unified wallet via CDN UMDs (MetaMask SDK + Web3Auth)
// Load these UMDs first in HTML: ethers, MetaMask SDK, Web3Auth Modal (+ optional adapter)

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
// Lazy UMD resolvers
// ---------------------
function requireEthers() {
  const ethers = window.ethers;
  if (!ethers) throw new Error('ethers UMD not loaded.');
  return { ethers };
}

function getWeb3AuthClass() {
  // Works across v8–v10 UMD shapes
  if (window.Web3Auth?.Web3Auth) return window.Web3Auth.Web3Auth;
  if (typeof window.Web3Auth === 'function') return window.Web3Auth;
  if (window.Web3Auth?.default?.Web3Auth) return window.Web3Auth.default.Web3Auth;
  return null;
}

function getMMCtor() {
  // MetaMask SDK UMD can expose as namespace or default
  const ns = window.MetaMaskSDK;
  return ns?.MetaMaskSDK || ns?.default || null;
}

function getAdapterClass() {
  // Optional: only used if present
  const ns =
    window.Web3AuthMetamaskAdapter ||
    window.metamaskAdapter ||
    window.Web3AuthMMAdapter ||
    null;
  return ns?.Web3AuthAdapter || ns?.MetamaskAdapter || null;
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

let _w3a = null;        // Web3Auth modal instance
let _w3aProvider = null;
let _w3aConnected = false;

async function ensureWeb3AuthModal() {
  if (_w3a) return _w3a;
  const Web3AuthCtor = getWeb3AuthClass();
  if (!Web3AuthCtor) throw new Error('Web3Auth UMD not loaded.');
  _w3a = new Web3AuthCtor({
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
      loginMethodsOrder: ['farcaster', 'google', 'twitter', 'discord', 'email_passwordless'],
    },
  });
  await _w3a.initModal();
  return _w3a;
}

let _mmW3AAdapter = null;
function attachAdapterIfAvailable() {
  if (_mmW3AAdapter) return true;
  const AdapterClass = getAdapterClass();
  if (!AdapterClass) return false;
  _mmW3AAdapter = new AdapterClass({
    clientId: WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: WEB3AUTH_NETWORK,
    chainConfig: {
      chainNamespace: 'eip155',
      chainId: SCROLL_CHAIN_ID,
      rpcTarget: 'https://rpc.scroll.io',
    },
    uiConfig: { appName: 'SQMU Wallet', mode: 'light' },
  });
  return true;
}

// ---------------------
// Helpers
// ---------------------
async function ensureScrollNetwork(eip1193) {
  const current = await eip1193.request({ method: 'eth_chainId' });
  if (current === SCROLL_CHAIN_ID) return;

  try {
    await eip1193.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SCROLL_CHAIN_ID }],
    });
  } catch (err) {
    if (err?.code === 4902) {
      await eip1193.request({ method: 'wallet_addEthereumChain', params: [SCROLL_PARAMS] });
      await eip1193.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SCROLL_CHAIN_ID }] });
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
  const { ethers } = requireEthers();

  const useAdapter = attachAdapterIfAvailable(); // harmless if not present
  const route = (preferred || 'metamask').toLowerCase();

  if (route === 'web3auth') {
    // Try adapter path first if its UMD is present
    if (useAdapter && _mmW3AAdapter?.connect) {
      statusDiv.innerText = 'Opening Web3Auth (adapter)…';
      const eip1193 = await _mmW3AAdapter.connect();
      if (!eip1193) throw new Error('Web3Auth adapter returned no provider.');
      await ensureScrollNetwork(eip1193);
      const provider = new ethers.providers.Web3Provider(eip1193);
      const signer = provider.getSigner();
      statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll (Web3Auth via Adapter)</span>';
      return { provider, signer, source: 'web3auth-adapter' };
    }

    // Fallback: direct Web3Auth modal
    statusDiv.innerText = 'Opening Web3Auth…';
    await ensureWeb3AuthModal();
    _w3aProvider = await _w3a.connect();
    if (!_w3aProvider) throw new Error('No provider returned from Web3Auth.');
    try { await ensureScrollNetwork(_w3aProvider); } catch (e) { if (!e?.handled) throw e; }
    const provider = new ethers.providers.Web3Provider(_w3aProvider);
    const signer = provider.getSigner();
    _w3aConnected = true;
    statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll (Web3Auth)</span>';
    return { provider, signer, source: 'web3auth' };
  }

  // Default: MetaMask SDK flow
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
    if (source === 'web3auth' || source === 'web3auth-adapter') {
      if (_mmW3AAdapter && source === 'web3auth-adapter') {
        try { await _mmW3AAdapter.logout?.(); } catch (_) {}
        statusDiv.innerHTML = '<span style="color:orange;">Disconnected Web3Auth (adapter)</span>';
        return;
      }
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

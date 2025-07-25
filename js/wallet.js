// wallet.js - shared wallet helpers for SQMU widgets
// This module relies on ethers.js and MetaMask SDK loaded via CDN.

const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Wallet', url: window.location.href },
  infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
});

const SCROLL_CHAIN_ID = '0x82750';

const SCROLL_PARAMS = {
  chainId: SCROLL_CHAIN_ID,
  chainName: 'Scroll',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.scroll.io'],
  blockExplorerUrls: ['https://scrollscan.com'],
};

export async function connectWallet(statusId) {
  const ethereum = MMSDK.getProvider();
  const statusDiv = document.getElementById(statusId);
  statusDiv.innerText = 'Connecting to MetaMask...';

  try {
    const permissions = await ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }],
    });
    const accountsPermission = permissions.find(
      (p) => p.parentCapability === 'eth_accounts'
    );
    if (!accountsPermission) {
      throw new Error('eth_accounts permission not granted');
    }
    await ethereum.request({ method: 'eth_accounts', params: [] });
    let chainId = await ethereum.request({ method: 'eth_chainId', params: [] });
    if (chainId !== SCROLL_CHAIN_ID) {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SCROLL_CHAIN_ID }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SCROLL_PARAMS],
          });
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SCROLL_CHAIN_ID }],
          });
        } else {
          throw switchErr;
        }
      }
      chainId = await ethereum.request({ method: 'eth_chainId', params: [] });
    }

    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();

    statusDiv.innerHTML =
      '<span style="color:green;">Connected to Scroll</span>';
    return { provider, signer };
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
    throw err;
  }
}

export async function disconnectWallet(statusId) {
  const ethereum = MMSDK.getProvider();
  const statusDiv = document.getElementById(statusId);
  try {
    await ethereum.request({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    });
    // Terminate the MetaMask SDK connection so the dapp fully disconnects
    MMSDK.terminate();
    statusDiv.innerHTML = '<span style="color:orange;">Disconnected</span>';
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

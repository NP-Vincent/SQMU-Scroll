// wallet.js - shared wallet helpers for SQMU widgets
// This module relies on ethers.js and MetaMask SDK loaded via CDN.

const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Wallet', url: window.location.href },
  infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
});

const SCROLL_CHAIN_ID = '0x82750';

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
    await ethereum.request({ method: 'eth_requestAccounts', params: [] });
    let chainId = await ethereum.request({ method: 'eth_chainId', params: [] });
    if (chainId !== SCROLL_CHAIN_ID) {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SCROLL_CHAIN_ID }],
      });
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
    statusDiv.innerHTML = '<span style="color:orange;">Disconnected</span>';
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

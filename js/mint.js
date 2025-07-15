// mint.js - embeddable widget logic
// This script expects ethers.js and MetaMask SDK to be loaded via CDN.

const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Mint Widget', url: window.location.href },
  infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
});
let provider;
let signer;
let contract;

// Deployed proxy address. Update this value when redeploying the contract.
const contractAddress = '0xd0b895e975f24045e43d788d42BD938b78666EC8';

// Connect the user's wallet via MetaMask SDK
const SCROLL_CHAIN_ID = '0x82750';

async function connect() {
  const ethereum = MMSDK.getProvider();
  const statusDiv = document.getElementById('mint-status');
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

    provider = new ethers.providers.Web3Provider(ethereum);
    signer = provider.getSigner();

    const res = await fetch('../abi/SQMU.json');
    const abiJson = await res.json();
  contract = new ethers.Contract(contractAddress, abiJson.abi, signer);

  statusDiv.innerHTML =
    '<span style="color:green;">Connected to Scroll. Contract ready!</span>';

  // Enable minting once the contract is ready
  document.getElementById('mint').addEventListener('click', mintToken);
  document.getElementById('disconnect').addEventListener('click', disconnect);
} catch (err) {
  statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
}
}

// Mint tokens using owner account
async function mintToken() {
  const statusDiv = document.getElementById('mint-status');
  const tokenId = document.getElementById('token-id').value;
  const amount = document.getElementById('token-amount').value;
  const uriData = document.getElementById('token-uri').value || '0x';

  if (!contract) {
    statusDiv.innerHTML = '<span style="color:red;">Connect wallet first.</span>';
    return;
  }

  try {
    const account = await signer.getAddress();
    const tx = await contract.mint(account, tokenId, amount, uriData);
    statusDiv.innerText = 'Minting...';
    await tx.wait();
    statusDiv.innerHTML = `<span style="color:green;">Minted token ${tokenId} x ${amount}</span>`;
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

async function disconnect() {
  const ethereum = MMSDK.getProvider();
  const statusDiv = document.getElementById('mint-status');
  try {
    await ethereum.request({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    });
    provider = undefined;
    signer = undefined;
    contract = undefined;
    statusDiv.innerHTML = '<span style="color:orange;">Disconnected</span>';
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

// Bind connect button
document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);

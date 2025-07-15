// transfer.js - transfer tokens between holders
// Requires ethers.js and MetaMask SDK via CDN

const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Transfer Widget', url: window.location.href },
  infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
});
let provider;
let signer;
let contract;

const contractAddress = '0xd0b895e975f24045e43d788d42BD938b78666EC8';
const SCROLL_CHAIN_ID = '0x82750';

async function connect() {
  const ethereum = MMSDK.getProvider();
  const statusDiv = document.getElementById('transfer-status');
  statusDiv.innerText = 'Connecting to MetaMask...';

  try {
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

    statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll. Contract ready!</span>';
    document.getElementById('transfer').addEventListener('click', transferToken);
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

async function transferToken() {
  const statusDiv = document.getElementById('transfer-status');
  const tokenId = document.getElementById('token-id').value;
  const amount = document.getElementById('token-amount').value;
  const to = document.getElementById('recipient').value;
  const data = document.getElementById('transfer-data').value || '0x';

  if (!contract) {
    statusDiv.innerHTML = '<span style="color:red;">Connect wallet first.</span>';
    return;
  }

  try {
    const from = await signer.getAddress();
    const tx = await contract.safeTransferFrom(from, to, tokenId, amount, data);
    statusDiv.innerText = 'Transferring...';
    await tx.wait();
    statusDiv.innerHTML = '<span style="color:green;">Transfer complete</span>';
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

document.getElementById('connect').addEventListener('click', connect);

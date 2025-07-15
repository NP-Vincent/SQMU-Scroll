// balance.js - check token balances
// Requires ethers.js and MetaMask SDK via CDN

const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Balance Widget', url: window.location.href },
  infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
});
let provider;
let signer;
let contract;

const contractAddress = '0xd0b895e975f24045e43d788d42BD938b78666EC8';
const SCROLL_CHAIN_ID = '0x82750';

async function connect() {
  const ethereum = MMSDK.getProvider();
  const statusDiv = document.getElementById('balance-status');
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
    document.getElementById('check-balance').addEventListener('click', checkBalance);
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

async function checkBalance() {
  const statusDiv = document.getElementById('balance-status');
  const tokenId = document.getElementById('token-id').value;
  let addr = document.getElementById('wallet-address').value;

  if (!contract) {
    statusDiv.innerHTML = '<span style="color:red;">Connect wallet first.</span>';
    return;
  }

  try {
    if (!addr) {
      addr = await signer.getAddress();
    }
    const bal = await contract.balanceOf(addr, tokenId);
    statusDiv.innerHTML = `<span style="color:green;">Balance: ${bal.toString()}</span>`;
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

document.getElementById('connect').addEventListener('click', connect);

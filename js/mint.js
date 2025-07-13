// mint.js - embeddable widget logic
// This script expects ethers.js and MetaMask SDK to be loaded via CDN.

const MMSDK = new MetaMaskSDK.MetaMaskSDK();
const ethereum = MMSDK.getProvider();
let provider;
let signer;
let contract;

// Connect the user's wallet via MetaMask SDK
async function connect() {
  await ethereum.request({ method: 'eth_requestAccounts' });
  provider = new ethers.BrowserProvider(ethereum);
  signer = await provider.getSigner();

  // Fetch the contract ABI and create a contract instance
  const res = await fetch('../abi/SQMU.json');
  const abiJson = await res.json();
  const contractAddress = '0xYourContractAddress'; // TODO: replace with deployed address
  contract = new ethers.Contract(contractAddress, abiJson.abi, signer);
}

// Bind connect button
document.getElementById('connect').addEventListener('click', connect);

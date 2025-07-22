// mint.js - embeddable widget logic
// This script expects ethers.js and MetaMask SDK to be loaded via CDN.
// Wallet connection helpers come from wallet.js.

import { connectWallet, disconnectWallet } from './wallet.js';

let provider;
let signer;
let contract;

// Deployed proxy address. Update this value when redeploying the contract.
const contractAddress = '0xd0b895e975f24045e43d788d42BD938b78666EC8';

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('mint-status'));

    const abiUrl = new URL('../abi/SQMU.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
  contract = new ethers.Contract(contractAddress, abiJson.abi, signer);

  document.getElementById('mint').addEventListener('click', mintToken);
  document.getElementById('disconnect').addEventListener('click', disconnect);
  document.getElementById('disconnect').style.display = '';
  const statusDiv = document.getElementById('mint-status');
  statusDiv.innerHTML =
    '<span style="color:green;">Connected to Scroll. Contract ready!</span>';
  } catch (err) {
    // Errors may occur if the ABI path is unreachable
    const statusDiv = document.getElementById('mint-status');
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
  await disconnectWallet('mint-status');
  provider = undefined;
  signer = undefined;
  contract = undefined;
  document.getElementById('disconnect').style.display = 'none';
}

// Bind connect button
document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);

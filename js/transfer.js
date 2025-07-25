// transfer.js - transfer tokens between holders
// Requires ethers.js and MetaMask SDK via CDN
// Wallet connection helpers come from wallet.js.

import { connectWallet, disconnectWallet } from './wallet.js';
import { SQMU_ADDRESS } from './config.js';

let provider;
let signer;
let contract;

const contractAddress = SQMU_ADDRESS;

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('transfer-status'));

    const abiUrl = new URL('../abi/SQMU.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    contract = new ethers.Contract(contractAddress, abiJson.abi, signer);

    document.getElementById('transfer').addEventListener('click', transferToken);
    document.getElementById('disconnect').addEventListener('click', disconnect);
    document.getElementById('disconnect').style.display = '';
    const statusDiv = document.getElementById('transfer-status');
    statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll. Contract ready!</span>';
  } catch (err) {
    // Errors may occur if the ABI path is unreachable
    const statusDiv = document.getElementById('transfer-status');
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

async function disconnect() {
  await disconnectWallet('transfer-status');
  provider = undefined;
  signer = undefined;
  contract = undefined;
  document.getElementById('disconnect').style.display = 'none';
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);

// transfer.js - transfer tokens between holders
// Requires ethers.js and MetaMask SDK via CDN
// Wallet connection helpers come from wallet.js.

import { connectWallet, disconnectWallet } from './wallet.js';

let provider;
let signer;
let contract;

const contractAddress = '0xd0b895e975f24045e43d788d42BD938b78666EC8';

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('transfer-status'));

    const res = await fetch('../abi/SQMU.json');
    const abiJson = await res.json();
    contract = new ethers.Contract(contractAddress, abiJson.abi, signer);

    document.getElementById('transfer').addEventListener('click', transferToken);
    document.getElementById('disconnect').addEventListener('click', disconnect);
    const statusDiv = document.getElementById('transfer-status');
    statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll. Contract ready!</span>';
  } catch (err) {
    // connectWallet already displays the error message
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
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);

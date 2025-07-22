// balance.js - check token balances
// Requires ethers.js and MetaMask SDK via CDN
// Wallet connection helpers come from wallet.js.

import { connectWallet, disconnectWallet } from './wallet.js';

let provider;
let signer;
let contract;

const contractAddress = '0xd0b895e975f24045e43d788d42BD938b78666EC8';

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('balance-status'));

    const abiUrl = new URL('../abi/SQMU.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    contract = new ethers.Contract(contractAddress, abiJson.abi, signer);

    document.getElementById('check-balance').addEventListener('click', checkBalance);
    document.getElementById('disconnect').addEventListener('click', disconnect);
    document.getElementById('disconnect').style.display = '';
    const statusDiv = document.getElementById('balance-status');
    statusDiv.innerHTML = '<span style="color:green;">Connected to Scroll. Contract ready!</span>';
  } catch (err) {
    // Errors may occur if the ABI path is unreachable
    const statusDiv = document.getElementById('balance-status');
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

async function disconnect() {
  await disconnectWallet('balance-status');
  provider = undefined;
  signer = undefined;
  contract = undefined;
  document.getElementById('disconnect').style.display = 'none';
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);

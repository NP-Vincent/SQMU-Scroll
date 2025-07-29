import { connectWallet, disconnectWallet } from './wallet.js';
import { CROWDFUND_ADDRESS } from './config.js';

let provider;
let signer;
let contract;

const contractAddress = CROWDFUND_ADDRESS;

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('admin-status'));
    const abiUrl = new URL('../abi/SQMUCrowdfund.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    contract = new ethers.Contract(contractAddress, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('admin-btn').disabled = false;
    setStatus('Connected. Contract ready!', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

function setStatus(msg, color) {
  const el = document.getElementById('admin-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function mint() {
  if (!contract) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const to = document.getElementById('admin-to').value;
  const amount = document.getElementById('admin-amount').value;
  try {
    const tx = await contract.adminMint(to, amount);
    setStatus('Submitting mint...');
    await tx.wait();
    setStatus(`Minted ${amount} tokens to ${to}`, 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('admin-status');
  provider = undefined;
  signer = undefined;
  contract = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('admin-btn').disabled = true;
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('admin-btn').addEventListener('click', mint);

import { connectWallet, disconnectWallet } from './wallet.js';
import { RENT_ADDRESS } from './config.js';

let provider;
let signer;
let rent;

const rentAddress = RENT_ADDRESS;

function setStatus(msg, color) {
  const el = document.getElementById('rent-admin-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

function toggleButtons(disabled) {
  [
    'token-btn',
    'treasury-btn',
    'fee-btn',
    'refund-btn',
    'withdraw-btn'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

toggleButtons(true);

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('rent-admin-status'));
    const abiUrl = new URL('../abi/SQMURent.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    rent = new ethers.Contract(rentAddress, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    toggleButtons(false);
    setStatus('Connected. Contract ready!', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('rent-admin-status');
  provider = undefined;
  signer = undefined;
  rent = undefined;
  toggleButtons(true);
  document.getElementById('disconnect').style.display = 'none';
}

async function updateToken() {
  if (!rent) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const token = document.getElementById('token-address').value.trim();
  const status = document.getElementById('token-status').checked;
  try {
    const tx = await rent.setAcceptedToken(token, status);
    setStatus('Updating token...');
    await tx.wait();
    setStatus('Token updated', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function setTreasury() {
  if (!rent) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const wallet = document.getElementById('treasury-wallet').value.trim();
  try {
    const tx = await rent.setTreasury(wallet);
    setStatus('Setting treasury...');
    await tx.wait();
    setStatus('Treasury set', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function setFee() {
  if (!rent) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const bps = document.getElementById('fee-bps').value;
  try {
    const tx = await rent.setManagementFee(bps);
    setStatus('Updating fee...');
    await tx.wait();
    setStatus('Fee updated', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function refundDeposit() {
  if (!rent) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const id = document.getElementById('refund-id').value;
  const tenant = document.getElementById('refund-tenant').value.trim();
  try {
    const tx = await rent.refundDeposit(id, tenant);
    setStatus('Refunding deposit...');
    await tx.wait();
    setStatus('Deposit refunded', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function withdrawFees() {
  if (!rent) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const token = document.getElementById('withdraw-token').value.trim();
  try {
    const tx = await rent.withdrawManagementFees(token);
    setStatus('Withdrawing fees...');
    await tx.wait();
    setStatus('Fees withdrawn', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('token-btn').addEventListener('click', updateToken);
document.getElementById('treasury-btn').addEventListener('click', setTreasury);
document.getElementById('fee-btn').addEventListener('click', setFee);
document.getElementById('refund-btn').addEventListener('click', refundDeposit);
document.getElementById('withdraw-btn').addEventListener('click', withdrawFees);

import { connectWallet, disconnectWallet } from './wallet.js';
import { RENT_ADDRESS } from './config.js';

let provider;
let signer;
let rent;
let propertyId = '';

const rentAddress = RENT_ADDRESS;

const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

function setStatus(msg, color) {
  const el = document.getElementById('rent-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

function toggleButtons(disabled) {
  ['deposit-btn', 'rent-btn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  });
}

toggleButtons(true);

function findPropertyId() {
  const params = new URLSearchParams(location.search);
  return params.get('id') || '';
}

async function ensureAllowance(tokenAddr, amount) {
  const erc20 = new ethers.Contract(tokenAddr, erc20Abi, signer);
  const owner = await signer.getAddress();
  const current = await erc20.allowance(owner, rentAddress);
  if (current.gte(amount)) return;
  const tx = await erc20.approve(rentAddress, amount);
  setStatus('Approving payment token...');
  await tx.wait();
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('rent-status'));
    const abiUrl = new URL('../abi/SQMURent.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    rent = new ethers.Contract(rentAddress, abiJson.abi, signer);
    propertyId = findPropertyId();
    document.getElementById('property-id').textContent = propertyId || 'N/A';
    document.getElementById('disconnect').style.display = '';
    toggleButtons(!propertyId);
    setStatus('Connected. Contract ready!', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function payDeposit() {
  if (!rent) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  if (!propertyId) {
    setStatus('Property ID missing', 'red');
    return;
  }
  const token = document.getElementById('deposit-token').value;
  const rawAmount = document.getElementById('deposit-amount').value;
  try {
    const erc20 = new ethers.Contract(token, erc20Abi, signer);
    const dec = await erc20.decimals();
    const amount = ethers.utils.parseUnits(rawAmount, dec);
    await ensureAllowance(token, amount);
    const tx = await rent.payDeposit(propertyId, token, amount);
    setStatus('Submitting deposit...');
    await tx.wait();
    setStatus('Deposit paid', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function payRent() {
  if (!rent) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  if (!propertyId) {
    setStatus('Property ID missing', 'red');
    return;
  }
  const token = document.getElementById('rent-token').value;
  const rawAmount = document.getElementById('rent-amount').value;
  try {
    const erc20 = new ethers.Contract(token, erc20Abi, signer);
    const dec = await erc20.decimals();
    const amount = ethers.utils.parseUnits(rawAmount, dec);
    await ensureAllowance(token, amount);
    const tx = await rent.collectRent(propertyId, token, amount);
    setStatus('Submitting rent...');
    await tx.wait();
    setStatus('Rent paid', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('rent-status');
  provider = undefined;
  signer = undefined;
  rent = undefined;
  toggleButtons(true);
  document.getElementById('disconnect').style.display = 'none';
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('deposit-btn').addEventListener('click', payDeposit);
document.getElementById('rent-btn').addEventListener('click', payRent);

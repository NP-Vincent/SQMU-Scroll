import { connectWallet, disconnectWallet } from './wallet.js';
import { RENT_ADDRESS } from './config.js';

let provider;
let signer;
let rent;
let propertyCode = '';
let propertyId = '';
let rentPrice = 0;
let rentPeriod = '';

const rentAddress = RENT_ADDRESS;

const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

function findPropertyCode() {
  let code = '';
  document.querySelectorAll('.es-entity-field').forEach((li) => {
    const label = li.querySelector('.es-property-field__label');
    const value = li.querySelector('.es-property-field__value');
    if (label && value && label.textContent.includes('SQMU Property Code')) {
      code = value.textContent.trim();
    }
  });
  if (!code) {
    const params = new URLSearchParams(location.search);
    code = params.get('code') || '';
  }
  return code;
}

function findRentPrice() {
  const priceEl = document.querySelector('.es-price-container .es-price');
  if (priceEl) {
    const num = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(num)) return num;
  }
  const params = new URLSearchParams(location.search);
  const p = parseFloat(params.get('price'));
  return Number.isNaN(p) ? 0 : p;
}

function findRentPeriod() {
  let period = '';
  document.querySelectorAll('.es-entity-field').forEach((li) => {
    const label = li.querySelector('.es-property-field__label');
    const value = li.querySelector('.es-property-field__value');
    if (label && value && label.textContent.includes('Rent Period')) {
      period = Array.from(value.querySelectorAll('a'))
        .map((a) => a.textContent.trim())
        .join(', ');
    }
  });
  if (!period) {
    const params = new URLSearchParams(location.search);
    period = params.get('period') || '';
  }
  return period;
}

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

function initFields() {
  propertyCode = findPropertyCode();
  rentPrice = findRentPrice();
  rentPeriod = findRentPeriod();
  document.getElementById('property-code').textContent = propertyCode || 'N/A';
  document.getElementById('rent-price').textContent = rentPrice ? `$${rentPrice}` : 'N/A';
  document.getElementById('rent-period').textContent = rentPeriod || 'N/A';

  const numericId = parseInt(propertyCode.replace(/\D/g, ''), 10);
  propertyId = Number.isNaN(numericId) ? '' : String(numericId);
  toggleButtons(!propertyId);

  const depositInput = document.getElementById('deposit-amount');
  const rentInput = document.getElementById('rent-amount');
  if (rentPrice && depositInput && rentInput) {
    depositInput.value = (rentPrice * 1.1).toFixed(2);
    rentInput.value = (rentPrice * 1.05).toFixed(2);
  }
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
document.addEventListener('DOMContentLoaded', initFields);

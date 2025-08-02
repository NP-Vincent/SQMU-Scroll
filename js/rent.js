import { connectWallet, disconnectWallet } from './wallet.js';
import { RENT_ADDRESS } from './config.js';

let provider;
let signer;
let rent;
let propertyCode = '';
let propertyId = '';
let monthlyPrice = 0;
let rentPrice = 0;
let depositPrice = '0';
let pricePeriod = '';
let availablePeriods = [];

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

function findPricePeriod() {
  const badge = document.querySelector('.es-price-container .es-badge');
  if (badge) return badge.textContent.trim();
  const params = new URLSearchParams(location.search);
  return params.get('pricePeriod') || 'Monthly';
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
  return period
    .split(/,\s*/)
    .map((p) => p.trim())
    .filter((p) => p);
}

function setStatus(msg, color) {
  const el = document.getElementById('rent-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

function toggleButtons(disabled) {
  ['rent-btn', 'start-btn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  });
}

async function updateRentalButtons() {
  if (!rent || !propertyId) return;
  try {
    const info = await rent.rentals(propertyId);
    const startSection = document.getElementById('start-section');
    const rentSection = document.getElementById('rent-section');
    if (info.occupied) {
      if (startSection) startSection.style.display = 'none';
      if (rentSection) rentSection.style.display = '';
    } else {
      if (startSection) startSection.style.display = '';
      if (rentSection) rentSection.style.display = 'none';
    }
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function isRentWindowOpen(id) {
  const info = await rent.rentals(id);
  const window = await rent.RENT_WINDOW();
  const now = Math.floor(Date.now() / 1000);
  return now >= info.nextRentDue - window && now <= info.nextRentDue + window;
}

toggleButtons(true);

function updateAmounts() {
  const select = document.getElementById('period-select');
  const chosen = select ? select.value : pricePeriod;
  let price = monthlyPrice;
  if (chosen === 'Weekly') {
    price = (monthlyPrice / 4) * 1.1;
  }
  rentPrice = price;
  document.getElementById('rent-price').textContent = rentPrice ? `$${rentPrice.toFixed(2)}` : 'N/A';
  document.getElementById('rent-period').textContent = chosen;

  const rentInput = document.getElementById('rent-amount');
  depositPrice = (rentPrice * 1.1).toFixed(2);
  if (rentPrice && rentInput) {
    rentInput.value = (rentPrice * 1.05).toFixed(2);
  }
}

function initFields() {
  propertyCode = findPropertyCode();
  monthlyPrice = findRentPrice();
  pricePeriod = findPricePeriod();
  availablePeriods = findRentPeriod();
  document.getElementById('property-code').textContent = propertyCode || 'N/A';

  const select = document.getElementById('period-select');
  if (select) {
    select.innerHTML = '';
    if (availablePeriods.length === 0) availablePeriods = [pricePeriod];
    availablePeriods.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    });
    select.value = pricePeriod;
  }

  updateAmounts();

  const numericId = parseInt(propertyCode.replace(/\D/g, ''), 10);
  propertyId = Number.isNaN(numericId) ? '' : String(numericId);
  toggleButtons(!propertyId);
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
    updateRentalButtons();
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
    updateRentalButtons();
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function startRental() {
  if (!rent) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  if (!propertyId) {
    setStatus('Property ID missing', 'red');
    return;
  }
  const token = document.getElementById('rent-token').value;
  const rentRaw = document.getElementById('rent-amount').value;
  try {
    const erc20 = new ethers.Contract(token, erc20Abi, signer);
    const dec = await erc20.decimals();
    const depAmount = ethers.utils.parseUnits(depositPrice, dec);
    await ensureAllowance(token, depAmount);
    let tx = await rent.payDeposit(propertyId, token, depAmount);
    setStatus('Submitting deposit...');
    await tx.wait();
    updateRentalButtons();
    if (!(await isRentWindowOpen(propertyId))) {
      setStatus(
        "Deposit paid. Rent isn\u2019t due yet—come back closer to the due date.",
        'green'
      );
      const start = document.getElementById('start-btn');
      if (start) start.disabled = true;
      return;
    }
    setStatus('Deposit paid. Paying first rent...');

    const rentAmount = ethers.utils.parseUnits(rentRaw, dec);
    await ensureAllowance(token, rentAmount);
    tx = await rent.collectRent(propertyId, token, rentAmount);
    setStatus('Submitting rent...');
    await tx.wait();
    setStatus('Deposit and first rent paid', 'green');
    updateRentalButtons();
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
document.getElementById('rent-btn').addEventListener('click', payRent);
const startBtn = document.getElementById('start-btn');
if (startBtn) startBtn.addEventListener('click', startRental);
document.addEventListener('DOMContentLoaded', initFields);
document.getElementById('period-select').addEventListener('change', updateAmounts);

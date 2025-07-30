// escrow.js - buyer-facing widget for Escrow deposits
// Requires ethers.js and MetaMask SDK via CDN

import { connectWallet, disconnectWallet } from './wallet.js';
import { ESCROW_ADDRESS } from './config.js';

let provider;
let signer;
let escrow;
let token;

const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

function setStatus(msg, color) {
  const el = document.getElementById('escrow-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function loadInfo() {
  const tokenAddr = await escrow.paymentToken();
  token = new ethers.Contract(tokenAddr, erc20Abi, signer);
  let symbol = '-';
  let decimals = 18;
  try {
    symbol = await token.symbol();
  } catch (e) {
    console.warn('symbol() not available:', e.message);
  }
  try {
    decimals = await token.decimals();
  } catch (e) {
    console.warn('decimals() not available:', e.message);
  }
  document.getElementById('token-symbol').innerText = symbol;

  const stages = ['eoi', 'initial', 'balance'];
  for (let i = 0; i < stages.length; i++) {
    const val = await escrow.depositForStage(i);
    document.getElementById(`deposit-${stages[i]}`).innerText =
      ethers.utils.formatUnits(val, decimals);
  }

  const states = [
    'Created',
    'Funded',
    'AwaitingDocuments',
    'PendingRelease',
    'Released',
    'Cancelled',
    'Expired'
  ];
  const state = await escrow.state();
  document.getElementById('escrow-state').innerText = states[state] || 'Unknown';
}

async function ensureAllowance(amount) {
  const owner = await signer.getAddress();
  const current = await token.allowance(owner, ESCROW_ADDRESS);
  if (current.gte(amount)) return;
  const tx = await token.approve(ESCROW_ADDRESS, amount);
  setStatus('Approving payment token...');
  await tx.wait();
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('escrow-status'));
    const abiUrl = new URL('../abi/Escrow.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    escrow = new ethers.Contract(ESCROW_ADDRESS, abiJson.abi, signer);
    await loadInfo();
    document.getElementById('disconnect').style.display = '';
    document.getElementById('deposit-btn').disabled = false;
    setStatus('Connected. Escrow ready!', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function deposit() {
  if (!escrow) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const amountInput = document.getElementById('deposit-amount').value;
  const stage = document.getElementById('deposit-stage').value;
  try {
    const decimals = await token.decimals();
    const amount = ethers.utils.parseUnits(amountInput, decimals);
    await ensureAllowance(amount);
    const tx = await escrow.deposit(amount, stage);
    setStatus('Submitting deposit...');
    await tx.wait();
    setStatus('Deposit complete', 'green');
    await loadInfo();
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('escrow-status');
  provider = undefined;
  signer = undefined;
  escrow = undefined;
  token = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('deposit-btn').disabled = true;
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('deposit-btn').addEventListener('click', deposit);

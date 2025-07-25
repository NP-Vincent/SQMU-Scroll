import { connectWallet, disconnectWallet } from './wallet.js';
import { SQMU_ADDRESS, DISTRIBUTOR_ADDRESS } from './config.js';

let provider;
let signer;
let sqmu;
let distributor;

// SQMU tokens use two decimal places
const DECIMALS = 2;
const MAX_TOKEN_ID = 20; // adjust if your token ids exceed this range

function formatUSD(bn) {
  // getPrice returns a plain integer amount in USD for 0.01 SQMU
  const num = Number(ethers.utils.formatUnits(bn, 0));
  return 'USD ' + num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function setStatus(msg, color) {
  const el = document.getElementById('portfolio-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('portfolio-status'));
    const sqmuUrl = new URL('../abi/SQMU.json', import.meta.url);
    const sqmuRes = await fetch(sqmuUrl);
    const sqmuAbi = (await sqmuRes.json()).abi;
    sqmu = new ethers.Contract(SQMU_ADDRESS, sqmuAbi, provider);
    const distUrl = new URL('../abi/AtomicSQMUDistributor.json', import.meta.url);
    const distRes = await fetch(distUrl);
    const distAbi = (await distRes.json()).abi;
    distributor = new ethers.Contract(DISTRIBUTOR_ADDRESS, distAbi, provider);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('connect').disabled = true;
    setStatus('Connected. Loading balances...', 'green');
    await displayBalances();
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function displayBalances() {
  const owner = await signer.getAddress();
  const ids = [];
  const owners = [];
  for (let i = 0; i <= MAX_TOKEN_ID; i++) {
    ids.push(i);
    owners.push(owner);
  }
  const balances = await sqmu.balanceOfBatch(owners, ids);
  const tbody = document.querySelector('#portfolio-table tbody');
  tbody.innerHTML = '';
  for (let i = 0; i < ids.length; i++) {
    const amt = Number(ethers.utils.formatUnits(balances[i], DECIMALS));
    if (amt === 0) continue;
    const priceBn = await distributor.getPrice('SQMU' + ids[i], 1);
    const priceStr = formatUSD(priceBn);
    const row = document.createElement('tr');
    row.innerHTML = `<td>${ids[i]}</td><td>${amt.toFixed(DECIMALS)}</td><td>${priceStr}</td>`;
    tbody.appendChild(row);
  }
  setStatus('Balances loaded', 'green');
}

async function disconnect() {
  await disconnectWallet('portfolio-status');
  provider = undefined;
  signer = undefined;
  sqmu = undefined;
  distributor = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('connect').disabled = false;
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);

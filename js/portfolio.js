import { connectWallet, disconnectWallet } from './wallet.js';
import { SQMU_ADDRESS, DISTRIBUTOR_ADDRESS, TRADE_ADDRESS } from './config.js';
import {
  toStablecoinUnits,
  fromStablecoinUnits,
  toSQMUUnits,
  fromSQMUUnits,
} from './units.js';

let provider;
let signer;
let sqmu;
let distributor;
let trade;

// SQMU tokens use two decimal places
const DECIMALS = 2;
const MAX_TOKEN_ID = 100; // adjust if your token ids exceed this range
const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

function formatUSD(bn) {
  // getPrice returns an integer amount in USD with no decimals
  const num = Number(fromStablecoinUnits(bn, 0));
  return 'USD ' + num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function setStatus(msg, color) {
  const el = document.getElementById('portfolio-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

function setTradeStatus(msg, color) {
  const el = document.getElementById('trade-status');
  if (el) {
    el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
  }
}

function enforceColumnRatio() {
  const buttonsCol = document.querySelector('.tab-buttons');
  const contentCol = document.querySelector('.tab-content');
  if (!buttonsCol || !contentCol) return;
  buttonsCol.style.flex = '1';
  contentCol.style.flex = '4';
}

window.addEventListener('load', enforceColumnRatio);

async function ensureAllowance(tokenAddr, requiredAmount) {
  const erc20 = new ethers.Contract(tokenAddr, erc20Abi, signer);
  const owner = await signer.getAddress();
  const current = await erc20.allowance(owner, TRADE_ADDRESS);
  if (current.gte(requiredAmount)) return;
  const tx = await erc20.approve(TRADE_ADDRESS, requiredAmount);
  setTradeStatus('Approving payment token...');
  await tx.wait();
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('portfolio-status'));
    const sqmuUrl = new URL('../abi/SQMU.json', import.meta.url);
    const sqmuRes = await fetch(sqmuUrl);
    const sqmuAbi = (await sqmuRes.json()).abi;
    // Use the signer so we can call setApprovalForAll when creating listings
    sqmu = new ethers.Contract(SQMU_ADDRESS, sqmuAbi, signer);
    const distUrl = new URL('../abi/AtomicSQMUDistributor.json', import.meta.url);
    const distRes = await fetch(distUrl);
    const distAbi = (await distRes.json()).abi;
    distributor = new ethers.Contract(DISTRIBUTOR_ADDRESS, distAbi, provider);
    const tradeUrl = new URL('../abi/SQMUTrade.json', import.meta.url);
    const tradeRes = await fetch(tradeUrl);
    const tradeAbi = (await tradeRes.json()).abi;
    trade = new ethers.Contract(TRADE_ADDRESS, tradeAbi, signer);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('connect').disabled = true;
    document.getElementById('list-btn').disabled = false;
    document.getElementById('buy-btn').disabled = false;
    setStatus('Connected. Loading balances...', 'green');
    await displayBalances();
    await displayListings();
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function displayBalances() {
  const owner = await signer.getAddress();
  const ids = [];
  const owners = [];
  for (let i = 1; i <= MAX_TOKEN_ID; i++) {
    ids.push(i);
    owners.push(owner);
  }
  const balances = await sqmu.balanceOfBatch(owners, ids);
  const tbody = document.querySelector('#portfolio-table tbody');
  tbody.innerHTML = '';
  let totalSqmu = 0;
  let totalUsd = ethers.BigNumber.from(0);
  for (let i = 0; i < ids.length; i++) {
    const amt = Number(fromSQMUUnits(balances[i]));
    if (amt === 0) continue;
    let priceBn;
    try {
      priceBn = await distributor.getPrice('SQMU' + ids[i], balances[i]);
    } catch (err) {
      // Skip unregistered tokens such as governance ID 0
      continue;
    }
    totalSqmu += amt;
    totalUsd = totalUsd.add(priceBn);
    const priceStr = formatUSD(priceBn);
    const row = document.createElement('tr');
    row.innerHTML = `<td>SQMU${ids[i]}</td><td>${amt.toFixed(DECIMALS)}</td><td>${priceStr}</td>`;
    tbody.appendChild(row);
  }
  document.getElementById('total-sqmu').textContent = totalSqmu.toFixed(DECIMALS);
  document.getElementById('total-usd').textContent = formatUSD(totalUsd);
  setStatus('Balances loaded', 'green');
}

async function displayListings() {
  if (!trade) return;
  const tbody = document.querySelector('#listing-table tbody');
  tbody.innerHTML = '';
  try {
    const listings = await trade.getActiveListings();
    for (const l of listings) {
      if (Number(l.tokenId) === 0) continue; // governance token handled elsewhere
      const erc20 = new ethers.Contract(l.paymentToken, erc20Abi, provider);
      let decimals = 18;
      let symbol = l.paymentToken;
      try {
        decimals = await erc20.decimals();
        symbol = await erc20.symbol();
      } catch (e) {}
      const price = fromStablecoinUnits(l.pricePerToken, decimals);
      const amount = Number(fromSQMUUnits(l.amountListed));
      const row = document.createElement('tr');
      row.innerHTML = `<td>${l.listingId}</td><td>${l.propertyCode}</td><td>${l.tokenId}</td><td>${amount.toFixed(DECIMALS)}</td><td>${price}</td><td>${symbol}</td>`;
      tbody.appendChild(row);
    }
  } catch (err) {
    setTradeStatus(err.message, 'red');
  }
}

async function createListing() {
  if (!trade) {
    setTradeStatus('Connect wallet first.', 'red');
    return;
  }
  const code = document.getElementById('list-code').value.trim();
  const tokenId = document.getElementById('list-token-id').value;
  if (Number(tokenId) === 0) {
    setTradeStatus('Token ID 0 is reserved for governance tokens. Use governance_buy.html.', 'red');
    return;
  }
  const amountInput = document.getElementById('list-amount').value;
  const priceInput = document.getElementById('list-price').value;
  const paymentToken = document.getElementById('list-payment-token').value.trim();
  try {
    const approved = await sqmu.isApprovedForAll(await signer.getAddress(), TRADE_ADDRESS);
    if (!approved) {
      setTradeStatus('Approving SQMU transfer...');
      const tx0 = await sqmu.setApprovalForAll(TRADE_ADDRESS, true);
      await tx0.wait();
    }
    const erc20 = new ethers.Contract(paymentToken, erc20Abi, signer);
    const decimals = await erc20.decimals();
    const amount = toSQMUUnits(amountInput);
    const price = toStablecoinUnits(priceInput, decimals);
    const tx = await trade.listToken(code, SQMU_ADDRESS, tokenId, amount, price, paymentToken);
    setTradeStatus('Listing tokens...');
    await tx.wait();
    setTradeStatus('Listing created', 'green');
    await displayListings();
    await displayBalances();
  } catch (err) {
    setTradeStatus(err.message, 'red');
  }
}

async function buyListing() {
  if (!trade) {
    setTradeStatus('Connect wallet first.', 'red');
    return;
  }
  const listingId = document.getElementById('buy-listing-id').value;
  const amtInput = document.getElementById('buy-amount').value;
  try {
    const listing = await trade.getListing(listingId);
    const amount = toSQMUUnits(amtInput);
    const totalPrice = ethers.BigNumber.from(listing.pricePerToken).mul(amount);
    await ensureAllowance(listing.paymentToken, totalPrice);
    const tx = await trade.buy(listingId, amount);
    setTradeStatus('Buying tokens...');
    await tx.wait();
    setTradeStatus('Purchase complete', 'green');
    await displayListings();
    await displayBalances();
  } catch (err) {
    setTradeStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('portfolio-status');
  provider = undefined;
  signer = undefined;
  sqmu = undefined;
  distributor = undefined;
  trade = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('connect').disabled = false;
  document.getElementById('list-btn').disabled = true;
  document.getElementById('buy-btn').disabled = true;
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('list-btn').addEventListener('click', createListing);
document.getElementById('buy-btn').addEventListener('click', buyListing);

document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('is-active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    btn.classList.add('is-active');
  });
});

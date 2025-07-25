import { connectWallet, disconnectWallet } from './wallet.js';

let provider;
let signer;
let distributor;
let sqmuAbi;

const distributorAddress = '0x19d8D25DD4C85264B2AC502D66aEE113955b8A07';
const DECIMALS = 2;

// Update this list with all active property codes to display
const PROPERTY_CODES = ['EXAMPLE'];

function setStatus(msg, color) {
  const el = document.getElementById('portfolio-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('portfolio-status'));
    const distUrl = new URL('../abi/AtomicSQMUDistributor.json', import.meta.url);
    const sqmuUrl = new URL('../abi/SQMU.json', import.meta.url);
    const [distRes, sqmuRes] = await Promise.all([fetch(distUrl), fetch(sqmuUrl)]);
    const distAbi = (await distRes.json()).abi;
    sqmuAbi = (await sqmuRes.json()).abi;
    distributor = new ethers.Contract(distributorAddress, distAbi, provider);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('connect').disabled = true;
    setStatus('Connected. Loading portfolio...', 'green');
    await displayPortfolio();
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function fetchHolding(code, owner) {
  const info = await distributor.getPropertyInfo(code);
  if (info.tokenAddress === ethers.constants.AddressZero) return null;
  const token = new ethers.Contract(info.tokenAddress, sqmuAbi, provider);
  const bal = await token.balanceOf(owner, info.tokenId);
  const amount = Number(ethers.utils.formatUnits(bal, DECIMALS));
  if (amount === 0) return null;
  const price = Number(ethers.utils.formatUnits(info.priceUSD, 18));
  const usdValue = amount * price;
  return { name: info.name, code, amount, usdValue };
}

async function displayPortfolio() {
  const owner = await signer.getAddress();
  const tbody = document.querySelector('#portfolio-table tbody');
  tbody.innerHTML = '';
  let total = 0;
  for (const code of PROPERTY_CODES) {
    try {
      const h = await fetchHolding(code, owner);
      if (!h) continue;
      total += h.usdValue;
      const row = document.createElement('tr');
      row.innerHTML = `<td>${h.name}</td><td>${h.code}</td><td>${h.amount.toFixed(DECIMALS)}</td><td>$${h.usdValue.toFixed(2)}</td>`;
      tbody.appendChild(row);
    } catch (e) {
      console.error(e);
    }
  }
  document.getElementById('total-usd').textContent = `$${total.toFixed(2)}`;
  setStatus('Portfolio loaded', 'green');
}

async function disconnect() {
  await disconnectWallet('portfolio-status');
  provider = undefined;
  signer = undefined;
  distributor = undefined;
  sqmuAbi = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('connect').disabled = false;
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);

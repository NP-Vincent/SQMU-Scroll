import { connectWallet, disconnectWallet } from './wallet.js';

let provider;
let signer;
let distributor;

// Proxy address recorded in notes/deployment_log.md
let SALE_ADDR = '0x19d8D25DD4C85264B2AC502D66aEE113955b8A07';
const RPC = 'https://rpc.scroll.io';

const PROP = { chainId: 534352, decimals: 2 };
let propertyOk = false;

const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

function setStatus(msg, color) {
  const el = document.getElementById('buy-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function fetchPropertyInfo() {
  try {
    const rpcProvider = new ethers.providers.JsonRpcProvider(RPC);
    const dist = new ethers.Contract(
      SALE_ADDR,
      ['function properties(string) view returns(address token,address treasury,uint256 price)'],
      rpcProvider
    );
    const p = await dist.properties(PROP.code);
    if (p.token !== ethers.constants.AddressZero) {
      PROP.address = p.token;
      PROP.price = Number(p.price) / 1e6;
      propertyOk = true;
      return true;
    }
  } catch (e) {
    console.error(e);
  }
  propertyOk = false;
  PROP.price = undefined;
  setStatus('SQMU data unavailable', 'red');
  return false;
}

async function fetchAvailable() {
  try {
    const rpcProvider = new ethers.providers.JsonRpcProvider(RPC);
    const sale = new ethers.Contract(
      SALE_ADDR,
      ['function getAvailable(string) view returns(uint256)'],
      rpcProvider
    );
    const bal = await sale.getAvailable(PROP.code);
    const supply = Number(ethers.formatUnits(bal, PROP.decimals));
    document.getElementById('avail').textContent = supply.toLocaleString();
    return supply;
  } catch (e) {
    document.getElementById('avail').textContent = 'N/A';
    setStatus('Unable to fetch available supply', 'red');
  }
}

function updateUsd() {
  const amt = parseFloat(document.getElementById('sqmu-amount').value);
  if (!amt || amt <= 0 || PROP.price === undefined) {
    document.getElementById('usd-display').textContent = '';
    return;
  }
  document.getElementById('usd-display').textContent = (amt * PROP.price).toFixed(2);
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('buy-status'));
    const abiUrl = new URL('../abi/AtomicSQMUDistributor.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    distributor = new ethers.Contract(SALE_ADDR, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('buy-btn').disabled = false;
    setStatus('Connected. Contract ready!', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('buy-status');
  provider = undefined;
  signer = undefined;
  distributor = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('buy-btn').disabled = true;
}

async function getRequiredAmount(propertyCode, sqmuAmount, paymentToken) {
  const prop = await distributor.getPropertyInfo(propertyCode);
  if (prop.tokenAddress === ethers.constants.AddressZero) {
    throw new Error('Property not found');
  }
  const erc20 = new ethers.Contract(paymentToken, erc20Abi, provider);
  const decimals = await erc20.decimals();
  const priceUSD = ethers.BigNumber.from(prop.priceUSD);
  return priceUSD
    .mul(ethers.BigNumber.from(sqmuAmount))
    .mul(ethers.BigNumber.from(10).pow(decimals))
    .div(ethers.constants.WeiPerEther);
}

async function ensureAllowance(tokenAddr, requiredAmount) {
  const erc20 = new ethers.Contract(tokenAddr, erc20Abi, signer);
  const owner = await signer.getAddress();
  const current = await erc20.allowance(owner, SALE_ADDR);
  if (current.gte(requiredAmount)) return;
  try {
    const tx = await erc20.approve(SALE_ADDR, requiredAmount);
    setStatus('Approving payment token...');
    await tx.wait();
  } catch (err) {
    setStatus(err.message, 'red');
    throw err;
  }
}

async function buyTokens() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  if (!propertyOk) {
    setStatus('Property lookup failed. Please try again later.', 'red');
    return;
  }
  const propertyCode = document.getElementById('property-code').value.trim();
  const amount = document.getElementById('sqmu-amount').value;
  const paymentToken = document.getElementById('token-select').value;
  const agentCode = document.getElementById('agent-code').value.trim();

  try {
    const required = await getRequiredAmount(propertyCode, amount, paymentToken);
    await ensureAllowance(paymentToken, required);
    const tx = await distributor.buySQMU(propertyCode, amount, paymentToken, agentCode);
    setStatus('Submitting transaction...');
    await tx.wait();
    setStatus(`Purchased ${amount} SQMU for ${propertyCode}`, 'green');
    await fetchAvailable();
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

function init() {
  const buyBtn = document.getElementById('buy-btn');
  buyBtn.disabled = true;

  let estCode = '';
  document.querySelectorAll('.es-entity-field').forEach((li) => {
    const label = li.querySelector('.es-property-field__label');
    const value = li.querySelector('.es-property-field__value');
    if (!label || !value) return;
    if (label.textContent.includes('SQMU Property Code')) {
      estCode = value.textContent.trim();
    }
  });
  if (estCode) PROP.code = estCode;

  let search = location.search;
  if (!search && location.hash.includes('?')) {
    search = location.hash.substring(location.hash.indexOf('?'));
  }
  const params = new URLSearchParams(search);
  const code = params.get('code') || params.get('buy');
  if (code) PROP.code = code;
  if (params.get('addr')) PROP.address = params.get('addr');
  if (params.get('decimals')) PROP.decimals = Number(params.get('decimals'));
  if (params.get('price')) PROP.price = parseFloat(params.get('price'));
  if (params.get('saleAddr')) SALE_ADDR = params.get('saleAddr');

  const propInput = document.getElementById('property-code');
  propInput.value = PROP.code;
  propInput.readOnly = true;
  document.querySelector('h3').textContent = `Buy ${PROP.code}`;
  document.getElementById('token-info').innerHTML = `Token to receive: <b>${PROP.code}</b> on <b>Scroll</b>`;
  document.querySelector('#avail').nextSibling.textContent = ` ${PROP.code}`;

  fetchPropertyInfo().then(async (ok) => {
    if (!ok) {
      buyBtn.disabled = true;
      return;
    }
    const supply = await fetchAvailable();
    buyBtn.disabled = !(supply > 0);
    setInterval(fetchAvailable, 600000);
  });

  document.getElementById('sqmu-amount').oninput = updateUsd;

  document.getElementById('connect').addEventListener('click', connect);
  document.getElementById('disconnect').addEventListener('click', disconnect);
  buyBtn.addEventListener('click', buyTokens);
}

document.addEventListener('DOMContentLoaded', init);

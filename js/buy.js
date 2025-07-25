import { connectWallet, disconnectWallet } from './wallet.js';
import { DISTRIBUTOR_ADDRESS } from './config.js';

let provider;
let signer;
let distributor;

// Proxy address recorded in notes/deployment_log.md
const distributorAddress = DISTRIBUTOR_ADDRESS;

// Minimal ERC-20 interface for allowance/approve calls
const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

/**
 * Fetch property info and ensure the property is active for sale.
 * @param {string} propertyCode - Registered property identifier
 * @returns {Promise<object>} Property info object
 */
async function checkPropertyActive(propertyCode) {
  const info = await distributor.getPropertyInfo(propertyCode);
  if (info.tokenAddress === ethers.constants.AddressZero) {
    throw new Error('Property not found');
  }
  const active = await distributor.getPropertyStatus(propertyCode);
  if (!active) {
    throw new Error('Property not active for sale');
  }
  return info;
}

/**
 * Calculate the ERC-20 token amount required for a purchase.
 * @param {string} propertyCode - Registered property identifier
 * @param {string} sqmuAmount - Number of SQMU tokens being bought
 * @param {string} paymentToken - ERC-20 address used for payment
 * @returns {Promise<ethers.BigNumber>} Required token amount
 */
async function getRequiredAmount(propertyCode, sqmuAmount, paymentToken) {
  const prop = await checkPropertyActive(propertyCode);
  const erc20 = new ethers.Contract(paymentToken, erc20Abi, provider);
  const decimals = await erc20.decimals();
  const priceUSD = ethers.BigNumber.from(prop.priceUSD);
  return priceUSD
    .mul(ethers.BigNumber.from(sqmuAmount))
    .mul(ethers.BigNumber.from(10).pow(decimals))
    .div(ethers.constants.WeiPerEther);
}

/**
 * Ensure sufficient allowance for the distributor contract. If the current
 * allowance is lower than required, an approval transaction is sent and
 * awaited. Any errors are surfaced via #buy-status.
 */
async function ensureAllowance(tokenAddr, requiredAmount) {
  const erc20 = new ethers.Contract(tokenAddr, erc20Abi, signer);
  const owner = await signer.getAddress();
  const current = await erc20.allowance(owner, distributorAddress);
  if (current.gte(requiredAmount)) return;
  try {
    const tx = await erc20.approve(distributorAddress, requiredAmount);
    setStatus('Approving payment token...');
    await tx.wait();
  } catch (err) {
    setStatus(err.message, 'red');
    throw err;
  }
}

function setStatus(msg, color) {
  const el = document.getElementById('buy-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('buy-status'));
    const abiUrl = new URL('../abi/AtomicSQMUDistributor.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    distributor = new ethers.Contract(distributorAddress, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('buy-btn').disabled = false;
    setStatus('Connected. Contract ready!', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function buyTokens() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
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

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('buy-btn').addEventListener('click', buyTokens);

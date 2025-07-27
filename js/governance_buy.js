import { connectWallet, disconnectWallet } from './wallet.js';
import { GOVERNANCE_ADDRESS } from './config.js';

let provider;
let signer;
let governance;

const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

function setStatus(msg, color) {
  const el = document.getElementById('gov-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('gov-status'));
    const abiUrl = new URL('../abi/SQMUGovernance.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    governance = new ethers.Contract(GOVERNANCE_ADDRESS, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('buy-btn').disabled = false;
    setStatus('Connected', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function ensureAllowance(tokenAddr, amount) {
  const erc20 = new ethers.Contract(tokenAddr, erc20Abi, signer);
  const owner = await signer.getAddress();
  const current = await erc20.allowance(owner, GOVERNANCE_ADDRESS);
  if (current.gte(amount)) return;
  const tx = await erc20.approve(GOVERNANCE_ADDRESS, amount);
  setStatus('Approving payment token...');
  await tx.wait();
}

async function buy() {
  if (!governance) return setStatus('Connect first', 'red');
  const amount = document.getElementById('gov-amount').value;
  const token = document.getElementById('token-select').value;
  const erc20 = new ethers.Contract(token, erc20Abi, provider);
  const decimals = await erc20.decimals();
  const weiAmount = ethers.BigNumber.from(amount).mul(ethers.BigNumber.from(10).pow(decimals));
  await ensureAllowance(token, weiAmount);
  try {
    const tx = await governance.buyGovernance(amount, token);
    setStatus('Submitting transaction...');
    await tx.wait();
    setStatus('Purchase successful', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('gov-status');
  provider = undefined;
  signer = undefined;
  governance = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('buy-btn').disabled = true;
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('buy-btn').addEventListener('click', buy);

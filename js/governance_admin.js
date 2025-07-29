import { connectWallet, disconnectWallet } from './wallet.js';
import { CROWDFUND_ADDRESS } from './config.js';

let provider;
let signer;
let contract;

const contractAddress = CROWDFUND_ADDRESS;

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('admin-status'));
    const abiUrl = new URL('../abi/SQMUCrowdfund.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    contract = new ethers.Contract(contractAddress, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('price-btn').disabled = false;
    document.getElementById('withdraw-btn').disabled = false;
    setStatus('Connected. Contract ready!', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

function setStatus(msg, color) {
  const el = document.getElementById('admin-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function updatePrice() {
  if (!contract) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const price = document.getElementById('price').value;
  try {
    const scaled = ethers.utils.parseUnits(price, 18);
    const tx = await contract.setPriceUSD(scaled);
    setStatus('Updating price...');
    await tx.wait();
    setStatus('Price updated', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function withdraw() {
  if (!contract) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const token = document.getElementById('withdraw-token').value;
  const amountInput = document.getElementById('withdraw-amount').value;
  try {
    let amount = 0;
    if (amountInput && amountInput !== '0') {
      const erc20 = new ethers.Contract(token, ['function decimals() view returns (uint8)'], signer);
      const dec = await erc20.decimals();
      amount = ethers.BigNumber.from(10).pow(dec).mul(amountInput);
    }
    const tx = await contract.withdrawPayments(token, amount);
    setStatus('Withdrawing payments...');
    await tx.wait();
    setStatus('Withdrawal complete', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('admin-status');
  provider = undefined;
  signer = undefined;
  contract = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('price-btn').disabled = true;
  document.getElementById('withdraw-btn').disabled = true;
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('price-btn').addEventListener('click', updatePrice);
document.getElementById('withdraw-btn').addEventListener('click', withdraw);

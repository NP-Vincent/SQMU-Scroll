import { connectWallet, disconnectWallet } from './wallet.js';

let provider;
let signer;
let distributor;

// Proxy address recorded in notes/deployment_log.md
const distributorAddress = '0xBff9349802Af16A6B4b21d078Eda775C0E98E65C';

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

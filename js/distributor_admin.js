import { connectWallet, disconnectWallet } from './wallet.js';

let provider;
let signer;
let distributor;

const distributorAddress = '0x19d8D25DD4C85264B2AC502D66aEE113955b8A07';

function toggleButtons(disabled) {
  [
    'manual-btn',
    'agent-btn',
    'property-btn',
    'status-btn',
    'commission-btn',
    'info-btn',
    'avail-btn',
    'price-btn'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

toggleButtons(true);

function setStatus(msg, color) {
  const el = document.getElementById('dist-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('dist-status'));
    const abiUrl = new URL('../abi/AtomicSQMUDistributor.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    distributor = new ethers.Contract(distributorAddress, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    toggleButtons(false);
    setStatus('Connected. Contract ready!', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('dist-status');
  provider = undefined;
  signer = undefined;
  distributor = undefined;
  toggleButtons(true);
  document.getElementById('disconnect').style.display = 'none';
}

async function manualDistribute() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const code = document.getElementById('manual-property').value.trim();
  const buyer = document.getElementById('manual-buyer').value.trim();
  const amount = document.getElementById('manual-amount').value;
  const agent = document.getElementById('manual-agent').value.trim();
  try {
    const tx = await distributor.manualDistribute(code, buyer, amount, agent);
    setStatus('Submitting manual distribution...');
    await tx.wait();
    setStatus('Distribution complete', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function registerAgent() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const code = document.getElementById('agent-code').value.trim();
  const name = document.getElementById('agent-name').value.trim();
  const wallet = document.getElementById('agent-wallet').value.trim();
  try {
    const tx = await distributor.registerAgent(code, name, wallet);
    setStatus('Registering agent...');
    await tx.wait();
    setStatus('Agent registered', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function registerProperty() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const code = document.getElementById('prop-code').value.trim();
  const name = document.getElementById('prop-name').value.trim();
  const token = document.getElementById('prop-token').value.trim();
  const tokenId = document.getElementById('prop-token-id').value;
  const treasury = document.getElementById('prop-treasury').value.trim();
  const price = document.getElementById('prop-price').value.trim();
  const active = document.getElementById('prop-active').checked;
  try {
    const tx = await distributor.registerProperty(code, name, token, tokenId, treasury, price, active);
    setStatus('Registering property...');
    await tx.wait();
    setStatus('Property registered', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function setPropertyStatus() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const code = document.getElementById('status-code').value.trim();
  const active = document.getElementById('status-active').checked;
  try {
    const tx = await distributor.setPropertyStatus(code, active);
    setStatus('Updating property status...');
    await tx.wait();
    setStatus('Status updated', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function setCommission() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const bps = document.getElementById('commission-bps').value;
  try {
    const tx = await distributor.setGlobalCommission(bps);
    setStatus('Setting commission...');
    await tx.wait();
    setStatus('Commission updated', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function getPropertyInfo() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const code = document.getElementById('query-code').value.trim();
  try {
    const info = await distributor.getPropertyInfo(code);
    setStatus(JSON.stringify(info, null, 2));
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function getAvailable() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const code = document.getElementById('query-code').value.trim();
  try {
    const bal = await distributor.getAvailable(code);
    setStatus(`Available: ${bal.toString()}`, 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function getPrice() {
  if (!distributor) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  const code = document.getElementById('query-code').value.trim();
  const amount = document.getElementById('query-amount').value;
  try {
    const price = await distributor.getPrice(code, amount);
    setStatus(`Price: ${price.toString()}`, 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

// Event listeners

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('manual-btn').addEventListener('click', manualDistribute);
document.getElementById('agent-btn').addEventListener('click', registerAgent);
document.getElementById('property-btn').addEventListener('click', registerProperty);
document.getElementById('status-btn').addEventListener('click', setPropertyStatus);
document.getElementById('commission-btn').addEventListener('click', setCommission);
document.getElementById('info-btn').addEventListener('click', getPropertyInfo);
document.getElementById('avail-btn').addEventListener('click', getAvailable);
document.getElementById('price-btn').addEventListener('click', getPrice);

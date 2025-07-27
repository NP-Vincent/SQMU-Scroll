import { connectWallet, disconnectWallet } from './wallet.js';
import { GOVERNANCE_ADDRESS } from './config.js';

let provider;
let signer;
let governance;

function setStatus(msg, color) {
  const el = document.getElementById('vote-status');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('vote-status'));
    const abiUrl = new URL('../abi/SQMUGovernance.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    governance = new ethers.Contract(GOVERNANCE_ADDRESS, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('vote-btn').disabled = false;
    setStatus('Connected', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function vote() {
  if (!governance) return setStatus('Connect first', 'red');
  const id = document.getElementById('proposal-id').value;
  const choice = document.getElementById('vote-choice').value;
  try {
    const tx = await governance.castVote(id, choice);
    setStatus('Submitting vote...');
    await tx.wait();
    setStatus('Vote submitted', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('vote-status');
  provider = undefined;
  signer = undefined;
  governance = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('vote-btn').disabled = true;
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('vote-btn').addEventListener('click', vote);

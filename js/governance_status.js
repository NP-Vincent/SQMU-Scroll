import { connectWallet, disconnectWallet } from './wallet.js';
import { GOVERNANCE_ADDRESS } from './config.js';

let provider;
let signer;
let governance;

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('gov-info'));
    const abiUrl = new URL('../abi/SQMUGovernance.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    governance = new ethers.Contract(GOVERNANCE_ADDRESS, abiJson.abi, provider);
    document.getElementById('disconnect').style.display = '';
    await showInfo();
  } catch (err) {
    setInfo(err.message, 'red');
  }
}

function setInfo(msg, color) {
  const el = document.getElementById('gov-info');
  el.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function showInfo() {
  const addr = await signer.getAddress();
  const locked = await governance.locks(addr);
  setInfo(`Allocated: ${locked.totalAllocated} Claimed: ${locked.claimed}`);
}

async function disconnect() {
  await disconnectWallet('gov-info');
  provider = undefined;
  signer = undefined;
  governance = undefined;
  document.getElementById('disconnect').style.display = 'none';
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);

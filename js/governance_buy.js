import { connectWallet, disconnectWallet } from './wallet.js';
import { CROWDFUND_ADDRESS } from './config.js';

let provider;
let signer;
let contract;

const contractAddress = CROWDFUND_ADDRESS;

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('gov-status'));
    const abiUrl = new URL('../abi/SQMUCrowdfund.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    contract = new ethers.Contract(contractAddress, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    document.getElementById('buy-btn').disabled = false;
    setStatus('Connected. Contract ready!', 'success');
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

function setStatus(msg, tone) {
  const el = document.getElementById('gov-status');
  el.textContent = msg;
  el.className = 'has-small-font-size';
  if (tone === 'success') {
    el.classList.add('has-primary-color');
  } else if (tone === 'error') {
    el.classList.add('has-foreground-color');
  }
}

async function buy() {
  if (!contract) {
    setStatus('Connect wallet first.', 'error');
    return;
  }
  const amount = document.getElementById('gov-amount').value;
  const token = document.getElementById('gov-token').value;
  try {
    const erc20Abi = [
      'function decimals() view returns (uint8)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)'
    ];
    const erc20 = new ethers.Contract(token, erc20Abi, signer);
    const decimals = await erc20.decimals();
    const total = ethers.BigNumber.from(10).pow(decimals).mul(amount);
    const owner = await signer.getAddress();
    const allowance = await erc20.allowance(owner, contractAddress);
    if (allowance.lt(total)) {
      const txA = await erc20.approve(contractAddress, total);
      setStatus('Approving token...', 'info');
      await txA.wait();
    }
    const tx = await contract.buy(token, amount);
    setStatus('Submitting purchase...', 'info');
    await tx.wait();
    setStatus(`Purchased ${amount} governance tokens`, 'success');
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

async function disconnect() {
  await disconnectWallet('gov-status');
  provider = undefined;
  signer = undefined;
  contract = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('buy-btn').disabled = true;
  setStatus('Wallet disconnected');
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('buy-btn').addEventListener('click', buy);

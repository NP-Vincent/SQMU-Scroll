import { connectWallet, disconnectWallet } from './wallet.js';
import { CROWDFUND_ADDRESS, SQMU_ADDRESS } from './config.js';
import { sendReceipt } from './email.js';
import { fromStablecoinUnits } from './units.js';

const RPC = 'https://rpc.scroll.io';

let provider;
let signer;
let contract;

const contractAddress = CROWDFUND_ADDRESS;
const TOTAL_SUPPLY = 50000;

async function findTotalTokens() {
  const params = new URLSearchParams(location.search);
  const total = Number(params.get('total')) || TOTAL_SUPPLY;
  return total > 0 ? total : TOTAL_SUPPLY;
}

function renderTokenMatrix(sold, total) {
  const matrix = document.getElementById('gov-token-matrix');
  if (!matrix || total <= 0) return;
  matrix.innerHTML = '';
  const totalSquares = 64;
  const filled = Math.round((sold / total) * totalSquares);
  for (let i = 0; i < totalSquares; i++) {
    const square = document.createElement('div');
    square.className = 'sqmu-square';
    if (i < filled) square.classList.add('filled');
    matrix.appendChild(square);
  }
}

async function fetchAvailable() {
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const erc1155 = new ethers.Contract(
    SQMU_ADDRESS,
    ['function balanceOf(address, uint256) view returns (uint256)'],
    provider
  );
  const bal = await erc1155.balanceOf(CROWDFUND_ADDRESS, 0);
  return Number(bal);
}

async function showSupply() {
  const total = await findTotalTokens();
  if (total <= 0) return;
  const available = await fetchAvailable();
  const sold = total - available;
  document.getElementById('sold-bal').textContent = sold;
  document.getElementById('total-bal').textContent = total;
  renderTokenMatrix(sold, total);
}

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
  } else if (tone === 'info') {
    el.classList.add('has-secondary-color');
  }
}

async function buy() {
  if (!contract) {
    setStatus('Connect wallet first.', 'error');
    return;
  }
  const amount = document.getElementById('gov-amount').value;
  const tokenSelect = document.getElementById('gov-token');
  const token = tokenSelect.value;
  const email = document.getElementById('buyer-email').value.trim();
  try {
    const erc20Abi = [
      'function decimals() view returns (uint8)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)'
    ];
    const erc20 = new ethers.Contract(token, erc20Abi, signer);
    const decimals = await erc20.decimals();
    const priceUSD = await contract.priceUSD();
    const amountBN = ethers.BigNumber.from(amount);
    const total = priceUSD
      .mul(amountBN)
      .mul(ethers.BigNumber.from(10).pow(decimals))
      .div(ethers.constants.WeiPerEther);
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

    if (email) {
      const usd = fromStablecoinUnits(total, decimals);
      const tokenName = tokenSelect.options[tokenSelect.selectedIndex].text;
      sendReceipt('governance', {
        to_email: email,
        tx_link: `https://scrollscan.com/tx/${tx.hash}`,
        usd,
        token: tokenName,
        chain: 'Scroll',
        gov_amount: amount
      });
    }
    await showSupply();
  } catch (err) {
    if (err.code === 4001) {
      setStatus('Transaction canceled by user.', 'error');
    } else {
      setStatus(err.message, 'error');
    }
  }
}

async function disconnect() {
  await disconnectWallet('gov-status');
  provider = undefined;
  signer = undefined;
  contract = undefined;
  document.getElementById('disconnect').style.display = 'none';
  document.getElementById('buy-btn').disabled = true;
  setStatus('Wallet disconnected', 'info');
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('buy-btn').addEventListener('click', buy);
document.addEventListener('DOMContentLoaded', showSupply);

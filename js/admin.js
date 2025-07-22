import { connectWallet, disconnectWallet } from './wallet.js';

let provider;
let signer;
let contract;

const contractAddress = '0xd0b895e975f24045e43d788d42BD938b78666EC8';

async function connect() {
  try {
    ({ provider, signer } = await connectWallet('status'));
    const abiUrl = new URL('../abi/SQMU.json', import.meta.url);
    const res = await fetch(abiUrl);
    const abiJson = await res.json();
    contract = new ethers.Contract(contractAddress, abiJson.abi, signer);
    document.getElementById('disconnect').style.display = '';
    setStatus('Connected. Contract ready!', 'green');
  } catch (err) {
    // Errors may occur if the ABI path is unreachable
    setStatus(err.message, 'red');
  }
}

async function disconnect() {
  await disconnectWallet('status');
  provider = undefined;
  signer = undefined;
  contract = undefined;
  document.getElementById('disconnect').style.display = 'none';
}

function setStatus(msg, color) {
  const s = document.getElementById('status');
  s.innerHTML = color ? `<span style="color:${color};">${msg}</span>` : msg;
}

async function mintToken() {
  const tokenId = document.getElementById('mint-token-id').value;
  const amount = document.getElementById('mint-amount').value;
  const uri = document.getElementById('mint-uri').value || '0x';
  if (!contract) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  try {
    const to = await signer.getAddress();
    const tx = await contract.mint(to, tokenId, amount, uri);
    setStatus('Minting...');
    await tx.wait();
    setStatus(`Minted token ${tokenId} x${amount}`, 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function transferToken() {
  const tokenId = document.getElementById('transfer-token-id').value;
  const amount = document.getElementById('transfer-amount').value;
  const to = document.getElementById('transfer-recipient').value;
  const data = document.getElementById('transfer-data').value || '0x';
  if (!contract) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  try {
    const from = await signer.getAddress();
    const tx = await contract.safeTransferFrom(from, to, tokenId, amount, data);
    setStatus('Transferring...');
    await tx.wait();
    setStatus('Transfer complete', 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

async function checkBalance() {
  const tokenId = document.getElementById('balance-token-id').value;
  let addr = document.getElementById('balance-address').value;
  if (!contract) {
    setStatus('Connect wallet first.', 'red');
    return;
  }
  try {
    if (!addr) {
      addr = await signer.getAddress();
    }
    const bal = await contract.balanceOf(addr, tokenId);
    setStatus(`Balance: ${bal.toString()}`, 'green');
  } catch (err) {
    setStatus(err.message, 'red');
  }
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('mint-btn').addEventListener('click', mintToken);
document.getElementById('transfer-btn').addEventListener('click', transferToken);
document.getElementById('balance-btn').addEventListener('click', checkBalance);

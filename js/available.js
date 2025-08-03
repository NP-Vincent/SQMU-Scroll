import { DISTRIBUTOR_ADDRESS } from './config.js';
import { fromSQMUUnits } from './units.js';
const RPC = 'https://rpc.scroll.io';
const SALE_ADDR = DISTRIBUTOR_ADDRESS;
const DECIMALS = 2;

function findPropertyCode() {
  let code = '';
  document.querySelectorAll('.es-entity-field').forEach((li) => {
    const label = li.querySelector('.es-property-field__label');
    const value = li.querySelector('.es-property-field__value');
    if (label && value && label.textContent.includes('SQMU Property Code')) {
      code = value.textContent.trim();
    }
  });
  if (!code) {
    const params = new URLSearchParams(location.search);
    code = params.get('code') || '';
  }
  return code;
}

async function fetchAvailable(code) {
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const dist = new ethers.Contract(
    SALE_ADDR,
    ['function getAvailable(string) view returns(uint256)'],
    provider
  );
  const bal = await dist.getAvailable(code);
  return Number(fromSQMUUnits(bal));
}

async function init() {
  const codeSpan = document.getElementById('property-code');
  const availSpan = document.getElementById('available-bal');
  const code = findPropertyCode();
  codeSpan.textContent = code || 'N/A';
  if (!code) {
    availSpan.textContent = 'N/A';
    return;
  }
  try {
    const amt = await fetchAvailable(code);
    availSpan.textContent = amt.toLocaleString(undefined, {
      minimumFractionDigits: DECIMALS,
      maximumFractionDigits: DECIMALS,
    });
  } catch (err) {
    availSpan.textContent = 'N/A';
  }
}

document.addEventListener('DOMContentLoaded', init);

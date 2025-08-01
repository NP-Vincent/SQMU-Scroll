// email.js - send purchase receipts via Google Apps Script
// This module posts transaction details so buyers receive an email confirmation.

export const MAIL_URL = 'https://script.google.com/macros/s/AKfycbxVdHsuXsvhTsEXcOV4HE9mBqtWF1CQYxRBxUlMJgfHKZFt_LY7Q-bwoF0B5XatlOBS/exec';

// Query parameters available on the current page
const gParams = new URLSearchParams(location.search);

/**
 * Send an email receipt for a completed purchase.
 * @param {string} payLink - Link to the stablecoin transaction
 * @param {string} amount - USD amount paid
 * @param {object} option - Payment token object with `name` and `token`
 * @param {string} email - Recipient email address
 * @param {string} tokenAmt - Number of SQMU tokens bought
 * @param {string} tokenId - SQMU token symbol
 * @param {string} tokenAddr - ERC-20 token contract address
 * @param {number} dec - Token decimals
 * @param {string} sqmuLink - Link to the SQMU token purchase tx
 * @param {boolean} fail - Whether token distribution failed
 */
export function sendReceipt(
  payLink,
  amount,
  option,
  email,
  tokenAmt,
  tokenId,
  tokenAddr,
  dec,
  sqmuLink,
  fail
) {
  fetch(MAIL_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      to_email: email,
      tx_link: payLink,
      usd: amount,
      chain: option.name,
      token: option.token,
      token_amt: tokenAmt,
      token_id: tokenId,
      token_addr: tokenAddr,
      token_dec: dec,
      sqmu_link: sqmuLink,
      prop: tokenId,
      sqmu_amt: gParams.get('sqmu') || '',
      agent: document.getElementById('agent-code-input')?.value.trim() || '',
      fail: fail ? '1' : ''
    }).toString()
  });
}

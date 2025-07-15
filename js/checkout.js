// checkout.js - handle SQMU payments
// Requires ethers.js and MetaMask SDK via CDN

const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Checkout', url: window.location.href },
  infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
});
let provider;
let signer;

const treasuryAddress = '0x1111111111111111111111111111111111111111';

const PAYMENT_OPTIONS = [
  { network: 'scroll', text: 'Scroll (ETH)' },
  { network: 'ethereum', text: 'Ethereum Mainnet (ETH)' },
];

function parseQuery() {
  const p = new URLSearchParams(window.location.search);
  return {
    sqmu: parseFloat(p.get('sqmu') || '0'),
    usd: parseFloat(p.get('usd') || '0'),
    token: (p.get('token') || 'eth').toLowerCase(),
    chain: (p.get('chain') || 'scroll').toLowerCase(),
    saleAddr: p.get('saleAddr') || '',
  };
}

const query = parseQuery();

const chainIds = {
  scroll: '0x82750',
  ethereum: '0x1',
};

function populateNetworkOptions() {
  const select = document.getElementById('network-select');
  PAYMENT_OPTIONS.forEach(({ network, text }) => {
    const opt = document.createElement('option');
    opt.value = network;
    opt.textContent = text;
    if (network === query.chain) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

async function connect() {
  const ethereum = MMSDK.getProvider();
  const statusDiv = document.getElementById('checkout-status');
  statusDiv.innerText = 'Connecting to MetaMask...';

  try {
    const permissions = await ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }],
    });
    const accountsPermission = permissions.find(
      (p) => p.parentCapability === 'eth_accounts'
    );
    if (!accountsPermission) {
      throw new Error('eth_accounts permission not granted');
    }
    await ethereum.request({ method: 'eth_requestAccounts', params: [] });

    const selectedNetwork =
      document.getElementById('network-select').value || query.chain;
    query.chain = selectedNetwork;
    const targetChainId = chainIds[selectedNetwork] || chainIds.scroll;
    let chainId = await ethereum.request({ method: 'eth_chainId', params: [] });
    if (chainId !== targetChainId) {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
      chainId = await ethereum.request({ method: 'eth_chainId', params: [] });
    }

    provider = new ethers.providers.Web3Provider(ethereum);
    signer = provider.getSigner();

    statusDiv.innerHTML = '<span style="color:green;">Connected. Ready to pay.</span>';
    document.getElementById('pay').addEventListener('click', pay);
    document.getElementById('disconnect').addEventListener('click', disconnect);
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

async function pay() {
  const statusDiv = document.getElementById('checkout-status');
  if (!signer) {
    statusDiv.innerHTML = '<span style="color:red;">Connect wallet first.</span>';
    return;
  }

  try {
    const network = document.getElementById('network-select').value || query.chain;
    const email = document.getElementById('email-input').value;
    const agentCode = document.getElementById('agent-code-input').value;
    query.chain = network;
    statusDiv.innerText = 'Fetching price...';
    if (query.token !== 'eth') {
      throw new Error('Only ETH payments supported in this demo');
    }

    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const priceJson = await res.json();
    const ethPrice = priceJson.ethereum.usd;
    const ethAmount = query.usd / ethPrice;
    statusDiv.innerText = 'Sending payment...';
    const tx = await signer.sendTransaction({
      to: treasuryAddress,
      value: ethers.utils.parseEther(ethAmount.toString()),
    });
    await tx.wait();
    await sendReceipt(email, agentCode, network, tx.hash);
    statusDiv.innerHTML = '<span style="color:green;">Payment complete</span>';
    // TODO: distribute SQMU tokens to purchaser using sale contract
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

async function sendReceipt(email, agentCode, network, txHash) {
  if (!email) return;
  try {
    await fetch('https://example.com/api/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, agentCode, network, txHash }),
    });
  } catch (err) {
    console.error('sendReceipt failed', err);
  }
}

async function disconnect() {
  const ethereum = MMSDK.getProvider();
  const statusDiv = document.getElementById('checkout-status');
  try {
    await ethereum.request({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    });
    provider = undefined;
    signer = undefined;
    statusDiv.innerHTML = '<span style="color:orange;">Disconnected</span>';
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);
populateNetworkOptions();

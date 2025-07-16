// checkout_login.js - MetaMask or Web3Auth login demo
// Requires ethers.js, MetaMask SDK, and Web3Auth SDK via CDN

const INFURA_ID = '822e08935dea4fb48f668ff353ac863a';
const WEB3AUTH_CLIENT_ID = 'BAMYkJxLW4gIvsaIN2kOXDxyyz1gLyjnbqbF0hVKuc0RaCwyx2uhG9bBbbN_zVYfrfU5NH9K-QMG53GslEmCw4E';

// MetaMask SDK setup
const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Checkout Login', url: window.location.href },
  infuraAPIKey: INFURA_ID,
  headless: false,
});
const ethereum = MMSDK.getProvider();

// Web3Auth setup
const web3auth = new Web3Auth({
  clientId: WEB3AUTH_CLIENT_ID,
  network: 'mainnet',
});

async function initWeb3Auth() {
  try {
    await web3auth.init();
    console.log('Web3Auth ready');
  } catch (e) {
    console.error('Web3Auth initialization error:', e);
  }
}
initWeb3Auth();

let provider;
let signer;

// MetaMask login handler
async function loginMetaMask() {
  const statusDiv = document.getElementById('login-status');
  statusDiv.innerText = 'Connecting to MetaMask...';
  try {
    const accounts = await MMSDK.connect();
    provider = new ethers.providers.Web3Provider(ethereum);
    signer = provider.getSigner();
    statusDiv.innerHTML = `<span style="color:green;">Connected: ${accounts[0]}</span>`;
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

// Web3Auth login handler
async function loginWeb3Auth() {
  const statusDiv = document.getElementById('login-status');
  statusDiv.innerText = 'Connecting with Web3Auth...';
  try {
    const w3provider = await web3auth.connect();
    provider = new ethers.providers.Web3Provider(w3provider);
    signer = provider.getSigner();
    const addr = await signer.getAddress();
    statusDiv.innerHTML = `<span style="color:green;">Web3Auth connected: ${addr}</span>`;
  } catch (err) {
    statusDiv.innerHTML = `<span style="color:red;">${err.message}</span>`;
  }
}

// Disconnect handler
async function disconnect() {
  provider = undefined;
  signer = undefined;
  try {
    await web3auth.logout();
  } catch (err) {
    console.warn('Web3Auth logout:', err.message);
  }
  const statusDiv = document.getElementById('login-status');
  statusDiv.innerHTML = '<span style="color:orange;">Disconnected</span>';
}

document.getElementById('login-metamask').addEventListener('click', loginMetaMask);
document.getElementById('login-web3auth').addEventListener('click', loginWeb3Auth);
document.getElementById('disconnect').addEventListener('click', disconnect);

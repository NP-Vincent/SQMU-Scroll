// mint.js - embeddable widget logic
// This script expects ethers.js and MetaMask SDK to be loaded via CDN.

const MMSDK = new MetaMaskSDK.MetaMaskSDK({
  dappMetadata: { name: 'SQMU Mint Widget', url: window.location.href },
  infuraAPIKey: '822e08935dea4fb48f668ff353ac863a',
});
const ethereum = MMSDK.getProvider();
const provider = new ethers.providers.Web3Provider(ethereum);
const signer = provider.getSigner();
let contract;

// Deployed proxy address. Update this value when redeploying the contract.
const contractAddress = '0xd0b895e975f24045e43d788d42BD938b78666EC8';

// Connect the user's wallet via MetaMask SDK
const SCROLL_CHAIN_ID = '0x82750';

async function connect() {
  await provider.send('eth_requestAccounts', []);

  let chainId = await provider.send('eth_chainId', []);
  if (chainId !== SCROLL_CHAIN_ID) {
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: SCROLL_CHAIN_ID }]);
      chainId = await provider.send('eth_chainId', []);
    } catch (err) {
      console.error('Failed to switch to Scroll network', err);
      return;
    }
  }

  const res = await fetch('../abi/SQMU.json');
  const abiJson = await res.json();
  contract = new ethers.Contract(contractAddress, abiJson.abi, signer);
}

// Bind connect button
document.getElementById('connect').addEventListener('click', connect);

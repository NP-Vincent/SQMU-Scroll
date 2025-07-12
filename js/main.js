import { MetaMaskSDK } from '@metamask/sdk';
import { ethers } from 'ethers';
import abi from '../abi/SQMU1155.json';

const MMSDK = new MetaMaskSDK();
const ethereum = MMSDK.getProvider();
let provider;
let signer;

async function connect() {
  await ethereum.request({ method: 'eth_requestAccounts' });
  provider = new ethers.BrowserProvider(ethereum);
  signer = await provider.getSigner();
}

document.getElementById('connect').addEventListener('click', connect);

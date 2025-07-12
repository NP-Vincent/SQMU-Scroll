# SQMU ERC-1155 Ownership Platform

This repository manages the entire stack for the SQMU fractional real estate ownership system—including the smart contract, HTML/JavaScript user interfaces, MetaMask SDK integration, and all supporting documentation.

## Repository Structure

- `contracts/` – Solidity smart contracts (ERC-1155, upgradeable, audited)
- `html/` – Embeddable HTML/JavaScript widgets for front-end use (WordPress.com compatible)
- `js/` – Modular JavaScript for MetaMask SDK and contract interaction
- `abi/` – Contract ABI JSON files (always update after contract deployment)
- `notes/` – Technical and architectural notes
- `README.md` – This file
- `AGENTS.md` – Development and AI agent instructions

## Quick Start

1. **Clone the repo**  
   `git clone https://github.com/[your-org]/sqmu-erc1155.git`

2. **Install dependencies (for local JS development)**  
   `npm install`

3. **Contract Deployment**  
   - Edit or extend the smart contract in `contracts/SQMU1155.sol`
   - Deploy using Remix or Hardhat, on the Scroll network
   - Export the ABI and update `abi/SQMU1155.json`

4. **Front-End Development**  
   - Use files in `html/` and `js/` for UI/interaction
   - All wallet logic uses MetaMask SDK and ethers.js

## Dependencies

- OpenZeppelin Contracts (upgradeable)
- ethers.js
- @metamask/sdk

## Developer Guidelines

- All contract changes must be reflected in the ABI and UI
- Keep `README.md` and `AGENTS.md` current with every change
- Document new features and code structure in `notes/`

# SQMU ERC-1155 Ownership Platform

This repository manages the entire stack for the SQMU fractional real estate ownership system—including the smart contract, HTML/JavaScript user interfaces, MetaMask SDK integration, and all supporting documentation. All widgets are designed to be embedded directly into WordPress.com pages using the custom HTML block.

## Repository Structure

- `contracts/` – Solidity smart contracts (ERC-1155, upgradeable, audited)
- `html/` – Embeddable HTML/JavaScript widgets for front-end use (WordPress.com compatible)
- `js/` – Modular JavaScript for MetaMask SDK and contract interaction
- `abi/` – Contract ABI JSON files (always update after contract deployment)
- `notes/` – Technical and architectural notes
- `notes/deployment_log.md` – Canonical record of deployments and contract addresses
- `README.md` – This file
- `AGENTS.md` – Development and AI agent instructions
- `erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md` – Detailed contract requirements
- `package.json` – Optional local tooling (CDN scripts are used instead of npm packages)

## Quick Start

1. **Clone the repo**
   `git clone https://github.com/NP-Vincent/SQMU-Scroll.git`

2. **Contract Deployment**
   - Edit or extend the smart contract in `contracts/SQMU.sol`
   - The contract is based on OpenZeppelin Contracts **v5** and compiled with Solidity **0.8.27**.
   - Deploy using Remix or Hardhat, on the Scroll network
   - Export the ABI and update `abi/SQMU.json`
   - Record the new proxy and implementation in `notes/deployment_log.md`
3. **Front-End Development**
   - Use files in `html/` and `js/` for UI/interaction
   - All wallet logic uses MetaMask SDK and ethers.js loaded from public CDNs
   - Copy HTML widgets directly into WordPress.com custom HTML blocks

## Deployment Guide

Follow these steps to deploy and upgrade `SQMU.sol` on the Scroll network.

1. **Deploy through Remix**
   - Open [Remix IDE](https://remix.ethereum.org/ ) and load `contracts/SQMU.sol`.
   - Enable the OpenZeppelin Upgrades plugin or ensure the UUPS libraries are included.
   - Connect MetaMask to the Scroll network using the Injected Provider.
   - Compile the contract and deploy a new UUPS proxy.

2. **Export ABI**
   - Open the Remix compilation details and copy the ABI JSON.
   - Replace the contents of `abi/SQMU.json` with this ABI.

3. **Update Front-End**
   - Record the proxy address in `notes/deployment_log.md`.
   - Update widgets in `html/` and modules in `js/` with the new address or have them read from the log.

4. **Perform UUPS Upgrades**
   - Modify `contracts/SQMU.sol` as needed and recompile.
   - Using the OpenZeppelin Upgrades plugin or Remix deploy/run panel, execute an upgrade of the existing proxy.
   - Export the new ABI and update `abi/SQMU.json`.

5. **Log Deployments**
   - Append each deployment or upgrade to `notes/deployment_log.md` including date, network, proxy, implementation and ABI version.

## Dependencies

- OpenZeppelin Contracts (upgradeable)
- ethers.js
- @metamask/sdk

All front-end widgets load these libraries directly from public CDNs. Example:

```html
<script src="https://cdn.jsdelivr.net/npm/ethers/dist/ethers.min.js"></script>
<script src="https://unpkg.com/@metamask/sdk/dist/browser/index.js"></script>
```

## Developer Guidelines

- All contract changes must be reflected in the ABI and UI
- Keep `README.md` and `AGENTS.md` current with every change
- Document new features and code structure in `notes/`
- Record each deployment in `notes/deployment_log.md`
- Keep `erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md` updated with contract changes

## External References

- [OpenZeppelin](https://github.com/OpenZeppelin)
- [MetaMask](https://github.com/MetaMask)
- [Web3Auth](https://github.com/Web3Auth)
- [Scroll Tech](https://github.com/scroll-tech)
- [Scroll Developer Docs](https://docs.scroll.io/en/developers/)
- [Scroll Contracts](https://docs.scroll.io/en/developers/scroll-contracts/)
- [Rollupscan](https://scroll.io/rollupscan)
- [Scrollscan](https://scrollscan.com/)
- [MetaMask SDK Quickstart](https://docs.metamask.io/sdk/connect/javascript/)
- [MetaMask Scroll Quickstart](https://docs.metamask.io/services/reference/scroll/quickstart/)
- [MetaMask JSON-RPC Methods](https://docs.metamask.io/services/reference/scroll/json-rpc-methods/)
- [MetaMask Debug Methods](https://docs.metamask.io/services/reference/scroll/json-rpc-methods/debug/)

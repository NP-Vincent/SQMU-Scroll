# SQMU ERC-1155 Ownership Platform

This repository manages the entire stack for the SQMU fractional real estate ownership system—including the smart contract, HTML/JavaScript user interfaces, MetaMask SDK integration, and all supporting documentation. All widgets are designed to be embedded directly into WordPress.com pages using the custom HTML block.

## Repository Structure

- `contracts/` – Solidity smart contracts (ERC-1155, upgradeable, audited)
- `html/` – Embeddable HTML/JavaScript widgets for front-end use (WordPress.com compatible)
- `html/WPEmbed.html` – Single-file version of the mint widget for direct WordPress embedding
- `js/` – Modular JavaScript for MetaMask SDK and contract interaction
- `php/` – WordPress plugin exposing the `[sqmu_mint_widget]` shortcode
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
  - `html/WPEmbed.html` provides the mint widget as a single standalone file with inline JavaScript and ABI to avoid relative path issues.
  - Mint widgets display connection status messages in the `#mint-status` div for easier debugging.
   - Always serve widgets over `https://` so MetaMask can inject `window.ethereum`

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
   - Update widgets in `html/` and modules in `js/` with this address. When
     embedding a widget directly in WordPress, use `html/WPEmbed.html` or copy
     the JS code so the `contractAddress` constant reflects the deployed proxy.

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
<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
<script src="https://c0f4f41c-2f55-4863-921b-sdk-docs.github.io/cdn/metamask-sdk.js"></script>
```

**Note:** The project relies on ethers.js v5. Avoid upgrading to v6 or later unless all widgets and scripts are updated to match the newer API.

## Minting Tokens via the Widget

Contract owners can mint new ERC-1155 tokens directly from the provided widget.

1. Open `html/mint.html` locally or embed `html/WPEmbed.html` into WordPress.
2. Click **Connect Wallet** to initialize MetaMask and the contract. Use **Disconnect** when you want to revoke wallet permissions.
3. Enter the token ID, amount, and optional URI you wish to mint, then click **Mint**.
4. Success or error information will appear in the `#mint-status` area.

Only the wallet that owns the contract can successfully call `mint`.

## Checking Balances and Transfers

Two additional widgets are provided for common ERC-1155 actions.

1. **Balance Widget** (`html/balance.html`) lets you connect your wallet and
   query the balance for any token ID. Optionally specify an address to check;
   leaving the field blank uses the connected wallet.
2. **Transfer Widget** (`html/transfer.html`) enables wallet-to-wallet
   transfers by calling `safeTransferFrom`. Enter the token ID, amount,
   recipient, and optional data (defaults to `0x`).

Status messages for both widgets appear in their respective `*-status` divs.

## Checkout Widget

`html/checkout.html` now collects payment details directly in the page. The
network selector is populated from a `PAYMENT_OPTIONS` list and you must enter
an email address to receive a receipt. Optionally provide an agent referral
code. Query parameters such as `sqmu`, `usd`, and `token` remain supported for
defaults. Connect your wallet, choose the network, fill in the email (and agent
code if applicable) then click **Pay**. A receipt is sent to the supplied email
after the transaction confirms.

For a simplified authentication example, see `html/checkout_login.html`. It
demonstrates logging in with either **MetaMask** (using Infura project
`822e08935dea4fb48f668ff353ac863a`) or **Web3Auth** with client ID
`BAMYkJxLW4gIvsaIN2kOXDxyyz1gLyjnbqbF0hVKuc0RaCwyx2uhG9bBbbN_zVYfrfU5NH9K-QMG53GslEmCw4E`.
Both options initialize directly in the browser so the snippet can be embedded
in WordPress pages.

## PHP Shortcode Plugin

`php/sqmu-mint-widget.php` provides a WordPress shortcode for the mint widget.
Install the file as a plugin by copying it (and the `abi/` directory) into your
`wp-content/plugins` folder. Activate **SQMU Mint Widget** and place
`[sqmu_mint_widget]` on any page or post to render the interface.

The plugin reads `abi/SQMU.json` to build the contract instance and expects the
deployed proxy address `0xd0b895e975f24045e43d788d42BD938b78666EC8`. Adjust the
`contractAddress` constant inside the PHP file if your deployment changes.

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

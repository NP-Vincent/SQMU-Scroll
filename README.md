# SQMU ERC-1155 Ownership Platform

This repository manages the entire stack for the SQMU fractional real estate ownership system—including the smart contract, HTML/JavaScript user interfaces, MetaMask SDK integration, and all supporting documentation. All widgets are designed to be embedded directly into WordPress.com pages using the custom HTML block.

## Repository Structure

- `contracts/` – Solidity smart contracts (ERC-1155, upgradeable, audited)
- `html/` – Embeddable HTML/JavaScript widgets for front-end use (WordPress.com compatible)
- `js/` – Modular JavaScript for MetaMask SDK and contract interaction
- `src/` – Additional JavaScript utilities used by the widgets
- `abi/` – Contract ABI JSON files (always update after contract deployment)
- `notes/` – Technical and architectural notes
- `notes/deployment_log.md` – Canonical record of deployments and contract addresses
- `README.md` – This file
- `AGENTS.md` – Development and AI agent instructions
- `erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md` – Detailed contract requirements

## Quick Start

1. **Clone the repo**
   `git clone https://github.com/NP-Vincent/SQMU-Scroll.git`

2. **Contract Deployment**
   - Edit or extend the smart contract in `contracts/SQMU.sol`
   - The contract is based on OpenZeppelin Contracts **v5** and compiled with Solidity **0.8.24**.
   - Deploy using Remix or Hardhat, on the Scroll network
   - Export the ABI and update `abi/SQMU.json`
   - Record the new proxy and implementation in `notes/deployment_log.md`
3. **Front-End Development**
   - Use files in `html/` and `js/` for UI/interaction
   - All wallet logic uses MetaMask SDK and ethers.js loaded from a CDN
   - Copy HTML widgets directly into WordPress.com custom HTML blocks.
     Ensure each `<script>` tag points to
      `https://np-vincent.github.io/SQMU-Scroll/js/FILE.js` or inline the module
      code so WordPress can load it correctly. The ABI must be hosted at
     `https://np-vincent.github.io/SQMU-Scroll/abi/SQMU.json`. Each widget
     constructs the ABI URL with `new URL('../abi/SQMU.json', import.meta.url)` so
     it resolves relative to the script location. Host both the JavaScript files
     and ABI on GitHub Pages for this path to work.
  - Mint widgets display connection status messages in the `#mint-status` div for easier debugging.
  - Always serve widgets over `https://` so MetaMask can inject `window.ethereum`

### WordPress Embedding Options

You can embed any widget in WordPress.com in two ways:

1. **Copy HTML and JS** – Paste the contents of the widget's `html/*.html` file and related `js/*.js` code directly into a Custom HTML block. The JavaScript expects the ABI file to live next to the script.
2. **Reference pre-hosted scripts** – Keep the HTML snippet and load the JavaScript from GitHub Pages. Example:

```html
<script src="https://np-vincent.github.io/SQMU-Scroll/js/mint.js"></script>
```

All scripts fetch the ABI using `new URL('../abi/SQMU.json', import.meta.url)`. Therefore the JavaScript modules and `abi/SQMU.json` must be hosted together on GitHub Pages so this path resolves correctly.

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
   - Update widgets in `html/` and modules in `js/` with this address so the `contractAddress` constant reflects the deployed proxy.

4. **Perform UUPS Upgrades**
   - Modify `contracts/SQMU.sol` as needed and recompile.
   - Using the OpenZeppelin Upgrades plugin or Remix deploy/run panel, execute an upgrade of the existing proxy.
   - Export the new ABI and update `abi/SQMU.json`.

5. **Log Deployments**
   - Append each deployment or upgrade to `notes/deployment_log.md` including date, network, proxy, implementation and ABI version.

## Deploying AtomicSQMUDistributor

Use the same approach to deploy the payment distributor contract.

1. **Compile in Remix**
   - Open [Remix IDE](https://remix.ethereum.org/) and load `contracts/AtomicSQMUDistributor.sol`.
   - Under **Libraries**, install **OpenZeppelin Contracts (upgradeable)** so the imports resolve.
   - Compile the contract with Solidity `^0.8.24`.

2. **Deploy a UUPS Proxy**
   - Activate the OpenZeppelin Upgrades plugin (or use the deploy/run panel) and choose **Deploy (uups) Proxy**.
   - Connect MetaMask to Scroll and deploy the proxy.

3. **Initialize**
   - After deployment, call `initialize(commissionBps)` from your admin wallet. This sets the initial commission and assigns ownership to the caller.

4. **Export ABI**
   - From the Remix compilation details, copy the ABI JSON for `AtomicSQMUDistributor`.
   - Save it as `abi/AtomicSQMUDistributor.json` and record the addresses in `notes/deployment_log.md`.

## Dependencies

- OpenZeppelin Contracts (upgradeable)
- ethers.js **v5.7.2**
- @metamask/sdk

Widgets import these scripts directly from a CDN. The project relies on ethers.js v5; update the code if you migrate to a newer version. Use the following pinned sources when embedding widgets:

```html
<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
<script src="https://c0f4f41c-2f55-4863-921b-sdk-docs.github.io/cdn/metamask-sdk.js"></script>
```

## Minting Tokens via the Widget

Contract owners can mint new ERC-1155 tokens directly from the provided widget.

1. Open `html/mint.html` locally or paste its contents into a WordPress.com Custom HTML block.
   Ensure the `<script>` tag references
   `https://np-vincent.github.io/SQMU-Scroll/js/mint.js` (or inline the module)
   so the widget loads correctly.
2. Click **Connect Wallet** to initialize MetaMask and the contract. Use **Disconnect** to terminate the MetaMask session and revoke wallet permissions.
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

For WordPress embeds, keep the `<script>` tags pointing to
`https://np-vincent.github.io/SQMU-Scroll/js/balance.js` and
`https://np-vincent.github.io/SQMU-Scroll/js/transfer.js` or inline the modules
in the page.

Status messages for both widgets appear in their respective `*-status` divs.

## Unified Admin Interface

The page `html/admin.html` provides a single interface for minting, transferring
and checking balances. It uses the same MetaMask SDK connection helpers and
styled buttons as the payment widget. Load this page or embed its contents in a
WordPress.com block to manage the contract. Ensure the script tag points to
`https://np-vincent.github.io/SQMU-Scroll/js/admin.js` so WordPress can fetch
the module.

## Buying SQMU

The page `html/buy.html` lets users purchase SQMU tokens through the
`AtomicSQMUDistributor` contract.

1. Open the file locally or embed it in a WordPress.com block. Keep the script
   tag pointing to `https://np-vincent.github.io/SQMU-Scroll/js/buy.js` so the
   module loads correctly.
2. For property pages, embed `html/listing_buy.html` with a script tag
   referencing `https://np-vincent.github.io/SQMU-Scroll/js/listing_buy.js`.
   Copy the HTML into a WordPress Custom HTML block so buyers can look up the
   property, connect their wallet and purchase without leaving the page. The
   older `listing_page_embed.html` file has been removed.
3. Click **Connect Wallet** to initialize MetaMask (the widget automatically
   switches to the Scroll network).
4. The property code comes directly from the listing and cannot be changed.
   Simply enter the number of SQMU tokens to purchase, select a payment token
   and optionally supply an agent code.
   The amount field accepts fractional SQMU in 0.01 increments and the
   widget displays available supply formatted with two decimals.
5. After fetching property details the widget checks `getPropertyStatus` to
   confirm the property is active. If inactive it displays "Property not active
   for sale" and prevents any purchase.
6. Click **Buy** to execute `buySQMU`. The widget checks your ERC-20 allowance for the selected token and automatically submits an `approve` transaction if necessary before purchasing. Progress and errors appear in the `#buy-status` div.
7. Payments use Scroll network stablecoins:
   - USDT `0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df`
   - USDC `0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4`
   - USDQ `0xdb9E8F82D6d45fFf803161F2a5f75543972B229a`.

## Viewing Property Availability

The simple widget `html/available.html` displays how many SQMU tokens remain
for a given property.

1. Embed the file in a WordPress.com Custom HTML block. Keep the script tag
   pointing to `https://np-vincent.github.io/SQMU-Scroll/js/available.js` so the
   module loads correctly.
2. The widget automatically extracts the property code from the listing page
   (or the `code` query parameter) and calls `getAvailable` on the
   `AtomicSQMUDistributor` contract to show the current supply.

## Developer Guidelines

- All contract changes must be reflected in the ABI and UI
- Keep `README.md` and `AGENTS.md` current with every change
- Document new features and code structure in `notes/`
- Record each deployment in `notes/deployment_log.md`
- Keep `erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md` updated with contract changes
- `AtomicSQMUDistributor.sol` now scales payments based on the ERC-20 token's decimals and simplifies the price calculation.
- New event `PropertyStatusChanged` is emitted whenever a property is activated or deactivated.
- New view `getAvailable(propertyCode)` returns the remaining SQMU balance held in a property's treasury.

## External References

- [OpenZeppelin](https://github.com/OpenZeppelin)
- [MetaMask](https://github.com/MetaMask)
- [Web3Auth](https://github.com/Web3Auth)
- [Scroll Tech](https://github.com/scroll-tech)
- [Safe Core](https://github.com/safe-global/safe-core-sdk)
- [Across](https://github.com/across-protocol)
- [Scroll Developer Docs](https://docs.scroll.io/en/developers/)
- [Scroll Contracts](https://docs.scroll.io/en/developers/scroll-contracts/)
- [Rollupscan](https://scroll.io/rollupscan)
- [Scrollscan](https://scrollscan.com/)
- [MetaMask SDK Quickstart](https://docs.metamask.io/sdk/connect/javascript/)
- [MetaMask Scroll Quickstart](https://docs.metamask.io/services/reference/scroll/quickstart/)
- [MetaMask JSON-RPC Methods](https://docs.metamask.io/services/reference/scroll/json-rpc-methods/)
- [MetaMask Debug Methods](https://docs.metamask.io/services/reference/scroll/json-rpc-methods/debug/)
- [Across Crosschain Intents](https://docs.across.to/developer-quickstart/settle-crosschain-intents)
- [Across ERC-7683 in Production](https://docs.across.to/developer-quickstart/erc-7683-in-production)
- [ERC-7683 Specifications](https://www.erc7683.org/spec)
- [Safe Core Starter Kit](https://docs.safe.global/sdk/starter-kit)



## License

This project is licensed under the [MIT License](LICENSE).

# SQMU ERC-1155 Ownership Platform

This repository manages the entire stack for the SQMU fractional real estate ownership system—including the smart contract, HTML/JavaScript user interfaces, MetaMask SDK integration, and all supporting documentation. All widgets are designed to be embedded directly into WordPress.com pages using the custom HTML block.

Reference plugin and theme files live in `Wordpress.com References/` to assist with embedding HTML and JavaScript snippets in Custom HTML blocks on the sqmu.net WordPress.com site.

## Repository Structure

- `contracts/` – Solidity smart contracts (ERC-1155, upgradeable, audited)
- `html/` – Embeddable HTML/JavaScript widgets for front-end use (WordPress.com compatible)
- `js/` – Modular JavaScript for MetaMask SDK and contract interaction
- `js/config.js` – Centralized addresses for the SQMU, distributor, crowdfund and governance contracts
- `src/` – Additional JavaScript utilities used by the widgets
- `gas/` – Google App Script sources for email receipts
- `abi/` – Contract ABI JSON files (always update after contract deployment)
- `notes/` – Technical and architectural notes
- `notes/deployment_log.md` – Canonical record of deployments and contract addresses
- `Wordpress.com References/` – Plugin and theme reference files demonstrating how to embed HTML/JS in WordPress.com Custom HTML blocks
- `README.md` – This file
- `AGENTS.md` – Development and AI agent instructions
- `erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md` – Detailed contract requirements
- `contracts/SQMURent.sol` and `contracts/SQMURentDistribution.sol` – Manage tenant deposits, rent collection and distribution

## Quick Start

1. **Clone the repo**
   `git clone https://github.com/NP-Vincent/SQMU-Scroll.git`

2. **Contract Deployment**
   - Edit or extend the smart contract in `contracts/SQMU.sol`
   - The contract is based on OpenZeppelin Contracts **v5** and compiled with Solidity **0.8.26**.
   - Deploy manually using Remix by owner wallet, on the Scroll network
   - Solidity files import other modules using raw GitHub Pages URLs like `https://np-vincent.github.io/...`. **Keep these import paths intact** so Remix can fetch the dependencies during compilation and so the verified source matches the deployed code.
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

### Widget Styling Conventions

Widgets are designed to blend with WordPress.com blocks. When creating or updating HTML/JS:

- Wrap each widget in a `wp-block-group` and give it a unique `sqmu-*` class.
- Apply spacing with a rule like `.sqmu-widget > * + * { margin-top: 1em; }`.
- Use `.wp-block-input` and `.wp-block-select` for form controls. Set `width:100%`, `font-size:1rem` and `padding:0.5em`.
- Group buttons inside `.wp-block-buttons` containers. Each button should use `.wp-block-button` and `.wp-block-button__link`.
- Labels are bold and centered (`class="has-text-align-center"` and `style="font-weight:bold;"`).
- Show status or feedback messages in `<p>` elements with the `has-small-font-size` class.

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
   - Edit `js/config.js` and set `SQMU_ADDRESS` to this value so all widgets load the correct contract.

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
   - Compile the contract with Solidity `^0.8.26`.

2. **Deploy a UUPS Proxy**
   - Activate the OpenZeppelin Upgrades plugin (or use the deploy/run panel) and choose **Deploy (uups) Proxy**.
   - Connect MetaMask to Scroll and deploy the proxy.

3. **Initialize**
   - After deployment, call `initialize(commissionBps)` from your admin wallet. This sets the initial commission and assigns ownership to the caller.

4. **Export ABI**
   - From the Remix compilation details, copy the ABI JSON for `AtomicSQMUDistributor`.
   - Save it as `abi/AtomicSQMUDistributor.json` and record the addresses in `notes/deployment_log.md`.
5. **Update Front-End**
   - Edit `js/config.js` and set `DISTRIBUTOR_ADDRESS` to the deployed proxy so widgets can interact with the distributor.

## Deploying SQMUTrade

This contract provides the on-chain marketplace for listing and purchasing SQMU tokens.

1. **Compile in Remix**
   - Open `contracts/SQMUTrade.sol` and ensure OpenZeppelin upgradeable libraries are available.
   - Compile the contract with Solidity `^0.8.26`.
2. **Deploy a UUPS Proxy**
   - Use the OpenZeppelin Upgrades plugin (or Remix run panel) and choose **Deploy (uups) Proxy**.
   - Call `initialize(treasury, commissionBps)` to set the treasury address and starting commission.
3. **Export ABI**
   - Copy the ABI JSON and save it as `abi/SQMUTrade.json`.
   - Record the proxy and implementation in `notes/deployment_log.md`.
4. **Update Front-End**
   - Add the proxy address to `js/config.js` and load the new ABI in any marketplace widgets.

## Deploying Escrow

This contract handles staged funding and multisig release of property payments using `MultiSignerERC7913Upgradeable`.

1. **Compile in Remix**
   - Open `contracts/Escrow.sol` and ensure OpenZeppelin upgradeable libraries are available.
   - Compile with Solidity `^0.8.26` and OpenZeppelin Contracts **v5.4**.
2. **Deploy a UUPS Proxy**
   - Use the OpenZeppelin Upgrades plugin (or Remix run panel) and choose **Deploy (uups) Proxy**.
   - Initialize with buyer, agent, optional seller, token, amount and deadline.
3. **Export ABI**
   - Save the ABI JSON as `abi/Escrow.json` and record addresses in `notes/deployment_log.md`.
4. **Update Front-End**
 - Add the proxy address to `js/config.js` and load the ABI in any escrow widgets.
5. **Whitelist Payment Token**
   - Before calling `createEscrow` on the factory, run `addAllowedToken(token)` so the escrow can initialize with that stablecoin.

## Deploying SQMUCrowdfund

This contract sells pre-minted governance tokens for stablecoins held by the contract.

1. **Compile in Remix**
   - Open `contracts/SQMUCrowdfund.sol`.
   - Compile with Solidity `^0.8.26` and ensure OpenZeppelin upgradeable libraries are available.
2. **Deploy a UUPS Proxy**
   - Use the Upgrades plugin to deploy and then call `initialize(sqmuAddress, priceUSD)`.
3. **Export ABI**
   - Save the ABI JSON as `abi/SQMUCrowdfund.json` and record the proxy in `notes/deployment_log.md`.
4. **Update Front-End**
   - Add the proxy address to `js/config.js` as `CROWDFUND_ADDRESS` so the governance widgets function.

## Deploying SQMURent and SQMURentDistribution

These contracts manage deposits, rent collection and manual distribution.

1. **Compile in Remix**
   - Open `contracts/SQMURent.sol` and `contracts/SQMURentDistribution.sol`.
   - Compile with Solidity `^0.8.26` and ensure OpenZeppelin upgradeable libraries are available.
2. **Deploy UUPS Proxies**
   - Deploy `SQMURentDistribution` first and call `initialize()`.
   - Deploy `SQMURent` with `initialize(vaultAddress)` using the distribution proxy address. The vault address can be changed later with `setVault()` if needed.
3. **Export ABI**
   - Save the ABI JSON as `abi/SQMURent.json` and `abi/SQMURentDistribution.json`.
   - Record the proxy addresses in `notes/deployment_log.md`.
4. **Update Front-End**
   - Add both proxy addresses to `js/config.js` for any rent widgets.

## Dependencies

- OpenZeppelin Contracts **v5.4** (upgradeable)
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

## Viewing Your Portfolio

The file `html/portfolio.html` lets a user connect their wallet and see the
balance of each SQMU property along with the USD value of that balance.

1. Embed the file in a WordPress.com Custom HTML block and keep the script tag
   pointing to `https://np-vincent.github.io/SQMU-Scroll/js/portfolio.js` so the
   module loads correctly.
2. The widget scans token IDs from `1` through `MAX_TOKEN_ID` (defined in
   `js/portfolio.js`) and displays any non-zero balances. Token ID `0` represents
   the governance token and is purchased separately via `governance_buy.html`.
   Adjust this constant if your deployment uses higher token IDs.

3. Click **Connect Wallet** to fetch your balances. Each property code with a
   non-zero amount appears in a table showing your SQMU balance and the USD
   value for that balance. A totals row at the bottom sums all SQMU held and its
   combined USD value.
4. Values are retrieved from the `AtomicSQMUDistributor` contract using
   property codes like `SQMU1`. The contract calculates the USD price for the
   exact SQMU amount held, so the widget displays the value of your holdings in
   real time.

5. The page also lets you list SQMU for sale through the `SQMUTrade` contract.
   If your wallet has not approved the trade contract, the widget will first
   call `setApprovalForAll` so it can escrow your tokens before creating the
   listing.
6. Active listings display the payment token's symbol (e.g., USDC, USDT, USDQ)
   instead of the contract address and omit seller addresses.

## Governance Crowdfund

The contract `SQMUCrowdfund.sol` sells its pre-minted governance tokens at a USD price
set by the owner. Payments are kept in the contract until withdrawn.
Two widgets interact with this contract:

1. `html/governance_buy.html` lets investors purchase token ID `0`.
   Include the script `https://np-vincent.github.io/SQMU-Scroll/js/governance_buy.js`.
2. `html/governance_admin.html` lets the owner update the token price and
   withdraw collected stablecoins.

## Distributor Admin Interface

The page `html/distributor_admin.html` allows owners to manage the
`AtomicSQMUDistributor` contract. Use it to register properties and agents,
update the global commission, toggle property status and perform manual
token distributions.

1. Open the file locally or embed it in a WordPress.com block and keep the
   script tag pointing to
   `https://np-vincent.github.io/SQMU-Scroll/js/distributor_admin.js` so the
   module loads correctly.
2. Click **Connect Wallet** to initialize MetaMask.
3. Fill in the desired form and submit. Only the contract owner can call these
   functions.
4. Use the **Queries** section to retrieve property info, price and remaining
  supply for a code.

## Escrow Funding

Property purchases use a dedicated `Escrow` contract for staged payments.
The widget `html/escrow.html` lets buyers deposit stablecoins directly into
the escrow instance. Only tokens whitelisted in the `EscrowFactory` contract
are accepted.

1. Embed the file in a WordPress.com Custom HTML block and keep the script tag
   pointing to `https://np-vincent.github.io/SQMU-Scroll/js/escrow.js` so the
   module loads correctly.
2. Click **Connect Wallet** to fetch the escrow state and payment token.
   The widget displays amounts already deposited for each stage.
3. Enter a deposit amount, choose `EOI`, `Initial` or `Balance` and click
   **Deposit**. The script ensures sufficient token allowance before calling
   `deposit`.
4. Progress and errors appear in the `#escrow-status` element.
5. Tokens that omit `symbol()` now display a `-` placeholder instead of failing.

## Rent Widgets

Tenants can pay deposits and rent through the rent widget. Owners
use a separate admin interface to manage fees and refunds. When a property
offers a weekly option, a dropdown appears to select **Monthly** or **Weekly**.
The weekly price is derived from the monthly rate by dividing by four and adding
10%, then deposit and fee calculations use this adjusted price.

1. Embed `html/rent.html` in a property page with the property ID passed via the
   `?id=` query parameter. Keep the script tag pointing to
   `https://np-vincent.github.io/SQMU-Scroll/js/rent.js` so the module loads
   correctly.
2. The widget handles token approvals automatically. When a property has no
   active tenant it shows a **Start Rental** button that sends the deposit and,
   if the payment window is open, the first rent. Otherwise it stores the
   deposit and asks the tenant to return closer to the due date. Once occupied
   only the **Pay Rent** button is displayed for ongoing payments.
3. Embed `html/rent_admin.html` with
   `https://np-vincent.github.io/SQMU-Scroll/js/rent_admin.js` for owners to
  manage accepted tokens, treasury address, vault address, management fee,
  check deposits, refund deposits (including partial refunds) and withdraw accumulated fees.

## Email Receipts

Payment widgets can optionally email buyers a receipt. Add an email input to
any widget; if left blank, no message is sent. The helper `js/email.js`
selects the proper Google Apps Script endpoint from `js/config.js` and posts
transaction details for delivery via Gmail. Deploy the scripts in
`googleappscript/*_email_receipt.gs` as web apps and update
`LISTING_MAIL_URL`, `GOVERNANCE_MAIL_URL`, `RENT_MAIL_URL` and
`ESCROW_MAIL_URL` in `js/config.js` with the deployment URLs.

## Developer Guidelines

- All contract changes must be reflected in the ABI and UI
- Keep `README.md` and `AGENTS.md` current with every change
- Document new features and code structure in `notes/`
- Record each deployment in `notes/deployment_log.md`
- Keep `erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md` updated with contract changes
- `AtomicSQMUDistributor.sol` now scales payments based on the ERC-20 token's decimals and simplifies the price calculation.
- New event `PropertyStatusChanged` is emitted whenever a property is activated or deactivated.
- `SQMURent` stores the active tenant and `nextRentDue` timestamp per property. Rent must be paid by that tenant within the configured window.
- New view `getAvailable(propertyCode)` returns the remaining SQMU balance held in a property's treasury.
- `getDepositDetails(propertyId)` returns a property's deposit amount, token, tenant and the contract's balance for that token.
- `refundDeposit(propertyId, tenant, refundAmount)` refunds part or all of a deposit and sends any remainder to the treasury, emitting `DepositRefunded(propertyId, tenant, token, refundAmount, remainder)`.

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

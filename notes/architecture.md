# SQMU Platform Architecture

This file summarizes key architectural decisions for the SQMU platform.

Detailed contract requirements are maintained in `../erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md`.

## Smart Contracts

- `SQMU.sol` implements an upgradeable ERC-1155 token using OpenZeppelin libraries and the UUPS proxy pattern.
- The current contract is generated from the OpenZeppelin **v5** wizard and compiled with Solidity **0.8.27**.
- All contracts are intended to deploy on the Scroll network. See the [Scroll Developer Docs](https://docs.scroll.io/en/developers/) and [Scroll Contracts](https://docs.scroll.io/en/developers/scroll-contracts/) for network details.

## Front-End Widgets

- Widgets in `html/` are embedded directly in WordPress.com via custom HTML blocks.
- JavaScript in `js/` interacts with the contract using `ethers.js` and `@metamask/sdk` loaded from the repository's GitHub Pages site.
- Widgets fetch the latest contract ABI from the `abi/` directory at runtime to remain lightweight and upgrade-friendly.
 - Currently available widgets are:
   - `mint.html` for token creation
   - `balance.html` for querying balances
   - `transfer.html` for token transfers
  - Shared wallet logic resides in `js/wallet.js` providing
    `connectWallet()` and `disconnectWallet()` for all widgets. The disconnect
    helper now calls `MMSDK.terminate()` to fully close the MetaMask session.

Example includes served from GitHub Pages:

```html
<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
<script src="https://<user>.github.io/SQMU-Scroll/metamask-sdk.js"></script>
```

## Rationale

- Using CDN scripts ensures that no Node.js tooling or bundling is required, keeping widgets portable across CMS platforms.
- The UUPS proxy pattern keeps contract upgrades simple while relying on audited OpenZeppelin implementations.
- Fetching ABI JSON keeps the widget decoupled from deployment details and supports multiple versions.

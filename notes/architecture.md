# SQMU Platform Architecture

This file summarizes key architectural decisions for the SQMU platform.

Detailed contract requirements are maintained in `../erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md`.

## Smart Contracts

- `SQMU.sol` implements an upgradeable ERC-1155 token using OpenZeppelin libraries and the UUPS proxy pattern.
- The current contract is generated from the OpenZeppelin **v5** wizard and compiled with Solidity **0.8.26**.
  - `SQMUTrade.sol` provides a simple on-chain marketplace allowing users to list and purchase SQMU tokens with escrowed transfers and commission payouts.
  - `Escrow.sol` manages staged funding and multi-signature release for property purchases using `MultiSignerERC7913Upgradeable`.
  - `SQMUGovernance.sol` controls the governance token sale, vesting schedules and on-chain voting.
    It now exposes `governanceURI()` to return the final metadata URI for token ID 0.
  - `ERC1155VotesAdapter.sol` implements `IVotes` so the Governor can read each account's total allocated governance tokens.
- All contracts are intended to deploy on the Scroll network. See the [Scroll Developer Docs](https://docs.scroll.io/en/developers/) and [Scroll Contracts](https://docs.scroll.io/en/developers/scroll-contracts/) for network details.
- The governance module proxy address is recorded in `notes/deployment_log.md` and referenced by `GOVERNANCE_ADDRESS` in `js/config.js`.

## Front-End Widgets

- Widgets in `html/` are embedded directly in WordPress.com via custom HTML blocks.
- JavaScript in `js/` interacts with the contract using `ethers.js` and `@metamask/sdk` loaded from official CDN sources.
- Widgets fetch the latest contract ABI from the `abi/` directory at runtime to remain lightweight and upgrade-friendly.
- Currently available widgets are:
  - `mint.html` for token creation
  - `balance.html` for querying balances
  - `transfer.html` for token transfers
  - `listing_buy.html` and its companion script `listing_buy.js` combine
    property lookup and purchasing in a single embed and replace the older
    two-page flow. The deprecated `listing_page_embed.html` file has been
    removed in favour of this unified widget alongside `buy.html`.
  - `portfolio.html` lists each SQMU token ID owned by the connected wallet
    using `portfolio.js`.
  - `governance_buy.html` allows investors to purchase governance tokens.
  - `governance_status.html` displays locked and unlocked balances for the connected wallet.
  - `governance_vote.html` provides a simple interface to cast votes on proposals.
  - Shared wallet logic resides in `js/wallet.js` providing
    `connectWallet()` and `disconnectWallet()` for all widgets. The disconnect
    helper now calls `MMSDK.terminate()` to fully close the MetaMask session.

Example includes served from pinned CDNs:

```html
<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
<script src="https://c0f4f41c-2f55-4863-921b-sdk-docs.github.io/cdn/metamask-sdk.js"></script>
```

## Rationale

- Using CDN scripts ensures that no Node.js tooling or bundling is required, keeping widgets portable across CMS platforms.
- The UUPS proxy pattern keeps contract upgrades simple while relying on audited OpenZeppelin implementations.
- Fetching ABI JSON keeps the widget decoupled from deployment details and supports multiple versions.
- The distributor contract fetches ERC-20 `decimals()` to scale payments for tokens with differing precision.
- All fund-moving functions, including manual distributions, are guarded by `nonReentrant` to prevent reentrancy attacks.
- Property status updates emit a `PropertyStatusChanged` event for on-chain tracking.
- `ERC1155VotesAdapter` calculates voting power from each address's locked and unlocked allocations so Governor modules can use ERC-1155 balances.
- Accounts marked as forfeited lose all voting power. `getVotes` in both the governor and adapter return 0 when `forfeited` is true.

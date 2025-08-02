# SQMU Platform Architecture

This file summarizes key architectural decisions for the SQMU platform.

Detailed contract requirements are maintained in `../erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md`.

## Smart Contracts

- `SQMU.sol` implements an upgradeable ERC-1155 token using OpenZeppelin libraries and the UUPS proxy pattern.
- The current contract is generated from the OpenZeppelin **v5** wizard and compiled with Solidity **0.8.26**.
  - `SQMUTrade.sol` provides a simple on-chain marketplace allowing users to list and purchase SQMU tokens with escrowed transfers and commission payouts.
  - `Escrow.sol` manages staged funding and multi-signature release for property purchases using `MultiSignerERC7913Upgradeable`.
  - `SQMUGovernance.sol` has been trimmed down and now only includes the
    `SQMUSale` module (which itself uses the vesting logic). This simplification
    ensures the contract stays well below the 24KB deployment limit while
    retaining UUPS upgradeability for future features.
  - `SQMUTimelock.sol` wraps `TimelockController` with UUPS upgradeability and holds queued governance actions until the delay expires.
  - `ERC1155VotesAdapter.sol` implements `IVotes` so the Governor can read each account's total allocated governance tokens.
  - `SQMUCrowdfund.sol` holds pre-minted governance tokens and sells them for a
    USD price set by the owner. Collected stablecoins remain in the contract
    until withdrawn.
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
  - `portfolio.html` lists each SQMU token ID starting from `1` owned by the
    connected wallet using `portfolio.js`. Token ID `0` represents the
    governance token and is handled separately.
  - `governance_buy.html` allows investors to purchase governance tokens.
  - `governance_admin.html` provides owner-only access to mint governance tokens.
  - `governance_status.html` displays locked and unlocked balances for the connected wallet.
  - `governance_vote.html` provides a simple interface to cast votes on proposals.
  - `escrow.html` allows buyers to fund a property-specific Escrow contract. The companion
    script `escrow.js` fetches the payment token from the contract, ensures allowance
    and submits deposits for the selected stage.
  - `rent.html` lets tenants pay deposits and rent. If a weekly period is available,
    the script derives the weekly price from the monthly rate (`monthly / 4 * 110%`)
    before calculating deposit and management fees.
  - Transaction receipts are emailed by calling `sendReceipt()` from `js/email.js`.
    The companion Google App Script lives in `gas/email_receipt.gs`.
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
- `SQMURent` enforces rental periods by storing `nextRentDue` and the active tenant. Only that tenant may pay rent within a short window.
- `SQMURent` provides `getDepositDetails` to query the current deposit, token, tenant and the contract's token balance for a property.
- Refunds now specify an explicit amount. Any remainder is sent to the treasury and `DepositRefunded` logs both values.
- The vault address used for rent distribution can be updated by the owner via `setVault()`.
- `ERC1155VotesAdapter` calculates voting power from each address's locked and unlocked allocations so Governor modules can use ERC-1155 balances.
- Accounts marked as forfeited lose all voting power. `getVotes` in both the governor and adapter return 0 when `forfeited` is true.

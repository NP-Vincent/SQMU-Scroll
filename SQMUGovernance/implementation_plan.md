# SQMUGovernance Implementation Plan

This document outlines the remaining steps to bring the governance module into production. Tasks are grouped by development stage and reference the OpenZeppelin modules listed in `open_zeppelin_governance_contract.md`.

## 1. Finalize Contract Logic

- Integrate the core OpenZeppelin libraries:
  - `IERC1155Upgradeable` / `ERC1155Upgradeable`
  - `OwnableUpgradeable`
  - `UUPSUpgradeable`
  - `Strings`
  - Governor modules: `Governor`, `GovernorSettings`, `GovernorVotes`, `GovernorVotesQuorumFraction`, `GovernorCountingSimple`, `GovernorTimelockControl`
  - Revenue distribution via custom dynamic logic
- Complete custom locking and forfeiture features as described in `governance_contract_requirements.md`.
- Implement an ERC1155Votes adapter so the Governor can read ID 0 balances (locked and unlocked).
- Add comprehensive events for sales, locking, unlocking and voting actions.

## 2. Testing & Review

- Write unit tests covering token sales, lock schedules, voting power and payment splitting.
- Test upgradeability with a local UUPS proxy using Hardhat upgrades plugin.
- Verify that all owner-only functions are properly restricted.

## 3. Deployment

- Deploy the contract behind a UUPS proxy on Scroll.
- Record proxy and implementation addresses in `notes/deployment_log.md`.
- Immediately export the new ABI to `abi/SQMUGovernance.json`.

## 4. Front-End Integration

- Update `js/config.js` with the deployed proxy address.
- Regenerate widget code to reference the new ABI and address.
- Ensure MetaMask SDK and ethers.js are loaded via CDN in all governance HTML files.
- Provide UI updates for token purchase, balance display and proposal voting using the finalized contract methods.


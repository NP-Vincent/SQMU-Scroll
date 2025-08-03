# AGENTS.md – Instructions for Developers and AI Agents

This document outlines how to maintain, extend, and automate code for the SQMU platform.
All front-end code is designed for direct HTML/JS embedding within WordPress.com. Widgets load MetaMask SDK and ethers.js via CDN.
**Follow these guidelines for all updates—whether human or AI-assisted (Codex).**

## Core Workflow

1. **Contract Development**
   - Update `contracts/SQMU.sol` for all ownership logic.
   - Use OpenZeppelin and UUPS for upgradability.
   - Document every new or changed method and event.

2. **ABI Management**
   - After each contract change and deployment, export the updated ABI to `abi/SQMU.json`.

3. **UI/Front-End**
 - For every contract method, provide a corresponding HTML/JS interface in `html/` and `js/`.
 - All wallet connections must use MetaMask SDK.
 - Always reference the current ABI and contract address.
 - Load MetaMask SDK and ethers.js from a CDN.
  - Use `js/units.js` (`toStablecoinUnits`, `fromStablecoinUnits`, `toSQMUUnits`,
    `fromSQMUUnits`) for stablecoin and SQMU amount conversions to maintain
    two-decimal precision across interfaces.
  - Style widgets for WordPress.com by using block classes: wrap content in `wp-block-group` with a unique `sqmu-*` class and apply `> * + * { margin-top: 1em; }`; use `.wp-block-input` and `.wp-block-select` for full-width form fields (`font-size:1rem`, `padding:0.5em`); place buttons inside `.wp-block-buttons` containers with `.wp-block-button` and `.wp-block-button__link`; labels should be bold and center aligned (`class="has-text-align-center"` and `style="font-weight:bold;"`); show status messages in `<p>` elements with the `has-small-font-size` class.

4. **MetaMask SDK Usage**
   - Use MetaMask SDK in all wallet connection code.
   - Support Scroll network by default.

5. **Documentation**
    - Update `README.md` with any change affecting users or devs.
    - Record architectural decisions and patterns in `notes/architecture.md`.
    - Ensure instructions WordPress.com compatibility remain current.
    - Keep `erc_1155_sqmu_ownership_smart_contract_requirements_cleaned.md` up to date with contract changes.

6. **Sync and Versioning**
   - When deploying new contract versions, update the ABI and document version in the widget or UI files.
   - Version all major changes in both contract and UI.

## Example Codex Prompts

- “Update contracts/SQMU.sol with a pausing feature.”
- “Generate html/transfer.html and js/transfer.js to call transferWithFee using MetaMask SDK and ethers.js.”
- “Ensure ABI in abi/SQMU.json matches latest contract.”

## File Organization

- Smart contracts: `contracts/`
- HTML widgets: `html/`
- JS modules: `js/`
- ABI: `abi/`
- Notes: `notes/`
- WordPress.com references: `Wordpress.com References/` – plugin and theme materials for embedding HTML/JS in Custom HTML blocks on sqmu.net

*Always keep file and directory structure consistent with this guide.*

## Naming Conventions

- The primary contract is `SQMU.sol` with ABI stored in `abi/SQMU.json`.
- JavaScript modules and HTML widgets should share a base name when exposing the same functionality (e.g. `html/mint.html` with `js/mint.js`).
- Keep file names lowercase except for Solidity contracts which use CamelCase.


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

# AGENTS.md – Instructions for Developers and AI Agents

This document outlines how to maintain, extend, and automate code for the SQMU platform.
All front-end code is designed for direct HTML/JS embedding within WordPress.com and must load dependencies from the repository's GitHub Pages CDN.
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
  - Load MetaMask SDK and ethers.js from the repository's GitHub Pages site. GitHub Actions builds the necessary bundles from npm packages and publishes them under `docs/`.
  - Do **not** rely on node modules at runtime. Instead, compile dependencies in the `js-build` workflow so widgets can reference the static files hosted on GitHub Pages.

4. **MetaMask SDK Usage**
   - Use MetaMask SDK in all wallet connection code.
   - Support Scroll network by default.

5. **Documentation**
    - Update `README.md` with any change affecting users or devs.
    - Record architectural decisions and patterns in `notes/architecture.md`.
    - Ensure instructions for CDN usage and WordPress compatibility remain current.
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

*Always keep file and directory structure consistent with this guide.*

## Naming Conventions

- The primary contract is `SQMU.sol` with ABI stored in `abi/SQMU.json`.
- JavaScript modules and HTML widgets should share a base name when exposing the same functionality (e.g. `html/mint.html` with `js/mint.js`).
- Keep file names lowercase except for Solidity contracts which use CamelCase.

## WordPress Plugin Maintenance

- The plugin resides in `php/` and exposes the `[sqmu_mint_widget]` shortcode.
 - Keep `SQMU-Scroll.php` synchronized with the latest ABI and widget logic.
- When adding or updating shortcodes, modify the PHP file accordingly and bump the `Version` header.
- Test each shortcode in a local WordPress instance and document any usage changes in `README.md`.

### Deployment via GitHub Actions

1. Commit PHP changes on the `main` branch.
2. Push to GitHub. The `.github/workflows/wpcom.yml` workflow packages the `php/` directory as the `wpcom` artifact.
3. Download the artifact from the workflow run and upload it to your WordPress site to update the plugin.
4. The `.github/workflows/js-build.yml` workflow bundles npm dependencies and publishes them to GitHub Pages for the plugin to consume.

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

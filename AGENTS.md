# AGENTS.md – Instructions for Developers and AI Agents

This document outlines how to maintain, extend, and automate code for the SQMU platform.  
**Follow these guidelines for all updates—whether human or AI-assisted (Codex).**

## Core Workflow

1. **Contract Development**
   - Update `contracts/SQMU1155.sol` for all ownership logic.
   - Use OpenZeppelin and UUPS for upgradability.
   - Document every new or changed method and event.

2. **ABI Management**
   - After each contract change and deployment, export the updated ABI to `abi/SQMU1155.json`.

3. **UI/Front-End**
   - For every contract method, provide a corresponding HTML/JS interface in `html/` and `js/`.
   - All wallet connections must use MetaMask SDK (`@metamask/sdk`).
   - Always reference the current ABI and contract address.

4. **MetaMask SDK Usage**
   - Use MetaMask SDK in all wallet connection code.
   - Support Scroll network by default.

5. **Documentation**
   - Update `README.md` with any change affecting users or devs.
   - Record architectural decisions and patterns in `notes/`.

6. **Sync and Versioning**
   - When deploying new contract versions, update the ABI and document version in the widget or UI files.
   - Version all major changes in both contract and UI.

## Example Codex Prompts

- “Update contracts/SQMU1155.sol with a pausing feature.”
- “Generate html/transfer.html and js/transfer.js to call transferWithFee using MetaMask SDK and ethers.js.”
- “Ensure ABI in abi/SQMU1155.json matches latest contract.”

## File Organization

- Smart contracts: `contracts/`
- HTML widgets: `html/`
- JS modules: `js/`
- ABI: `abi/`
- Notes: `notes/`

*Always keep file and directory structure consistent with this guide.*

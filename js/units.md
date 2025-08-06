# units.js Reference

This document provides guidance for handling currency and SQMU token values using `js/units.js`.

## 1. Currency Input/Display (USD, USDC, USDQ, USDT)

- All user-facing input fields for currency must use USD as the unit and allow up to 2 decimal places (e.g., 1234.56).
- Regardless of the underlying stablecoin selected (USDC, USDQ, USDT), always display and accept inputs as USD with two decimals.
- Note: USDC and USDT use 6 decimals (1 USDC/USDT = 1,000,000 units), USDQ uses 18 decimals (1 USDQ = 1,000,000,000,000,000,000 units).
- **On submit/transfer:** Convert the user’s USD input to the correct smallest unit for the selected stablecoin, according to its decimals, before sending to the contract.
  - Example: `1234.56` USD input →
    - For USDC/USDT: multiply by `1e6` → `1234560000`
    - For USDQ: multiply by `1e18` → `1234560000000000000000`
- **On display:** Always convert from the stablecoin’s smallest unit to USD (divide by `1e6` or `1e18`) and format to 2 decimal places.

## 2. SQMU Token Input/Display

- All input fields for SQMU must accept and display up to 2 decimal places (e.g., 3.25 SQMU).
- All displays of SQMU balances, availability, and related amounts must be formatted to 2 decimal places for user clarity.
- However, the underlying ERC-1155 contract only accepts whole numbers (integers) for SQMU. In the frontend, multiply user input by `100` and round to the nearest integer for contract interactions.
  - Example: `3.25` SQMU input → `325` units sent to contract (if 2 decimal logic is in place). On retrieval, divide by `100` and format to 2 decimals.
- **Exception:** The Governance SQMU token (token id `0`) must not use decimal display or input. All input and output for SQMU id `0` should be whole numbers only.

## 3. Repository Guidance

- Review all HTML + JS files:
  - Currency input fields (for payment, rent, investment, etc.)
  - SQMU-related input fields (for buying, selling, displaying balances)
- Implement or update:
  - Input validation (HTML pattern, JS checks)
  - Conversion logic (JS: handle different decimals per stablecoin)
  - Display formatting (always show 2 decimals for currency/SQMU except SQMU id `0`)
- Add utility functions for stablecoin conversion and SQMU value formatting to avoid duplication.

## 4. Contract Decimal Handling

The Solidity contracts interact with ERC-20 stablecoins and ERC-1155 tokens in different ways. All ERC-1155 transfers use whole token amounts. Stablecoin transfers expect amounts in the token’s smallest unit unless otherwise noted.

- **SQMU.sol** – Implements the core ERC-1155 token; minting and transfers work with integer amounts only【F:contracts/SQMU.sol†L44-L53】
- **SQMURentDistribution.sol** – Stores rent balances and distributes ERC-20 tokens using raw amounts without adjusting for decimals; ERC-1155 deposits and withdrawals also use whole numbers【F:contracts/SQMURentDistribution.sol†L50-L55】【F:contracts/SQMURentDistribution.sol†L82-L90】
- **SQMURent.sol** – Accepts stablecoin deposits and rent payments in smallest units and forwards them unchanged; ERC-1155 transfers use integer amounts【F:contracts/SQMURent.sol†L121-L135】【F:contracts/SQMURent.sol†L217-L225】
- **SQMUTrade.sol** – Retrieves the payment token’s `decimals()` and converts a USD price (two decimals) to token units before transfer; ERC-1155 amounts remain integers【F:contracts/SQMUTrade.sol†L114-L126】
- **SQMUCrowdfund.sol** – Stores token price in USD with 18 decimals and converts to payment token units using its `decimals()` value; governance tokens (ERC-1155) are transferred as whole units【F:contracts/SQMUCrowdfund.sol†L71-L83】
- **AtomicSQMUDistributor.sol** – Keeps per-SQMU price in USD with 18 decimals and computes required payment using the stablecoin’s decimals; SQMU tokens are moved in whole amounts【F:contracts/AtomicSQMUDistributor.sol†L150-L189】
- **Escrow.sol** – Handles deposits and releases of ERC-20 stablecoins using the amounts provided; no ERC-1155 tokens are involved【F:contracts/Escrow.sol†L131-L146】

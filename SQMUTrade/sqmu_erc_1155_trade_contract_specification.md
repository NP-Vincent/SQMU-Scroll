# **SQMU ERC-1155 On-Chain Trade Contract – Specification**

---

## **Purpose**

A fully on-chain marketplace for ERC-1155 tokens (SQMU), supporting secure listing, escrow, purchase, commission payout, and withdrawal, with all logic executed and audited on the blockchain.

---

## **User Flow**

### **1. Seller:**

- Calls `setApprovalForAll(tradeContract, true)` on SQMU token contract (one-time).
- Calls `listToken(propertyCode, tokenAddress, tokenId, amount)` to escrow specific tokens for sale.
- May cancel listing anytime before sale via `cancelListing(listingId)` to withdraw unsold tokens.

### **2. Buyer:**

- Calls `buy(listingId, amount, paymentToken)` specifying amount to purchase and ERC-20 stablecoin.
- Pays in the accepted ERC-20 token; receives purchased SQMU tokens.
- Platform fee (commission) is atomically deducted and sent to treasury; seller receives proceeds.

### **3. Admin (Owner):**

- Sets or updates global commission rate (basis points).
- Registers or removes accepted payment tokens.
- Sets or updates treasury address.

---

## **Core Data Structures**

- **Listing:**

  - `listingId`: Unique identifier (sequential).
  - `seller`: Address of lister.
  - `propertyCode`: string (links to globally referencable data).
  - `tokenAddress`: address of ERC-1155 (SQMU) contract.
  - `tokenId`: uint256.
  - `amountListed`: uint256 (remaining).
  - `active`: bool.

- **Commission:**

  - Global rate in basis points (bps).
  - Treasury address.

---

## **Key Functions**

### **Public**

- \`\`

  - Escrows tokens in contract.
  - Creates and stores new listing.
  - Emits `ListingCreated`.

- \`\`

  - Checks listing is active, amount available.
  - Fetches USD price from `AtomicSQMUDistributor` and converts to the buyer's payment token.
  - Calculates total price and commission.
  - Transfers (via `transferFrom`) total price from buyer to contract.
  - Splits payment: commission to treasury, remainder to seller.
  - Transfers purchased amount of SQMU from escrow to buyer.
  - Updates or removes listing.
  - Emits `Purchase`.

- \`\`

  - Only seller can call.
  - Returns remaining tokens from escrow to seller.
  - Marks listing as inactive.
  - Emits `ListingCancelled`.

### **Admin**

- \`\`

  - Only owner.
  - Sets global commission rate.
  - Emits `CommissionUpdated`.

- \`\`

  - Only owner.
  - Sets treasury address.

- \`\`

  - Only owner.
  - Manages payment token allowlist.
  - Emits `PaymentTokenAllowed`.

### **Getters/Views**

- \`\`: Returns full listing info.
- \`\`: Returns all active listings (can be off-chain indexed for scalability).

---

## **Key Events**

- `event ListingCreated(uint256 listingId, address indexed seller, string propertyCode, address tokenAddress, uint256 tokenId, uint256 amount);`
- `event Purchase(uint256 listingId, address indexed buyer, uint256 amount, uint256 totalPaid, uint256 commission, address paymentToken);`
- `event ListingCancelled(uint256 listingId, address indexed seller);`
- `event CommissionUpdated(uint256 bps);`
- `event PaymentTokenAllowed(address token, bool allowed);`

---

## **Modifiers & Security**

- \`\`: Admin functions.
- \`\`: All fund- and token-moving functions.
- \`\`: Upgradability via proxy.
- **Checks**: On ownership, balance, allowance, valid listing, amount, and payment token.

---

## **Interfaces & Inheritance**

- Inherit from OpenZeppelin `OwnableUpgradeable`, `UUPSUpgradeable`, `ReentrancyGuardUpgradeable`, and `ERC1155Holder`.

---

## **Business Rules**

- All transfers and payouts are atomic (all succeed or revert).
- Listing/escrow is per listing, not per wallet—no risk to other user assets.
- Seller can cancel/withdraw anytime before purchase.
- Buyer always receives tokens and seller receives payment, minus commission, in a single transaction.
- Only approved ERC-20 tokens accepted as payment.
- Admin cannot sweep user escrow; tokens only move by seller or by sale.

---

## **Upgradeability**

- UUPS pattern with restricted `_authorizeUpgrade`.
- Storage layout must be considered for future upgrades.

---

## **Example Function Skeletons**

```solidity
function listToken(
    string memory propertyCode,
    address tokenAddress,
    uint256 tokenId,
    uint256 amount
) external nonReentrant { ... }

function buy(uint256 listingId, uint256 amount, address paymentToken) external nonReentrant { ... }

function cancelListing(uint256 listingId) external nonReentrant { ... }

function setCommission(uint256 bps) external onlyOwner { ... }

function allowPaymentToken(address token, bool allowed) external onlyOwner { ... }
```

---

## **Notes**

- Indexing of listings (for querying active listings) is typically done off-chain for efficiency, but all state and events are on-chain.
- Commission math uses basis points for precision.
- All user-facing actions are via MetaMask or compatible wallets.

---


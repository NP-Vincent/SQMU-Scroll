## **Rent Collection & Distribution Requirements**

## **1. High-Level Architecture**

You will require **three main smart contracts**:

1. **RentManager**: Handles lease creation, tracks tenants, collects rent, manages management fee logic, and interfaces with stablecoin contracts.
2. **DistributionVault**: Holds collected rent and executes periodic, fully automated distributions to SQMU token holders for a specific property.
3. **SQMU ERC-1155 Token Contract**: The existing token contract, representing property shares.

---

## **2. Contract Roles & Responsibilities**

### **A. RentManager**

- Whitelists accepted stablecoins (USDT, USDC, USDQ).
- Registers tenant leases (property ID, payment interval, deposit amount, rent, stablecoin type).
- Collects rent via `transferFrom` from tenant wallets.
- Deducts management fee (configurable, e.g., 10-15%).
- Transfers net rent to DistributionVault per property.
- Emits transparent logs for all actions.

### **B. DistributionVault**

- Receives net rent for each property (from RentManager).
- Tracks last distribution timestamp for each property.
- Calculates each SQMU holder’s share using ERC-1155 totalSupply per property.
- On manual trigger by owner, distributes rent to all holders in a single batch transaction.
- Handles “dust” via min payout, or allows holders to claim when their share exceeds a threshold.

### **C. SQMU ERC-1155 Token**

- Standard OZ ERC-1155 with totalSupply extension (to facilitate proportional calculations).
- No modifications required except for providing read-access to holders and total supply per property.

---

## **3. OpenZeppelin Imports**

**Best practice:** Use only audited OZ contracts, upgradeable pattern if necessary.

```solidity
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol"; // if upgradable
```

- Use **EnumerableSet** for tracking current SQMU holders per property.
- **ReentrancyGuard** on all pay/distribute functions.
- **Ownable** for fee management and contract admin.

---

## **4. Rent Payment & Subscription Mechanism**

- Tenants approve `RentManager` contract for their selected stablecoin.
- `RentManager.collectRent()` uses `transferFrom` to pull rent payment from tenant wallet at the scheduled interval (tenant must pre-approve, or Chainlink Automation can trigger).
- Deposit handled as a separate payment and tracked for potential refund.

---

## **5. Distribution Mechanism**

- At the distribution interval (monthly/quarterly), anyone (or automation bot) calls `DistributionVault.distribute(propertyId)`.
- Contract reads total SQMU supply for propertyId.
- For each holder, calculates share and sends proportional stablecoin payout.
- Events emitted for each distribution for transparency.

---

## **6. Accepted Stablecoins**

- `mapping(address => bool) public acceptedStablecoins;` in `RentManager` for validation.
- Only allow deposits/payments in whitelisted tokens: **USDT, USDC, USDQ** (deploy or reference Scroll-native contracts).
- Contract must check token decimals and implement ERC-20 safe transfer patterns.

---

## **7. Security & Best Practices**

- **Pausable** modifier to stop system in emergencies.
- Only allow ERC-20s with audited, non-rebasing logic.
- Use pull-payment pattern or batch processing to mitigate out-of-gas risk.
- All key actions (collect, distribute, admin changes) emit clear events.

---

## **8. Upgradeability**

- UUPS proxy (OpenZeppelin) required for upgradability of logic contracts.
- Storage separation between logic and data.

---

## **9. Interfaces & Events**

- `event RentCollected(address indexed tenant, uint256 propertyId, uint256 amount, address stablecoin);`
- `event RentDistributed(uint256 propertyId, uint256 total, uint256 timestamp);`
- `event ManagementFeeTaken(uint256 propertyId, uint256 amount, address stablecoin);`

---

## **10. External Integrations**

- Chainlink Automation or equivalent to automate periodic rent collection and distribution without requiring user intervention.

---

## **Summary Table**

| Contract            | Role                                       | OZ Imports                                                |
| ------------------- | ------------------------------------------ | --------------------------------------------------------- |
| RentManager         | Collects rent, deducts fee, sends to vault | IERC20, Ownable, ReentrancyGuard, EnumerableSet, Pausable |
| DistributionVault   | Distributes rent to SQMU holders           | IERC20, EnumerableSet, ReentrancyGuard                    |
| SQMU ERC-1155 Token | Property share tracking                    | ERC1155Supply, Ownable                                    |

---

## **11. Architectural Notes and Best Practice Enhancements**

- **Contract Interrelation**:  
  - Only `RentManager` can transfer funds to `DistributionVault`; restrict direct deposits to `DistributionVault` using access control modifiers.
  - `DistributionVault` must reference the SQMU ERC-1155 token for querying supply and holder balances.
  - When multiple stablecoins are supported, all distributions for a given property/distribution cycle must use a single stablecoin (as specified in the lease).

- **Holder Enumeration**:  
  - For large properties with many holders, avoid per-block gas limit issues by allowing partial distributions or enabling holders to "claim" their share.  
  - **Recommended:** Batch payout with a fallback claim mechanism for those missed due to gas constraints.

- **Upgradeability**:  
  - Use OpenZeppelin's UUPSUpgradeable contracts with explicit storage gaps for future-proofing.
  - Admin-only upgrade process, with a transparent multi-signature (Safe) recommended for admin controls.

- **Access Control**:  
  - Use `Ownable` and optionally `AccessControl` for finer permissions (e.g., property manager, automation triggers).

- **Stablecoin Integration**:  
  - Only use ERC-20 tokens with fixed supply and stable decimals (typically 6 or 18). Check each token’s decimals on deployment to normalize calculations.
  - For Scroll-native stablecoins, reference official contract addresses; allow for upgradability if new stablecoins need to be added/removed.

---

## **12. Compliance, Auditability, and Transparency**

- **All critical actions emit events**, including lease creation, deposit/refund, rent payment, fee deduction, distribution, and upgrades.
- All balances and distribution logs are auditable by querying on-chain event logs and public view functions.
- For external audit readiness, document every state variable, function, and their role in the contract.

---

## **13. Gas Management and Distribution Optimization**

- **Batch processing**: Implement distribution in manageable batches, especially for properties with a large number of holders.
- **Claim-on-demand**: If batch fails (out-of-gas), allow token holders to claim their share post-distribution interval, preventing fund lockup.

---

## **14. Chainlink Automation Integration**

- Chainlink Keepers (or similar) should be permissioned to trigger both rent collection and rent distribution functions.
- Ensure only registered keepers can call automation functions to avoid spam/gas waste.

---

## **15. Sample Function Signatures**

```solidity
// In RentManager
function registerLease(
    uint256 propertyId,
    address tenant,
    address stablecoin,
    uint256 rentAmount,
    uint256 depositAmount,
    uint8 intervalType // monthly/weekly
) external onlyOwner;

function collectRent(uint256 leaseId) external; // Called by Chainlink Keeper

// In DistributionVault
function deposit(uint256 propertyId, address stablecoin, uint256 amount) external onlyRentManager;

function distribute(uint256 propertyId) external; // Called by Chainlink Keeper or anyone

function claim(uint256 propertyId) external; // Fallback for holders
```

---

This provides a comprehensive, auditable, upgradeable foundation for your on-chain rent collection and distribution architecture, ensuring security and compliance while leveraging best practices for efficiency and transparency.


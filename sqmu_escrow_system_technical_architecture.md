# **SQMU Escrow System — Technical Architecture (Minimal Proxy + UUPS Upgradeable)**

---

## **1. Components**

### **A. Escrow Implementation Contract**

- **Upgradeable (UUPS):** OpenZeppelin’s `UUPSUpgradeable`.
- **Multi-Sig:** 2-of-3 using OpenZeppelin’s Multisig Module.
- **Reentrancy-Proof:** All fund-moving functions use `ReentrancyGuardUpgradeable`.
- **Access Control:** `AccessControlUpgradeable` for roles: buyer, seller (can be added post-deployment), agent, admin.
- **Flexible Role Initialization:** Escrow can be initialized with buyer and agent only; seller added later before funding closes. Roles mutable by multisig agreement until 'Funded' state.
- **ERC20 Payments:** Whitelisted stablecoins only (USDT, USDC, USDQ), via `SafeERC20Upgradeable`.
- **Event Logging:** Emits events for every deposit, approval, withdrawal, role change, upgrade, state transition, and hash update, all with indexed parameters.
- **Document Hashes:** Stores MOU/deed/supporting document hashes; hash updates are time-stamped and prior hashes retained for history.
- **Staged Deposits:** Supports EOI, initial deposit, and balance, each logged separately.
- **State Machine:** Each clone tracks its state: `Created`, `Funded`, `AwaitingDocuments`, `PendingRelease`, `Released`, `Cancelled`, `Expired`; all transitions emit indexed events.
- **Deadlines & Expiry:** Each escrow has a `deadline`. After expiry, agent or either party can trigger expiry/cancellation/refund (with event). Configurable timeout logic.
- **Emergency Pause/Unpause:** Pausable/unpausable by admin or factory multisig; funds always recoverable by rightful owners.
- **Upgradeable Logic:** Each clone can be upgraded independently if needed (UUPS, admin/multisig gated, optionally timelocked).
- **Public State Inspection:** Public view functions return escrow state, roles, deposit history, balances, deadlines, hashes, signers, and status/history.

### **B. Escrow Factory Contract**

- **ClonesUpgradeable:** OpenZeppelin’s minimal proxy library for new escrows.
- **Upgradeable:** Factory can be UUPS upgradeable if evolving business logic is needed.
- **Initialization:** Each escrow is initialized with buyer, agent, (optionally seller), property metadata, token type.
- **Registry & Indexing:** Indexed mapping/list of all escrows, queryable by user, property ID, status, or token. Paginated query functions.
- **Advanced Analytics:** Tracks total count, status breakdown, per-user, per-property, per-token analytics. All state-changing events indexed.
- **Enhanced Event Logging:** Emits `EscrowCreated`, `EscrowFunded`, `EscrowReleased`, `EscrowUpgraded`, `EscrowCancelled`, `EscrowExpired`, all with indexed params.
- **Admin Multisig:** Factory upgrades (and emergency pause/unpause) gated by Safe or multisig admin.
- **Transparency:** All escrows and actions queryable by on-chain view functions and public events.
- **Fee Module (Optional):** On release, protocol fee can be deducted to factory recipient (event emitted). Fee rate/recipient settable by multisig/admin.
- **Cross-Chain Compatible:** EVM-compatible, ready for L2 (e.g., Scroll) deployment.
- **Security:** Factory cannot access escrow funds.

---

## **2. Security and Auditability Enhancements**

- **Strict Access Control:** Only intended parties can trigger actions; admin cannot move funds. All role changes/approvals are indexed and time-stamped in event logs.
- **Multi-Sig Approval Logging:** Every signature includes signer's address and block timestamp in logs.
- **Event Emissions:** All critical actions/events have indexed parameters for easy off-chain indexing.
- **Whitelisted Tokens:** Only permitted ERC20 stablecoins for funding. Token list managed by multisig admin.
- **Upgradeable with Timelock:** (Optional) Upgrades are timelocked and publicly announced.
- **Audit Trail:** All staged actions, document hashes (full history), approvals are on-chain for post-facto audit.
- **Immutable Factory Reference:** Escrows store reference to their deploying factory.
- **Emergency Controls:** Both factory and escrows can be paused/unpaused in emergencies; funds remain withdrawable by rightful owners.

---

## **3. Efficiency and Transparency**

- **Minimal Gas Usage:** Minimal proxy (EIP-1167) for low-cost deployment.
- **Advanced Lookup & Analytics:** Efficient mappings to retrieve escrows by participant, property, token, or status. Analytics exposed as public views and indexed events.
- **Per-Escrow State Inspection:** Public view functions in each escrow for dashboarding/audit (full history, current state, approvals, deadlines, doc hashes, etc.).
- **Escrow Events:** Creation, funding, signature, release, expiry, cancellation, upgrades—all indexed for dashboards and analytics.
- **Upgradeable Analytics:** New analytics/events can be added via UUPS upgrade.
- **Document Hash Transparency:** All hash updates are logged and history kept for compliance/auditing.

---

## **4. Lifecycle (End-to-End Flow)**

**A. Escrow Creation**

- Factory deploys new minimal proxy with buyer, agent (optionally seller), token address, property metadata.

**B. Funding**

- Buyer funds in stages: EOI, deposit, balance. Each is logged.

**C. Off-Chain Docs**

- MOU, deed, etc. referenced by hash (on-chain, in escrow).

**D. Multi-Sig Release**

- Any party proposes release. 2 of 3 must sign.
- On threshold, escrow contract releases funds via `SafeERC20Upgradeable`.

**E. Expiry/Cancellation**

- If deadline passes before release, any party (or agent) can trigger expiry or cancellation (optional: refund logic).

**F. Completion/Upgrade**

- On completion, state set to `Released` or `Complete`; event emitted.
- Upgrades per instance as needed (UUPS, admin/multisig, optional timelock).

---

## **5. Specification Table**

| Feature              | Implementation Detail                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| UUPS Upgradeable     | `UUPSUpgradeable` (per proxy instance)                                       |
| Minimal Proxy        | `ClonesUpgradeable` (EIP-1167)                                               |
| Multi-Sig            | OpenZeppelin MultisigModule (2 of 3)                                         |
| Access Control       | `AccessControlUpgradeable`                                                   |
| ERC20 Payment        | `SafeERC20Upgradeable` with whitelisted token list                           |
| Reentrancy Guard     | `ReentrancyGuardUpgradeable`                                                 |
| Event Emission       | All state changes, deposits, releases, upgrades, cancellations               |
| Off-chain References | Hashes for MOUs, deeds, and supporting docs (with history)                   |
| Registry             | Indexed mapping/list of all escrows; advanced query functions                |
| Analytics            | Per-user, per-property, per-status counts/events                             |
| Transparency         | Public on-chain registry; all actions/events queryable                       |
| Security             | Factory cannot access escrow funds; strict role validation                   |
| Upgrade Control      | Only admin (multi-sig/Safe) can upgrade logic, optionally timelocked         |
| Expiry/Timeouts      | Deadlines per escrow; expiry/cancellation logic, all indexed in events       |
| Fee Module           | (Optional) Protocol fee module for sustainability, transparent and auditable |

---

## **6. Suggested Advanced Features**

- **Factory-level Admin Multisig:** All upgrades/pausing gated by Safe or admin multisig.
- **Escrow Expiry/Cancellation:** Logic for auto-expiry, cancellation, and (optional) dispute/refund handling.
- **Pausing:** Emergency pause/unpause at both factory and escrow level; funds recoverable by owners.
- **Fee Module:** (Optional) Factory/escrow can charge small protocol fee.
- **Cross-Chain Consideration:** EVM compatible, ready for L2 (e.g., Scroll) deployment.
- **Extensible for Future Upgrades:** Designed for additional modules (timelocks, pausing, analytics, fees).

---

# **Summary**

- Fully auditable, transparent, upgradeable escrow contracts per property deal.
- Cost-effective deployment and scalable registry.
- Full analytics and eventing for compliance, reporting, and user-facing dashboards.
- Robust security and efficiency, with modern Solidity standards (OpenZeppelin 5.x).

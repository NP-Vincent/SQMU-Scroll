### **Governance Contract Requirements**

1. **Token Management**

   - Mints governance token ID 0 from the ERC-1155 contract.
   - Distributes governance tokens to participants.
   - Allocates tokens to recipient wallets in a locked state according to agreed schedules.

2. **Sales & Distribution**

   - Sells governance token ID 0 to investors at a defined price (\$1 per token).
   - Handles payment logic (stablecoin USDC, USDT, USDQ).
   - Issues tokens with a defined lock schedule (e.g., cliff and linear unlock).

3. **Locking & Unlocking Management**

   - Tracks lock schedules for recipients (founder, team, advisors, investors).
   - Locks tokens fully for a cliff period, then unlocks linearly over a defined duration.
     - **Founder:** 2-month cliff, linear unlock over 15 months. Tokens Allocated: 150,000
     - **Team:** 2-month cliff, linear unlock over 10 months. Tokens Allocated: 100,000
     - **Public:** 2-month cliff, linear unlock over 7 months. Tokens Allocated: 350,000
     - **VC:** 2-month cliff, linear unlock over 15 months. Tokens Allocated: 150,000
     - **Treasury:** Locked until DAO formation and conversion to SQMU property ownership. Voting rights on these tokens are delegated to the founder at initiation and revert to DAO control upon formal DAO establishment. Tokens Allocated: 250,000
   - Prevents transfer or sale of locked tokens.
   - Allows voting and profit share rights for both locked and unlocked tokens from day 1.
   - **Forfeiture:** If a founder or team recipient departs before their tokens are unlocked, all locked tokens allocated to them are immediately forfeited and returned to the treasury. The forfeiture process is triggered upon confirmed departure by DAO or multisig authority.
   - Unlocked tokens can be freely transferred or sold by holders.

4. **Governance Voting**

   - Allows governance token holders (locked and unlocked balances) to propose and vote on decisions.
   - Calculates voting power based on total allocated governance tokens (ID 0), regardless of lock status.
   - Manages proposal lifecycle (creation, voting, execution).
   - Immediately revokes voting rights if tokens are forfeited before unlocking.

5. **Revenue Distribution**

   - Receives platform revenue from transaction fees.
   - Distributes revenue pro-rata to governance token holders (locked and unlocked tokens eligible).

6. **Access Control & Security**

   - Restricts sensitive actions (e.g., adjusting lock schedules, distribution) to the owner/multisig/DAO.
   - Emits events for all major actions (sales, locking, unlocking, voting, distribution).
   - Transparent tracking of all allocations and state.

7. **Metadata Integration**

   - References or fetches metadata for governance token (ID 0) to display unique image/logo in UI.

8. **Upgrade & Modularity**

   - Designed to be upgradeable or replaceable as governance needs evolve.
   - Does not interfere with base ERC-1155 contract logic.

---

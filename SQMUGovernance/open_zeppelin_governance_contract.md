### Core Modules & Libraries

| Feature Area               | OpenZeppelin Import(s)                       | Purpose                                                             |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| ERC‑1155 Interaction       | `IERC1155Upgradeable` & `ERC1155Upgradeable` | To mint or interact with governance token (ID 0)                    |
| Ownership & Access Control | `OwnableUpgradeable`                         | Owner-only functions: lock-schedule setup, forfeiture, distribution |
| Upgradeability             | `UUPSUpgradeable`                            | Support for proxy upgradeability                                    |
| Utility (Strings)          | `Strings`                                    | For metadata URI formatting                                         |

---

### Locking / Vesting Logic

| Feature Area                | OpenZeppelin Import                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Purpose                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Token Lockup Management     | Custom: built within governance contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Track locked/unlocked balances per address (not O‑Z native) |
| ERC‑20 Timelock (reference) | `TokenTimelock` / `VestingWallet` (ERC‑20 only) ([docs.openzeppelin.com](https://docs.openzeppelin.com/contracts/4.x/api/finance?utm_source=chatgpt.com), [OpenZeppelin Forum](https://forum.openzeppelin.com/t/erc1155-as-governance-token/38619?utm_source=chatgpt.com), [GitHub](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/governance/Governor.sol?utm_source=chatgpt.com), [docs.openzeppelin.com](https://docs.openzeppelin.com/contracts/4.x/governance?utm_source=chatgpt.com), [Ethereum Stack Exchange](https://ethereum.stackexchange.com/questions/114390/creating-a-multi-use-timelock-contract?utm_source=chatgpt.com), [GitHub](https://github.com/binodnp/openzeppelin-solidity/blob/master/docs/TokenVesting.md?utm_source=chatgpt.com), [GitHub](https://github.com/dmitri-ross/protocol-contracts?utm_source=chatgpt.com), [docs.openzeppelin.com](https://docs.openzeppelin.com/contracts/4.x/api/token/ERC20?utm_source=chatgpt.com)) | Useful reference, but not directly suited for ERC‑1155      |

*Note: OpenZeppelin doesn't currently offer an ERC‑1155-specific lockup contract. You'd need custom locking logic built atop the basic ERC‑1155 interface.*

---

### Governance Voting

| Feature Area         | OpenZeppelin Import(s)                                                                                                                                                                                                                           | Purpose                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Governance Framework | `Governor`, `GovernorSettings`, `GovernorVotes`, `GovernorVotesQuorumFraction`, `GovernorCountingSimple`, `GovernorTimelockControl` ([docs.openzeppelin.com](https://docs.openzeppelin.com/contracts/4.x/api/governance?utm_source=chatgpt.com)) | Modular on-chain governance using allocated voting power |
| Voting Token Support | `ERC20Votes` / `ERC721Votes` (but NOT ERC1155)                                                                                                                                                                                                   | Enables snapshot voting capability for sequential tokens |

⚠️ **Important**: Governor contracts assume an ERC‑20 or ERC‑721 voting token; native ERC‑1155 compatibility is not supported by default ([OpenZeppelin Forum](https://forum.openzeppelin.com/t/erc1155-as-governance-token/38619?utm_source=chatgpt.com)). If using ERC‑1155, you will need to wrap or adapt token ID 0 voting data into an `IVotes`-compatible interface for Governor compatibility.

---

### Profit (& Revenue) Distribution

| Feature Area      | OpenZeppelin Import                                                                                                                                                                    | Purpose                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Revenue Splitting | `PaymentSplitter` from `@openzeppelin/contracts/finance/PaymentSplitter.sol` ([docs.openzeppelin.com](https://docs.openzeppelin.com/contracts/4.x/api/finance?utm_source=chatgpt.com)) | Distributes income (ETH or ERC‑20 tokens) pro-rata based on share allocation |

You can treat governance tokens (ID 0) as "shares" for splitting revenue. Allocation should reflect both locked and unlocked balances per user.

---

### Summary of Suggested Imports

```solidity
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// For governance (on-chain decision-making)
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

// For profit-sharing logic
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
```

---

### How These Fit  Requirements

- **Lock/Unlock Logic & Control** → Built within your custom Governance contract using `OwnableUpgradeable`; tracks total allocated, locked, and unlocked balances.
- **Governance Voting** → Uses Governor modules, connected to a wrapper (or adapter) to read ID 0 balances (locked + unlocked total).
- **Revenue Distribution** → Leverage `PaymentSplitter` to distribute income among holders of ID 0, mapped to locked/unlocked voting shares.
- **Upgradeability & Ownership** → UUPS and Ownable give flexibility and secure control.

---

### Additional Notes

- OpenZeppelin’s **VestingWallet** and **TokenTimelock** modules operate for ERC‑20 tokens and help as references (not directly usable with ERC‑1155 government token) ([OpenZeppelin Forum](https://forum.openzeppelin.com/t/how-to-use-tokentimelock-sol-to-lock-up-tokens/738?utm_source=chatgpt.com), [docs.openzeppelin.com](https://docs.openzeppelin.com/contracts/4.x/api/finance?utm_source=chatgpt.com), [docs.openzeppelin.com](https://docs.openzeppelin.com/contracts/4.x/api/governance?utm_source=chatgpt.com)).
- For ERC‑1155 governance token support with OpenZeppelin governance system, you will likely create a small adapter contract to expose ID 0 balances via the `IVotes` interface expected by `GovernorVotes`. ERC1155VotesAdapter.sol now provides this function by returning each account's total allocated tokens (locked + unlocked) as votes.

---

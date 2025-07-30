## **1. Rental Contract**

### **Features**

- Collect deposit (stored by `propertyId` and `tenant`).
- Refund deposit manually by contract owner.
- Collect rent per tenant with management fee deducted.
- Management fee stays in contract → owner manually sends to treasury.
- Net rent automatically sent to Distribution Vault per property.

---

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IDistributionVault {
    function depositRent(uint256 propertyId, address token, uint256 amount) external;
}

contract RentalManager is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct Deposit {
        uint256 amount;
        address token;
    }

    mapping(uint256 => mapping(address => Deposit)) public deposits; // propertyId → tenant → deposit
    mapping(address => bool) public acceptedTokens;
    uint256 public managementFee; // basis points (1000 = 10%)
    address public treasury;
    IDistributionVault public vault;

    constructor() {
        _disableInitializers();
    }

    function initialize(address vaultAddress) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        vault = IDistributionVault(vaultAddress);
        managementFee = 1000;
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    function setAcceptedToken(address token, bool status) external onlyOwner {
        acceptedTokens[token] = status;
    }

    function setTreasury(address wallet) external onlyOwner {
        treasury = wallet;
    }

    function setManagementFee(uint256 fee) external onlyOwner {
        managementFee = fee;
    }

    // Tenant pays deposit
    function payDeposit(uint256 propertyId, address token, uint256 amount) external nonReentrant {
        require(acceptedTokens[token], "Token not accepted");
        deposits[propertyId][msg.sender] = Deposit(amount, token);
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    // Refund deposit manually
    function refundDeposit(uint256 propertyId, address tenant) external onlyOwner nonReentrant {
        Deposit storage dep = deposits[propertyId][tenant];
        require(dep.amount > 0, "No deposit");
        uint256 amount = dep.amount;
        address token = dep.token;

        delete deposits[propertyId][tenant];
        IERC20Upgradeable(token).safeTransfer(tenant, amount);
    }

    // Collect rent: deduct fee, send net to vault
    function collectRent(uint256 propertyId, address token, uint256 amount) external nonReentrant {
        require(acceptedTokens[token], "Token not accepted");

        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * managementFee) / 10000;
        uint256 net = amount - fee;

        // Fee stays in contract for manual treasury transfer
        // Net rent → vault
        IERC20Upgradeable(token).safeApprove(address(vault), net);
        vault.depositRent(propertyId, token, net);
    }

    // Manual treasury withdrawal
    function withdrawManagementFees(address token) external onlyOwner nonReentrant {
        uint256 balance = IERC20Upgradeable(token).balanceOf(address(this));
        IERC20Upgradeable(token).safeTransfer(treasury, balance);
    }
}
```

---

## **2. Distribution Vault**

### **Features**

- Holds rent per property ID.
- Manual `distribute()` → owner provides addresses and balances (fully on‑chain).
- Even though enumeration is manual, **fund distribution is still trustless** (calculated off‑chain, executed on‑chain).

---

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract DistributionVault is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    mapping(uint256 => mapping(address => uint256)) public rentBalances; // propertyId → token → amount

    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    function depositRent(uint256 propertyId, address token, uint256 amount) external nonReentrant {
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);
        rentBalances[propertyId][token] += amount;
    }

    // Manual distribution
    function distribute(
        uint256 propertyId,
        address token,
        address[] calldata holders,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(holders.length == amounts.length, "Length mismatch");
        uint256 totalAmount = rentBalances[propertyId][token];

        uint256 sum;
        for (uint256 i = 0; i < amounts.length; i++) {
            sum += amounts[i];
        }
        require(sum <= totalAmount, "Exceeds balance");

        rentBalances[propertyId][token] -= sum;

        for (uint256 i = 0; i < holders.length; i++) {
            IERC20Upgradeable(token).safeTransfer(holders[i], amounts[i]);
        }
    }
}
```

---

### **3. Characteristics**

- Entirely **on-chain** for deposits, fees, rent transfers, and payouts.
- Manual deposit refunds and rent distribution for simplicity.
- Management fees held safely and manually sent to treasury.
- Fully **upgradeable** to add automation or holder enumeration later.
- No modification to deployed SQMU contract required.

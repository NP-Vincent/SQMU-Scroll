// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC1155HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

interface ISQMURentDistribution {
    function depositRent(uint256 propertyId, address token, uint256 amount) external;
}

/// @title SQMU Rent Manager
/// @notice Collects deposits and rent for properties, forwarding net rent to the distribution vault.
/// @dev Upgradeable via UUPS and capable of holding ERC-20 stablecoins and ERC-1155 tokens.
contract SQMURent is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    ERC1155HolderUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct Deposit {
        uint256 amount;
        address token;
    }

    /// @notice Deposits per property and tenant.
    mapping(uint256 => mapping(address => Deposit)) public deposits;
    /// @notice Allowed ERC-20 stablecoins.
    mapping(address => bool) public acceptedTokens;

    uint256 public managementFee; // basis points (1000 = 10%)
    address public treasury;
    ISQMURentDistribution public vault;

    event DepositPaid(uint256 indexed propertyId, address indexed tenant, address token, uint256 amount);
    event DepositRefunded(uint256 indexed propertyId, address indexed tenant, address token, uint256 amount);
    event RentCollected(uint256 indexed propertyId, address indexed tenant, address token, uint256 amount, uint256 fee);
    event ManagementFeesWithdrawn(address indexed token, uint256 amount);
    event TokenAccepted(address token, bool status);
    event TreasurySet(address treasury);
    event ManagementFeeSet(uint256 fee);
    event NFTDeposited(address indexed from, address token, uint256 id, uint256 amount);
    event NFTWithdrawn(address indexed to, address token, uint256 id, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize contract with the distribution vault address.
    function initialize(address vaultAddress) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        vault = ISQMURentDistribution(vaultAddress);
        managementFee = 1000;
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    /// ------------------------------------------------------------
    /// Admin functions
    /// ------------------------------------------------------------

    /// @notice Allow or disallow an ERC-20 stablecoin.
    function setAcceptedToken(address token, bool status) external onlyOwner {
        acceptedTokens[token] = status;
        emit TokenAccepted(token, status);
    }

    /// @notice Set the treasury address for management fees.
    function setTreasury(address wallet) external onlyOwner {
        treasury = wallet;
        emit TreasurySet(wallet);
    }

    /// @notice Update the management fee in basis points.
    function setManagementFee(uint256 fee) external onlyOwner {
        managementFee = fee;
        emit ManagementFeeSet(fee);
    }

    /// ------------------------------------------------------------
    /// Deposit and rent logic
    /// ------------------------------------------------------------

    /// @notice Tenant pays a refundable deposit in an accepted stablecoin.
    function payDeposit(uint256 propertyId, address token, uint256 amount) external nonReentrant {
        require(acceptedTokens[token], "Token not accepted");
        deposits[propertyId][msg.sender] = Deposit(amount, token);
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);
        emit DepositPaid(propertyId, msg.sender, token, amount);
    }

    /// @notice Owner refunds a tenant deposit.
    function refundDeposit(uint256 propertyId, address tenant) external onlyOwner nonReentrant {
        Deposit storage dep = deposits[propertyId][tenant];
        require(dep.amount > 0, "No deposit");
        uint256 amount = dep.amount;
        address token = dep.token;
        delete deposits[propertyId][tenant];
        IERC20Upgradeable(token).safeTransfer(tenant, amount);
        emit DepositRefunded(propertyId, tenant, token, amount);
    }

    /// @notice Collect rent from a tenant and forward the net amount to the vault.
    function collectRent(uint256 propertyId, address token, uint256 amount) external nonReentrant {
        require(acceptedTokens[token], "Token not accepted");
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * managementFee) / 10000;
        uint256 net = amount - fee;

        IERC20Upgradeable(token).safeApprove(address(vault), net);
        vault.depositRent(propertyId, token, net);

        emit RentCollected(propertyId, msg.sender, token, amount, fee);
    }

    /// @notice Withdraw accumulated management fees to the treasury.
    function withdrawManagementFees(address token) external onlyOwner nonReentrant {
        uint256 balance = IERC20Upgradeable(token).balanceOf(address(this));
        IERC20Upgradeable(token).safeTransfer(treasury, balance);
        emit ManagementFeesWithdrawn(token, balance);
    }

    /// ------------------------------------------------------------
    /// ERC-1155 handling
    /// ------------------------------------------------------------

    /// @notice Deposit an ERC-1155 token into the contract.
    function depositNFT(address token, uint256 id, uint256 amount, bytes calldata data) external {
        IERC1155Upgradeable(token).safeTransferFrom(msg.sender, address(this), id, amount, data);
        emit NFTDeposited(msg.sender, token, id, amount);
    }

    /// @notice Owner can withdraw ERC-1155 tokens held by this contract.
    function withdrawNFT(address token, uint256 id, uint256 amount, address to) external onlyOwner {
        IERC1155Upgradeable(token).safeTransferFrom(address(this), to, id, amount, "");
        emit NFTWithdrawn(to, token, id, amount);
    }
}


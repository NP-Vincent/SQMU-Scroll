// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

/// @title SQMU Crowdfund Contract
/// @notice Accepts stablecoins and mints governance tokens (ID 0) from an ERC-1155 SQMU contract.
/// @dev Upgradeable via UUPS pattern. Uses Ownable for admin controls.
contract SQMUCrowdfund is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    /// ---------------------------------------------------------------------
    /// Storage
    /// ---------------------------------------------------------------------

    IERC1155Upgradeable public sqmu;

    /// @dev Accepted stablecoin addresses on Scroll mainnet.
    address public constant USDT = 0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df;
    address public constant USDC = 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4;
    address public constant USDQ = 0xdb9E8F82D6d45fFf803161F2a5f75543972B229a;

    uint256 public constant GOVERNANCE_ID = 0;

    event GovernancePurchased(address indexed buyer, address token, uint256 amount, uint256 totalPaid);
    event AdminMint(address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address sqmuAddress) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        sqmu = IERC1155Upgradeable(sqmuAddress);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// ---------------------------------------------------------------------
    /// Crowdfund Logic
    /// ---------------------------------------------------------------------

    /// @notice Purchase governance tokens by paying with a supported stablecoin.
    /// @param paymentToken Address of USDC, USDT or USDQ on Scroll.
    /// @param amount Number of governance tokens to buy.
    function buy(address paymentToken, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount required");
        require(
            paymentToken == USDC || paymentToken == USDT || paymentToken == USDQ,
            "Token not allowed"
        );

        IERC20Upgradeable erc20 = IERC20Upgradeable(paymentToken);
        uint8 decimals = IERC20MetadataUpgradeable(paymentToken).decimals();
        uint256 total = amount * (10 ** decimals); // $1 per token

        require(erc20.transferFrom(msg.sender, address(this), total), "Payment failed");

        sqmu.mint(msg.sender, GOVERNANCE_ID, amount, "");

        emit GovernancePurchased(msg.sender, paymentToken, amount, total);
    }

    /// @notice Mint governance tokens to any address without payment.
    /// @param to Recipient address.
    /// @param amount Amount of governance tokens to mint.
    function adminMint(address to, uint256 amount) external onlyOwner {
        sqmu.mint(to, GOVERNANCE_ID, amount, "");
        emit AdminMint(to, amount);
    }
}

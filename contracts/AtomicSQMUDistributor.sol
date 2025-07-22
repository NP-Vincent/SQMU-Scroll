// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

contract AtomicSQMUDistributor is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    struct Property {
        string name;
        address tokenAddress;
        uint256 tokenId;
        address treasury;
        uint256 priceUSD; // e.g., 1 SQMU = 100e18 for $100.00 (18 decimals)
        bool active;
    }

    struct Agent {
        string name;
        address wallet;
        bool registered;
    }

    // Storage
    mapping(string => Property) private properties;      // propertyCode => Property
    mapping(string => Agent) private agents;             // agentCode => Agent
    mapping(address => bool) private allowedPaymentToken; // ERC-20 address => isAllowed

    uint256 public globalCommissionBps; // e.g., 300 = 3%
    address[] public paymentTokens;     // for external display

    // Events
    event Sale(
        string propertyCode,
        address indexed buyer,
        address paymentToken,
        uint256 totalPaid,
        uint256 sqmuAmount,
        string agentCode,
        address indexed agent,
        uint256 commission
    );
    event PropertyRegistered(string propertyCode, string name, address tokenAddress, uint256 tokenId, address treasury, uint256 priceUSD, bool active);
    event AgentRegistered(string agentCode, string name, address wallet);
    event CommissionChanged(uint256 newCommissionBps);
    event PaymentTokenChanged(address token, bool allowed);
    /// @notice Emitted when a property's active status is changed.
    event PropertyStatusChanged(string propertyCode, bool active);
    event ManualDistribution(string propertyCode, address buyer, uint256 sqmuAmount, string agentCode);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // UUPS required function
    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    function initialize(uint256 commissionBps) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        globalCommissionBps = commissionBps;
    }

    // ------------- Admin Functions -------------
    function registerProperty(
        string calldata propertyCode,
        string calldata name,
        address tokenAddress,
        uint256 tokenId,
        address treasury,
        uint256 priceUSD,
        bool active
    ) external onlyOwner {
        properties[propertyCode] = Property(name, tokenAddress, tokenId, treasury, priceUSD, active);
        emit PropertyRegistered(propertyCode, name, tokenAddress, tokenId, treasury, priceUSD, active);
    }

    function setPropertyStatus(string calldata propertyCode, bool active) external onlyOwner {
        properties[propertyCode].active = active;
        emit PropertyStatusChanged(propertyCode, active);
    }

    function registerAgent(
        string calldata agentCode,
        string calldata name,
        address wallet
    ) external onlyOwner {
        agents[agentCode] = Agent(name, wallet, true);
        emit AgentRegistered(agentCode, name, wallet);
    }

    function setGlobalCommission(uint256 commissionBps) external onlyOwner {
        globalCommissionBps = commissionBps;
        emit CommissionChanged(commissionBps);
    }

    function allowPaymentToken(address token, bool allowed) external onlyOwner {
        allowedPaymentToken[token] = allowed;
        // maintain an array for UI display, add if new
        bool found = false;
        for (uint256 i = 0; i < paymentTokens.length; i++) {
            if (paymentTokens[i] == token) {
                found = true;
                break;
            }
        }
        if (!found && allowed) paymentTokens.push(token);
        emit PaymentTokenChanged(token, allowed);
    }

    // ------------- Main Atomic Purchase -------------

    function buySQMU(
        string calldata propertyCode,
        uint256 sqmuAmount,
        address paymentToken,
        string calldata agentCode
    ) external nonReentrant {
        // --- Checks ---
        Property storage prop = properties[propertyCode];
        require(prop.tokenAddress != address(0), "Property not found");
        require(prop.active, "Property inactive");
        require(allowedPaymentToken[paymentToken], "Token not allowed");
        require(sqmuAmount > 0, "Amount required");

        // --- Price and Commission ---
        uint8 tokenDecimals = IERC20MetadataUpgradeable(paymentToken).decimals();
        uint256 totalPrice =
            (prop.priceUSD * sqmuAmount / 1e18) * (10 ** tokenDecimals) / 1e18;
        require(totalPrice > 0, "Zero price");

        // --- Collect Payment ---
        // Buyer must approve contract for totalPrice first
        IERC20Upgradeable erc20 = IERC20Upgradeable(paymentToken);
        require(
            erc20.transferFrom(msg.sender, address(this), totalPrice),
            "ERC20 transfer failed"
        );

        // --- Commission ---
        uint256 commission = 0;
        address agentWallet = address(0);
        if (
            bytes(agentCode).length > 0 &&
            agents[agentCode].registered &&
            agents[agentCode].wallet != address(0)
        ) {
            commission = (totalPrice * globalCommissionBps) / 10000;
            agentWallet = agents[agentCode].wallet;
            if (commission > 0) {
                require(
                    erc20.transfer(agentWallet, commission),
                    "Agent payout failed"
                );
            }
        }

        // --- Treasury Payout ---
        uint256 remainder = totalPrice - commission;
        require(
            erc20.transfer(prop.treasury, remainder),
            "Treasury payout failed"
        );

        // --- SQMU Delivery ---
        IERC1155Upgradeable sqmu = IERC1155Upgradeable(prop.tokenAddress);
        // Treasury must setApprovalForAll to this contract before use
        sqmu.safeTransferFrom(prop.treasury, msg.sender, prop.tokenId, sqmuAmount, "");

        emit Sale(
            propertyCode,
            msg.sender,
            paymentToken,
            totalPrice,
            sqmuAmount,
            agentCode,
            agentWallet,
            commission
        );
    }

    // ------------- Manual/Admin Backstop -------------

    function manualDistribute(
        string calldata propertyCode,
        address buyer,
        uint256 sqmuAmount,
        string calldata agentCode
    ) external onlyOwner nonReentrant {
        Property storage prop = properties[propertyCode];
        require(prop.tokenAddress != address(0), "Property not found");
        IERC1155Upgradeable sqmu = IERC1155Upgradeable(prop.tokenAddress);
        sqmu.safeTransferFrom(prop.treasury, buyer, prop.tokenId, sqmuAmount, "");
        emit ManualDistribution(propertyCode, buyer, sqmuAmount, agentCode);
    }

    // ------------- Getter/Utility Functions -------------

    function getPropertyInfo(string calldata propertyCode)
        external
        view
        returns (Property memory)
    {
        return properties[propertyCode];
    }

    function getAgentInfo(string calldata agentCode)
        external
        view
        returns (Agent memory)
    {
        return agents[agentCode];
    }

    function isAllowedToken(address token) external view returns (bool) {
        return allowedPaymentToken[token];
    }

    function getPrice(string calldata propertyCode, uint256 sqmuAmount) external view returns (uint256) {
        Property storage prop = properties[propertyCode];
        require(prop.tokenAddress != address(0), "Property not found");
        return prop.priceUSD * sqmuAmount / 1e18;
    }

    function getPropertyStatus(string calldata propertyCode) external view returns (bool) {
        return properties[propertyCode].active;
    }

    function getPaymentTokens() external view returns (address[] memory) {
        return paymentTokens;
    }
}

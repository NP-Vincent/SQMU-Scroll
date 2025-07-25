// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/// @title SQMU ERC-1155 On-Chain Trade Contract
/// @notice Marketplace for escrowed SQMU listings and purchases
/// @dev Implements listing, buying and cancelling with commission payouts. Upgradeable via UUPS.
contract SQMUTrade is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable, ERC1155Holder {
    struct Listing {
        uint256 listingId;
        address seller;
        string propertyCode;
        address tokenAddress;
        uint256 tokenId;
        uint256 amountListed;
        uint256 pricePerToken;
        address paymentToken;
        bool active;
    }

    mapping(uint256 => Listing) private listings;
    uint256 private nextListingId;

    mapping(address => bool) private allowedPaymentToken;
    address[] public paymentTokens;

    uint256 public commissionBps;
    address public treasury;

    event ListingCreated(
        uint256 listingId,
        address indexed seller,
        string propertyCode,
        address tokenAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerToken,
        address paymentToken
    );
    event Purchase(
        uint256 listingId,
        address indexed buyer,
        uint256 amount,
        uint256 totalPaid,
        uint256 commission,
        address paymentToken
    );
    event ListingCancelled(uint256 listingId, address indexed seller);
    event CommissionUpdated(uint256 bps);
    event PaymentTokenAllowed(address token, bool allowed);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address treasury_, uint256 commissionBps_) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        treasury = treasury_;
        commissionBps = commissionBps_;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ----------- Public Functions -----------

    function listToken(
        string memory propertyCode,
        address tokenAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerToken,
        address paymentToken
    ) external nonReentrant {
        require(allowedPaymentToken[paymentToken], "Token not allowed");
        require(amount > 0, "Amount required");
        require(pricePerToken > 0, "Price required");

        IERC1155Upgradeable(tokenAddress).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        uint256 id = ++nextListingId;
        listings[id] = Listing({
            listingId: id,
            seller: msg.sender,
            propertyCode: propertyCode,
            tokenAddress: tokenAddress,
            tokenId: tokenId,
            amountListed: amount,
            pricePerToken: pricePerToken,
            paymentToken: paymentToken,
            active: true
        });

        emit ListingCreated(id, msg.sender, propertyCode, tokenAddress, tokenId, amount, pricePerToken, paymentToken);
    }

    function buy(uint256 listingId, uint256 amount) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing inactive");
        require(amount > 0 && amount <= listing.amountListed, "Invalid amount");

        uint256 totalPrice = listing.pricePerToken * amount;
        uint256 commission = (totalPrice * commissionBps) / 10000;
        IERC20Upgradeable erc20 = IERC20Upgradeable(listing.paymentToken);

        require(erc20.transferFrom(msg.sender, address(this), totalPrice), "Payment failed");
        if (commission > 0) {
            require(erc20.transfer(treasury, commission), "Commission failed");
        }
        require(erc20.transfer(listing.seller, totalPrice - commission), "Seller payout failed");

        IERC1155Upgradeable(listing.tokenAddress).safeTransferFrom(address(this), msg.sender, listing.tokenId, amount, "");

        listing.amountListed -= amount;
        if (listing.amountListed == 0) {
            listing.active = false;
        }

        emit Purchase(listingId, msg.sender, amount, totalPrice, commission, listing.paymentToken);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing inactive");
        require(listing.seller == msg.sender, "Not seller");

        listing.active = false;
        uint256 remaining = listing.amountListed;
        listing.amountListed = 0;
        IERC1155Upgradeable(listing.tokenAddress).safeTransferFrom(address(this), listing.seller, listing.tokenId, remaining, "");

        emit ListingCancelled(listingId, listing.seller);
    }

    // ----------- Admin Functions -----------

    function setCommission(uint256 bps) external onlyOwner {
        commissionBps = bps;
        emit CommissionUpdated(bps);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }

    function allowPaymentToken(address token, bool allowed) external onlyOwner {
        allowedPaymentToken[token] = allowed;
        bool found = false;
        for (uint256 i = 0; i < paymentTokens.length; i++) {
            if (paymentTokens[i] == token) {
                found = true;
                break;
            }
        }
        if (!found && allowed) {
            paymentTokens.push(token);
        }
        emit PaymentTokenAllowed(token, allowed);
    }

    // ----------- Views -----------

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getActiveListings() external view returns (Listing[] memory) {
        uint256 count = nextListingId;
        uint256 activeCount;
        for (uint256 i = 1; i <= count; i++) {
            if (listings[i].active) {
                activeCount++;
            }
        }
        Listing[] memory result = new Listing[](activeCount);
        uint256 index;
        for (uint256 i = 1; i <= count; i++) {
            if (listings[i].active) {
                result[index] = listings[i];
                index++;
            }
        }
        return result;
    }

    function isAllowedToken(address token) external view returns (bool) {
        return allowedPaymentToken[token];
    }
}


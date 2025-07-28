// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {SQMUVesting} from "https://np-vincent.github.io/SQMU-Scroll/contracts/SQMUGovernance/SQMUVesting.sol";

/// @title SQMUSale
/// @notice Handles payment collection and allocation of locked governance tokens.
contract SQMUSale is SQMUVesting {
    uint256 public tokenPriceUSD; // USD price with 18 decimals

    address public usdc;
    address public usdt;
    address public usdq;

    event GovernancePurchased(address indexed buyer, uint256 amount, address paymentToken);

    function __SQMUSale_init(
        uint256 priceUSD,
        address usdcAddr,
        address usdtAddr,
        address usdqAddr
    ) internal onlyInitializing {
        __SQMUVesting_init();
        tokenPriceUSD = priceUSD;
        usdc = usdcAddr;
        usdt = usdtAddr;
        usdq = usdqAddr;
    }

    function buyGovernance(uint256 amount, address paymentToken) external {
        require(
            paymentToken == usdc || paymentToken == usdt || paymentToken == usdq,
            "invalid token"
        );
        require(amount > 0, "amount");
        uint8 decimals = IERC20Metadata(paymentToken).decimals();
        uint256 totalPrice = (tokenPriceUSD * amount * (10 ** decimals)) / 1e18;
        IERC20 erc20 = IERC20(paymentToken);
        require(
            erc20.transferFrom(msg.sender, address(this), totalPrice),
            "payment failed"
        );
        LockInfo storage info = locks[msg.sender];
        if (info.totalAllocated == 0) {
            _allocate(msg.sender, amount, 2 weeks, 7 weeks);
        } else {
            info.totalAllocated += amount;
            totalAllocatedTokens += amount;
        }
        emit GovernancePurchased(msg.sender, amount, paymentToken);
    }
}

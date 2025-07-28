// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SQMUVesting} from "https://np-vincent.github.io/SQMU-Scroll/contracts/SQMUGovernance/SQMUVesting.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/// @title SQMUPaymentSplitter
/// @notice Distributes ETH and ERC-20 revenue to governance token holders.
contract SQMUPaymentSplitter is SQMUVesting {
    uint256 public totalEthReleased;
    mapping(address => uint256) public ethReleased;
    mapping(address => uint256) public erc20TotalReleased;
    mapping(address => mapping(address => uint256)) public erc20Released;

    event RevenueClaimed(address indexed account, address indexed token, uint256 amount);
    event RevenueReceived(address indexed from, uint256 amount, address indexed token);

    receive() external payable {
        if (msg.value > 0) {
            emit RevenueReceived(msg.sender, msg.value, address(0));
        }
    }

    function pendingRevenue(address account, address token) public view returns (uint256) {
        LockInfo storage info = locks[account];
        if (info.forfeited || info.totalAllocated == 0) {
            return 0;
        }
        uint256 totalReceived;
        uint256 released;
        if (token == address(0)) {
            totalReceived = address(this).balance + totalEthReleased;
            released = ethReleased[account];
        } else {
            IERC20 erc20 = IERC20(token);
            totalReceived = erc20.balanceOf(address(this)) + erc20TotalReleased[token];
            released = erc20Released[token][account];
        }
        return (totalReceived * info.totalAllocated) / totalAllocatedTokens - released;
    }

    function claimRevenue(address token) external {
        uint256 payment = pendingRevenue(msg.sender, token);
        require(payment > 0, "none");
        if (token == address(0)) {
            ethReleased[msg.sender] += payment;
            totalEthReleased += payment;
            Address.sendValue(payable(msg.sender), payment);
        } else {
            erc20Released[token][msg.sender] += payment;
            erc20TotalReleased[token] += payment;
            IERC20(token).transfer(msg.sender, payment);
        }
        emit RevenueClaimed(msg.sender, token, payment);
    }
}

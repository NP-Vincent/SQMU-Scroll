// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SQMUGovernanceBase} from "https://np-vincent.github.io/SQMU-Scroll/contracts/SQMUGovernance/SQMUGovernanceBase.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

/// @title SQMUVesting
/// @notice Manages vesting schedules and token claims.
contract SQMUVesting is SQMUGovernanceBase {
    mapping(address => LockInfo) public locks;
    uint256 public totalAllocatedTokens;

    event TokensClaimed(address indexed account, uint256 amount);
    event TokensForfeited(address indexed account, uint256 amount);

    function __SQMUVesting_init() internal onlyInitializing {}

    function _allocate(address account, uint256 amount, uint64 cliff, uint64 duration) internal {
        locks[account] = LockInfo({
            totalAllocated: amount,
            claimed: 0,
            startTime: uint64(block.timestamp),
            cliff: cliff,
            duration: duration,
            forfeited: false
        });
        totalAllocatedTokens += amount;
    }

    function claimUnlockedTokens() external {
        LockInfo storage info = locks[msg.sender];
        require(!info.forfeited, "forfeited");
        uint256 unlocked;
        if (block.timestamp < info.startTime + info.cliff) {
            unlocked = 0;
        } else if (info.duration == 0) {
            unlocked = info.totalAllocated;
        } else {
            uint256 elapsed = block.timestamp - info.startTime - info.cliff;
            if (elapsed > info.duration) {
                elapsed = info.duration;
            }
            unlocked = (info.totalAllocated * elapsed) / info.duration;
        }
        uint256 claimable = unlocked - info.claimed;
        require(claimable > 0, "none");
        info.claimed += claimable;
        sqmuToken.safeTransferFrom(address(this), msg.sender, GOVERNANCE_ID, claimable, "");
        emit TokensClaimed(msg.sender, claimable);
    }

    function adminForfeit(address account) external onlyOwner {
        LockInfo storage info = locks[account];
        require(!info.forfeited, "already");
        uint256 remaining = info.totalAllocated - info.claimed;
        info.forfeited = true;
        locks[owner()].totalAllocated += remaining;
        emit TokensForfeited(account, remaining);
    }
}

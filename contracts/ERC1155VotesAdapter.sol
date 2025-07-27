// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/**
 * @title ERC1155VotesAdapter
 * @notice Exposes voting power for SQMU governance using IVotes.
 * @dev Voting weight equals total allocated governance tokens (locked and unlocked).
 */
interface ISQMUGovernance {
    struct LockInfo {
        uint256 totalAllocated;
        uint256 claimed;
        uint64 startTime;
        uint64 cliff;
        uint64 duration;
        bool forfeited;
    }

    function locks(address account) external view returns (LockInfo memory);
}

contract ERC1155VotesAdapter is IVotes {
    ISQMUGovernance public immutable governance;

    constructor(ISQMUGovernance governance_) {
        governance = governance_;
    }

    function delegates(address) public view override returns (address) {
        return address(0);
    }

    function delegate(address) public override {}

    function delegateBySig(
        address,
        uint256,
        uint256,
        uint8,
        bytes32,
        bytes32
    ) public override {}

    function getVotes(address account) public view override returns (uint256) {
        ISQMUGovernance.LockInfo memory info = governance.locks(account);
        if (info.forfeited) {
            return 0;
        }
        return info.totalAllocated;
    }

    function getPastVotes(address account, uint256) public view override returns (uint256) {
        return getVotes(account);
    }

    function getPastTotalSupply(uint256) public pure override returns (uint256) {
        // Fixed governance supply minted in SQMUGovernance
        return 1_000_000;
    }
}

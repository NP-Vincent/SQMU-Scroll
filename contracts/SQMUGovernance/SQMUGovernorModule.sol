// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SQMUVesting} from "./SQMUVesting.sol";
import {GovernorUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import {GovernorSettingsUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import {GovernorVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import {GovernorVotesQuorumFractionUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import {GovernorCountingSimpleUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import {GovernorTimelockControlUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {ERC1155VotesAdapter, ISQMUGovernance} from "https://np-vincent.github.io/SQMU-Scroll/contracts/ERC1155VotesAdapter.sol";

/// @title SQMUGovernorModule
/// @notice Core governance logic and proposal management.
contract SQMUGovernorModule is
    SQMUVesting,
    GovernorUpgradeable,
    GovernorSettingsUpgradeable,
    GovernorVotesUpgradeable,
    GovernorVotesQuorumFractionUpgradeable,
    GovernorCountingSimpleUpgradeable,
    GovernorTimelockControlUpgradeable
{
    function __SQMUGovernorModule_init(address timelockAddr) internal onlyInitializing {
        __SQMUVesting_init();
        __Governor_init("SQMUGovernance");
        __GovernorSettings_init(1, 45818, 0);
        __GovernorVotes_init(new ERC1155VotesAdapter(ISQMUGovernance(address(this))));
        __GovernorVotesQuorumFraction_init(4);
        __GovernorCountingSimple_init();
        __GovernorTimelockControl_init(TimelockControllerUpgradeable(payable(timelockAddr)));
    }

    // Governor overrides
    function votingDelay() public pure override(GovernorUpgradeable, GovernorSettingsUpgradeable) returns (uint256) {
        return 1;
    }

    function votingPeriod() public pure override(GovernorUpgradeable, GovernorSettingsUpgradeable) returns (uint256) {
        return 45818;
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(GovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function proposalThreshold()
        public
        view
        override(GovernorUpgradeable, GovernorSettingsUpgradeable)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function getVotes(address account, uint256) public view override returns (uint256) {
        LockInfo storage info = locks[account];
        if (info.forfeited) {
            return 0;
        }
        return info.totalAllocated;
    }

    function state(uint256 proposalId)
        public
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(GovernorUpgradeable) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(GovernorUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

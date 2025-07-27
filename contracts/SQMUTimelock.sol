// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

/// @title SQMUTimelock
/// @notice Upgradeable timelock controller for SQMU governance.
/// @dev Extends OpenZeppelin TimelockController with UUPS upgradeability.
contract SQMUTimelock is Initializable, OwnableUpgradeable, UUPSUpgradeable, TimelockControllerUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the timelock controller.
    /// @param minDelay Minimum delay for queued operations.
    /// @param proposers Addresses allowed to propose operations.
    /// @param executors Addresses allowed to execute operations.
    function initialize(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __TimelockController_init(minDelay, proposers, executors, msg.sender);
    }

    /// @dev UUPS upgrade authorization hook restricted to the owner.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}


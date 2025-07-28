// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

import {SQMU} from "../SQMU.sol";

/// @title SQMUGovernanceBase
/// @notice Shared storage for the SQMU governance modules.
abstract contract SQMUGovernanceBase is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    struct LockInfo {
        uint256 totalAllocated;
        uint256 claimed;
        uint64 startTime;
        uint64 cliff;
        uint64 duration;
        bool forfeited;
    }

    ERC1155Upgradeable public sqmuToken;
    uint256 public constant GOVERNANCE_ID = 0;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function __SQMUGovernanceBase_init(address sqmuAddress) internal onlyInitializing {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        sqmuToken = ERC1155Upgradeable(sqmuAddress);
        SQMU(sqmuAddress).mint(address(this), GOVERNANCE_ID, 1_000_000, "");
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

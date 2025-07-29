// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SQMUGovernanceBase} from "https://np-vincent.github.io/SQMU-Scroll/contracts/SQMUGovernance/SQMUGovernanceBase.sol";
import {SQMUSale} from "https://np-vincent.github.io/SQMU-Scroll/contracts/SQMUGovernance/SQMUSale.sol";

/// @custom:oz-upgrades-unsafe-allow delegatecall

/// @title SQMUGovernance
/// @notice Top level contract composing all governance modules.
contract SQMUGovernance is SQMUGovernanceBase, SQMUSale {

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address sqmuAddress,
        uint256 priceUSD,
        address usdcAddr,
        address usdtAddr,
        address usdqAddr
    ) public initializer {
        __SQMUGovernanceBase_init(sqmuAddress);
        __SQMUSale_init(priceUSD, usdcAddr, usdtAddr, usdqAddr);
    }


    /// @dev Authorize contract upgrades through the owner only.
    function _authorizeUpgrade(address newImplementation)
        internal
        override(SQMUGovernanceBase)
        onlyOwner
    {
        super._authorizeUpgrade(newImplementation);
    }
}

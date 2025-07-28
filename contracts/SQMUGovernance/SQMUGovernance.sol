// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SQMUGovernanceBase} from "https://np-vincent.github.io/SQMU-Scroll/contracts/SQMUGovernance/SQMUGovernanceBase.sol";
import {SQMUSale} from "https://np-vincent.github.io/SQMU-Scroll/contracts/SQMUGovernance/SQMUSale.sol";
import {SQMUPaymentSplitter} from "https://np-vincent.github.io/SQMU-Scroll/contracts/SQMUGovernance/SQMUPaymentSplitter.sol";
import {SQMUGovernorModule} from "https://np-vincent.github.io/SQMU-Scroll/contracts/SQMUGovernance/SQMUGovernorModule.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title SQMUGovernance
/// @notice Top level contract composing all governance modules.
contract SQMUGovernance is SQMUGovernanceBase, SQMUSale, SQMUPaymentSplitter, SQMUGovernorModule {
    address public founder;
    address public team;
    address public vc;
    address public publicSale;
    address public treasury;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address sqmuAddress,
        uint256 priceUSD,
        address founderAddr,
        address teamAddr,
        address vcAddr,
        address publicSaleAddr,
        address treasuryAddr,
        address usdcAddr,
        address usdtAddr,
        address usdqAddr,
        address timelockAddr
    ) public initializer {
        __SQMUGovernanceBase_init(sqmuAddress);
        __SQMUSale_init(priceUSD, usdcAddr, usdtAddr, usdqAddr);
        __SQMUPaymentSplitter_init();
        __SQMUGovernorModule_init(timelockAddr);

        founder = founderAddr;
        team = teamAddr;
        vc = vcAddr;
        publicSale = publicSaleAddr;
        treasury = treasuryAddr;

        _allocate(founderAddr, 150_000, 2 weeks, 15 weeks);
        _allocate(teamAddr, 100_000, 2 weeks, 10 weeks);
        _allocate(publicSaleAddr, 350_000, 2 weeks, 7 weeks);
        _allocate(vcAddr, 150_000, 2 weeks, 15 weeks);
        _allocate(treasuryAddr, 250_000, 52 weeks, 0);
    }

    function __SQMUPaymentSplitter_init() internal onlyInitializing {
        // reuse vesting storage
        __SQMUVesting_init();
    }

    function governanceURI() public view returns (string memory) {
        string memory base = sqmuToken.uri(GOVERNANCE_ID);
        bytes memory b = bytes(base);
        for (uint256 i = 0; i + 3 < b.length; ++i) {
            if (b[i] == '{' && b[i + 1] == 'i' && b[i + 2] == 'd' && b[i + 3] == '}') {
                bytes memory prefix = new bytes(i);
                for (uint256 j; j < i; ++j) {
                    prefix[j] = b[j];
                }
                bytes memory suffix = new bytes(b.length - i - 4);
                for (uint256 j; j < suffix.length; ++j) {
                    suffix[j] = b[i + 4 + j];
                }
                return string(abi.encodePacked(prefix, Strings.toHexString(GOVERNANCE_ID, 32), suffix));
            }
        }
        return string(abi.encodePacked(base, Strings.toString(GOVERNANCE_ID), ".json"));
    }
}

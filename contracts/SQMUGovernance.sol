// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {PaymentSplitter} from "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import {ERC1155VotesAdapter} from "./ERC1155VotesAdapter.sol";

import {SQMU} from "./SQMU.sol";

/// @title SQMUGovernance
/// @notice Governance and revenue sharing for SQMU ecosystem.
/// @dev Skeleton contract implementing token allocation, sales and voting logic.
contract SQMUGovernance is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    Governor,
    GovernorSettings,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorCountingSimple,
    GovernorTimelockControl,
    PaymentSplitter
{
    struct LockInfo {
        uint256 totalAllocated;
        uint256 claimed;
        uint64 startTime;
        uint64 cliff;
        uint64 duration;
        bool forfeited;
    }

    IERC1155Upgradeable public sqmuToken;
    uint256 public constant GOVERNANCE_ID = 0;

    uint256 public tokenPriceUSD; // USD price with 18 decimals

    address public founder;
    address public team;
    address public vc;
    address public publicSale;
    address public treasury;

    address public usdc;
    address public usdt;
    address public usdq;

    mapping(address => LockInfo) public locks;

    event GovernancePurchased(address indexed buyer, uint256 amount, address paymentToken);
    event TokensClaimed(address indexed account, uint256 amount);
    event TokensForfeited(address indexed account, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

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
        address[] memory payees,
        uint256[] memory shares_
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __Governor_init("SQMUGovernance");
        __GovernorSettings_init(1 /* voting delay */, 45818 /* voting period */, 0);
        __GovernorVotes_init(new ERC1155VotesAdapter(ISQMUGovernance(address(this))));
        __GovernorVotesQuorumFraction_init(4);
        __GovernorCountingSimple_init();
        __GovernorTimelockControl_init(TimelockController(payable(address(0))));
        PaymentSplitter(payees, shares_);

        sqmuToken = IERC1155Upgradeable(sqmuAddress);
        tokenPriceUSD = priceUSD;
        founder = founderAddr;
        team = teamAddr;
        vc = vcAddr;
        publicSale = publicSaleAddr;
        treasury = treasuryAddr;
        usdc = usdcAddr;
        usdt = usdtAddr;
        usdq = usdqAddr;

        // Mint governance token supply to this contract
        SQMU(sqmuAddress).mint(address(this), GOVERNANCE_ID, 1_000_000, "");

        // Set up initial allocations (example schedule)
        _allocate(founderAddr, 150_000, 2 weeks, 15 weeks);
        _allocate(teamAddr, 100_000, 2 weeks, 10 weeks);
        _allocate(publicSaleAddr, 350_000, 2 weeks, 7 weeks);
        _allocate(vcAddr, 150_000, 2 weeks, 15 weeks);
        _allocate(treasuryAddr, 250_000, 52 weeks, 0); // treasury locked until DAO
    }

    function _allocate(address account, uint256 amount, uint64 cliff, uint64 duration) internal {
        locks[account] = LockInfo({
            totalAllocated: amount,
            claimed: 0,
            startTime: uint64(block.timestamp),
            cliff: cliff,
            duration: duration,
            forfeited: false
        });
    }

    function buyGovernance(uint256 amount, address paymentToken) external {
        require(
            paymentToken == usdc || paymentToken == usdt || paymentToken == usdq,
            "invalid token"
        );
        require(amount > 0, "amount");
        uint8 decimals = IERC20MetadataUpgradeable(paymentToken).decimals();
        uint256 totalPrice = (tokenPriceUSD * amount * (10 ** decimals)) / 1e18;
        IERC20Upgradeable erc20 = IERC20Upgradeable(paymentToken);
        require(
            erc20.transferFrom(msg.sender, address(this), totalPrice),
            "payment failed"
        );

        LockInfo storage info = locks[msg.sender];
        if (info.totalAllocated == 0) {
            info.startTime = uint64(block.timestamp);
            info.cliff = uint64(2 weeks);
            info.duration = uint64(7 weeks);
        }
        info.totalAllocated += amount;

        emit GovernancePurchased(msg.sender, amount, paymentToken);
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
        locks[treasury].totalAllocated += remaining;
        emit TokensForfeited(account, remaining);
    }

    // ------- Governor Overrides -------
    function votingDelay() public pure override returns (uint256) {
        return 1;
    }

    function votingPeriod() public pure override returns (uint256) {
        return 45818;
    }

    function quorum(uint256 blockNumber) public view override(Governor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }

    function getVotes(address account, uint256 blockNumber) public view override returns (uint256) {
        LockInfo storage info = locks[account];
        if (info.forfeited) {
            return 0;
        }
        return info.totalAllocated; // simplified
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, IGovernor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ------- Upgradeability -------
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
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
    GovernorTimelockControl
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

    uint256 public totalAllocatedTokens;

    uint256 public totalEthReleased;
    mapping(address => uint256) public ethReleased;
    mapping(address => uint256) public erc20TotalReleased;
    mapping(address => mapping(address => uint256)) public erc20Released;

    event RevenueClaimed(address indexed account, address indexed token, uint256 amount);
    event RevenueReceived(address indexed from, uint256 amount, address indexed token);

    event GovernancePurchased(address indexed buyer, uint256 amount, address paymentToken);
    event TokensClaimed(address indexed account, uint256 amount);
    event TokensForfeited(address indexed account, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    receive() external payable {
        if (msg.value > 0) {
            emit RevenueReceived(msg.sender, msg.value, address(0));
        }
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
        address usdqAddr
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __Governor_init("SQMUGovernance");
        __GovernorSettings_init(1 /* voting delay */, 45818 /* voting period */, 0);
        __GovernorVotes_init(new ERC1155VotesAdapter(ISQMUGovernance(address(this))));
        __GovernorVotesQuorumFraction_init(4);
        __GovernorCountingSimple_init();
        __GovernorTimelockControl_init(TimelockController(payable(address(0))));

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

    /// @notice Return the metadata URI for the governance token.
    /// @dev Replaces `{id}` with the token ID if present in the base URI.
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
                return string(
                    abi.encodePacked(prefix, Strings.toHexString(GOVERNANCE_ID, 32), suffix)
                );
            }
        }
        return string(abi.encodePacked(base, Strings.toString(GOVERNANCE_ID), ".json"));
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
        totalAllocatedTokens += amount;
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
            _allocate(msg.sender, amount, 2 weeks, 7 weeks);
        } else {
            info.totalAllocated += amount;
            totalAllocatedTokens += amount;
        }

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
            IERC20Upgradeable erc20 = IERC20Upgradeable(token);
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
            AddressUpgradeable.sendValue(payable(msg.sender), payment);
        } else {
            erc20Released[token][msg.sender] += payment;
            erc20TotalReleased[token] += payment;
            IERC20Upgradeable(token).transfer(msg.sender, payment);
        }
        emit RevenueClaimed(msg.sender, token, payment);
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


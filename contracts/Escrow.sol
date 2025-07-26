// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MultiSignerERC7913} from "@openzeppelin/contracts/utils/cryptography/signers/MultiSignerERC7913.sol";

/// @title Property Purchase Escrow
/// @notice Minimal proxy escrow contract with staged funding and multisig release
/// @dev Based on documentation in `Escrow/escrow_system_technical_architecture.md`
contract Escrow is Initializable, UUPSUpgradeable, AccessControlEnumerableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, MultiSignerERC7913 {
    using SafeERC20 for IERC20;

    /// @notice Escrow lifecycle states
    enum State {
        Created,
        Funded,
        PendingRelease,
        Released,
        Cancelled,
        Expired
    }

    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");
    bytes32 public constant SELLER_ROLE = keccak256("SELLER_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IERC20 public paymentToken;
    uint256 public totalRequired;
    uint256 public fundedAmount;
    uint256 public deadline;
    address public factory;

    State public state;

    mapping(bytes32 => uint256) public documentHashes; // hash => timestamp

    // release approvals
    mapping(address => bool) public releaseApproved;
    uint256 public approvalCount;

    event Deposit(address indexed from, uint256 amount, uint256 totalFunded);
    event DocumentHashAdded(bytes32 indexed hash, uint256 timestamp);
    event ReleaseProposed(address indexed proposer);
    event ReleaseApproved(address indexed signer, uint256 approvals);
    event FundsReleased(address indexed to, uint256 amount);
    event Cancelled(address indexed by);
    event Expired(address indexed by);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() MultiSignerERC7913(new bytes[](0), 1) {
        _disableInitializers();
    }

    /// @notice Initialize new escrow instance
    /// @param buyer Buyer wallet
    /// @param agent Agent wallet
    /// @param seller Optional seller wallet (0x0 allowed)
    /// @param token ERC20 stablecoin for payments
    /// @param amount Total funds required
    /// @param deadlineTs Unix timestamp for expiry
    /// @param factoryAddr Deploying factory address
    function initialize(
        address buyer,
        address agent,
        address seller,
        IERC20 token,
        uint256 amount,
        uint256 deadlineTs,
        address factoryAddr
    ) external initializer {
        require(buyer != address(0) && agent != address(0), "roles required");
        __UUPSUpgradeable_init();
        __AccessControlEnumerable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _grantRole(BUYER_ROLE, buyer);
        _grantRole(AGENT_ROLE, agent);
        if (seller != address(0)) {
            _grantRole(SELLER_ROLE, seller);
        }
        _grantRole(ADMIN_ROLE, msg.sender);

        paymentToken = token;
        totalRequired = amount;
        deadline = deadlineTs;
        factory = factoryAddr;
        state = State.Created;
    }

    /// @dev UUPS authorization
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}

    /// -------- State Changing Functions --------

    /// @notice Assign the seller if not set
    function assignSeller(address seller) external onlyRole(AGENT_ROLE) {
        require(state == State.Created, "not assignable");
        require(!hasRole(SELLER_ROLE, seller), "already seller");
        _grantRole(SELLER_ROLE, seller);
    }

    /// @notice Deposit escrow funds (EOI, deposit, balance)
    function fund(uint256 amount) external nonReentrant whenNotPaused onlyRole(BUYER_ROLE) {
        require(state == State.Created || state == State.Funded, "wrong state");
        fundedAmount += amount;
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount, fundedAmount);
        if (fundedAmount >= totalRequired && state != State.Funded) {
            state = State.Funded;
        }
    }

    /// @notice Store off-chain document hash (MOU, deed)
    function addDocumentHash(bytes32 hash) external whenNotPaused {
        require(hasRole(BUYER_ROLE, msg.sender) || hasRole(SELLER_ROLE, msg.sender) || hasRole(AGENT_ROLE, msg.sender), "not party");
        documentHashes[hash] = block.timestamp;
        emit DocumentHashAdded(hash, block.timestamp);
    }

    /// @notice Propose release of funds
    function proposeRelease() external whenNotPaused {
        require(state == State.Funded, "not funded");
        require(_isAuthorized(msg.sender), "not party");
        state = State.PendingRelease;
        emit ReleaseProposed(msg.sender);
        _approveRelease(msg.sender);
    }

    /// @notice Approve release. When 2 of 3 approvals collected, funds are released to seller
    function approveRelease() external whenNotPaused {
        require(state == State.PendingRelease, "not pending");
        require(_isAuthorized(msg.sender), "not party");
        _approveRelease(msg.sender);
    }

    function _approveRelease(address signer) internal {
        if (!releaseApproved[signer]) {
            releaseApproved[signer] = true;
            approvalCount += 1;
            emit ReleaseApproved(signer, approvalCount);
        }
        if (approvalCount >= 2) {
            _release();
        }
    }

    function _release() internal {
        state = State.Released;
        paymentToken.safeTransfer(getRoleMember(SELLER_ROLE, 0), fundedAmount);
        emit FundsReleased(getRoleMember(SELLER_ROLE, 0), fundedAmount);
    }

    /// @notice Cancel the escrow before release
    function cancel() external whenNotPaused {
        require(state == State.Created || state == State.Funded, "cannot cancel");
        require(_isAuthorized(msg.sender), "not party");
        state = State.Cancelled;
        paymentToken.safeTransfer(getRoleMember(BUYER_ROLE, 0), fundedAmount);
        emit Cancelled(msg.sender);
    }

    /// @notice Trigger expiry after deadline
    function expire() external whenNotPaused {
        require(block.timestamp >= deadline, "not expired");
        require(state != State.Released && state != State.Cancelled, "completed");
        state = State.Expired;
        paymentToken.safeTransfer(getRoleMember(BUYER_ROLE, 0), fundedAmount);
        emit Expired(msg.sender);
    }

    /// -------- View Helpers --------

    function _isAuthorized(address user) internal view returns (bool) {
        return hasRole(BUYER_ROLE, user) || hasRole(SELLER_ROLE, user) || hasRole(AGENT_ROLE, user);
    }
}


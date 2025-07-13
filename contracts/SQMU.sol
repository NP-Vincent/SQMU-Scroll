// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title SQMU ERC-1155 Ownership Token
/// @notice Basic ERC-1155 token for SQMU fractional real estate ownership.
/// @dev Upgradeable contract using UUPS pattern.
contract SQMU is Initializable, ERC1155SupplyUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    string public name;
    string public symbol;

    /// @notice Initialize the contract with a base URI.
    /// @param uri_ Base metadata URI for all tokens.
    function initialize(string memory uri_, string memory name_, string memory symbol_) public initializer {
        __ERC1155_init(uri_);
        __Ownable_init();
        __UUPSUpgradeable_init();
        name = name_;
        symbol = symbol_;
    }

    /// @notice Mint new tokens.
    /// @param to Recipient address.
    /// @param id Token ID to mint.
    /// @param amount Amount of tokens to mint.
    /// @param data Additional data.
    function mint(address to, uint256 id, uint256 amount, bytes memory data) external onlyOwner {
        _mint(to, id, amount, data);
    }

    /// @dev Required by UUPS pattern to authorize upgrades.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

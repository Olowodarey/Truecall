// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TrueCall
 * @author TrueCall Team
 * @notice Main prediction market contract for TrueCall on EVM chains
 * @dev Inherits Ownable, ReentrancyGuard, and Pausable from OpenZeppelin
 */
contract TrueCall is Ownable, ReentrancyGuard, Pausable {
    // ─── Constants ────────────────────────────────────────────────────────────

    string public constant VERSION = "1.0.0";

    // ─── Events ───────────────────────────────────────────────────────────────

    event ContractDeployed(address indexed deployer, uint256 timestamp);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {
        emit ContractDeployed(msg.sender, block.timestamp);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Pause all state-changing functions
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Returns the contract version string
    function getVersion() external pure returns (string memory) {
        return VERSION;
    }
}

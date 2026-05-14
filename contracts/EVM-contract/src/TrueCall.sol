// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title TrueCall
/// @author TrueCall Team
/// @notice Root registry contract for the TrueCall prediction platform.
///         Holds references to all sub-contracts and acts as the
///         single source of truth for contract addresses.
///         Does NOT hold funds — all funds are in EventManager.
contract TrueCall is Ownable, Pausable {
    // ─── Constants ────────────────────────────────────────────────────────────

    string public constant VERSION = "1.0.0";

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Address of the EventManager contract
    address public eventManager;

    /// @notice Address of the Leaderboard contract
    address public leaderboard;

    /// @notice Address of the AI Oracle Agent (ERC-8004 registered)
    address public aiOracleAgent;

    /// @notice Address of the cUSD token on Celo
    address public immutable cUSD;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ContractDeployed(address indexed deployer, uint256 timestamp);
    event EventManagerUpdated(address indexed oldAddress, address indexed newAddress);
    event LeaderboardUpdated(address indexed oldAddress, address indexed newAddress);
    event AIAgentUpdated(address indexed oldAddress, address indexed newAddress);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ZeroAddress();

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param _cUSD cUSD token address on Celo Mainnet: 0x765DE816845861e75A25fCA122bb6898B8B1282a
    constructor(address _cUSD) Ownable(msg.sender) {
        if (_cUSD == address(0)) revert ZeroAddress();
        cUSD = _cUSD;
        emit ContractDeployed(msg.sender, block.timestamp);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setEventManager(address _eventManager) external onlyOwner {
        if (_eventManager == address(0)) revert ZeroAddress();
        emit EventManagerUpdated(eventManager, _eventManager);
        eventManager = _eventManager;
    }

    function setLeaderboard(address _leaderboard) external onlyOwner {
        if (_leaderboard == address(0)) revert ZeroAddress();
        emit LeaderboardUpdated(leaderboard, _leaderboard);
        leaderboard = _leaderboard;
    }

    function setAIAgent(address _agent) external onlyOwner {
        if (_agent == address(0)) revert ZeroAddress();
        emit AIAgentUpdated(aiOracleAgent, _agent);
        aiOracleAgent = _agent;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getVersion() external pure returns (string memory) {
        return VERSION;
    }

    /// @notice Returns all core contract addresses in one call
    function getAddresses()
        external
        view
        returns (
            address _eventManager,
            address _leaderboard,
            address _aiOracleAgent,
            address _cUSD
        )
    {
        return (eventManager, leaderboard, aiOracleAgent, cUSD);
    }
}

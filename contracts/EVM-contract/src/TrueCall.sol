// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title TrueCall
/// @author TrueCall Team
/// @notice Root registry contract for the TrueCall prediction platform.
///         Holds references to all sub-contracts and acts as the
///         single source of truth for contract addresses.
///         Does NOT hold funds — all funds are in EventManager.
///         Upgradeable via UUPS proxy pattern.
/// @custom:oz-upgrades-from TrueCall
contract TrueCall is Initializable, OwnableUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    // ─── Constants ────────────────────────────────────────────────────────────

    string public constant VERSION = "1.0.0";

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Address of the EventManager proxy
    address public eventManager;

    /// @notice Address of the Leaderboard proxy
    address public leaderboard;

    /// @notice Address of the AI Oracle Agent (ERC-8004 registered)
    address public aiOracleAgent;

    /// @notice cUSD token address on Celo (set once, never changes)
    address public cUSD;

    // ─── Storage gap for future upgrades ─────────────────────────────────────
    // solhint-disable-next-line var-name-mixedcase
    uint256[50] private __gap;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ContractDeployed(address indexed deployer, uint256 timestamp);
    event EventManagerUpdated(address indexed oldAddress, address indexed newAddress);
    event LeaderboardUpdated(address indexed oldAddress, address indexed newAddress);
    event AIAgentUpdated(address indexed oldAddress, address indexed newAddress);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ZeroAddress();

    // ─── Constructor (disabled for proxy) ────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer (replaces constructor) ──────────────────────────────────

    /// @notice Initialize the root registry
    /// @param _cUSD cUSD token address on Celo Mainnet: 0x765DE816845861e75A25fCA122bb6898B8B1282a
    /// @param _owner Initial owner address
    function initialize(address _cUSD, address _owner) external initializer {
        if (_cUSD == address(0) || _owner == address(0)) revert ZeroAddress();
        __Ownable_init(_owner);
        __Pausable_init();

        cUSD = _cUSD;
        emit ContractDeployed(_owner, block.timestamp);
    }

    // ─── UUPS Upgrade Authorization ───────────────────────────────────────────

    /// @dev Only owner can authorize upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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

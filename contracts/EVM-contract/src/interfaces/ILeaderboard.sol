// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ILeaderboard
/// @notice Interface for the TrueCall Leaderboard contract
interface ILeaderboard {
    // ─── Structs ──────────────────────────────────────────────────────────────

    struct RankEntry {
        address user;
        uint256 points;
        uint256 firstSubmission; // tiebreaker: earliest prediction timestamp
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event PointsUpdated(uint256 indexed eventId, address indexed user, uint256 points);
    event GlobalPointsUpdated(address indexed user, uint256 totalPoints);

    // ─── Functions ────────────────────────────────────────────────────────────

    /// @notice Update points for multiple users after event resolution
    function updatePoints(
        uint256 eventId,
        address[] calldata users,
        uint256[] calldata points,
        uint256[] calldata submissionTimestamps
    ) external;

    /// @notice Get top N users for a specific event
    function getTopN(uint256 eventId, uint256 n) external view returns (RankEntry[] memory);

    /// @notice Get a user's rank in a specific event
    function getUserEventRank(uint256 eventId, address user) external view returns (uint256 rank, uint256 points);

    /// @notice Get a user's global all-time points
    function getGlobalPoints(address user) external view returns (uint256);

    /// @notice Get top N users on the global leaderboard
    function getGlobalTopN(uint256 n) external view returns (RankEntry[] memory);
}

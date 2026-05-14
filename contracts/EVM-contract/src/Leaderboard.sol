// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ILeaderboard} from "./interfaces/ILeaderboard.sol";

/// @title Leaderboard
/// @author TrueCall Team
/// @notice Tracks per-event and global points for all users.
///         Only the EventManager contract can write points.
///         Prize distribution is handled by EventManager — this contract
///         is purely responsible for rankings.
contract Leaderboard is ILeaderboard, Ownable {
    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Address of the EventManager — only caller allowed to update points
    address public eventManager;

    /// @notice eventId → user → points earned in that event
    mapping(uint256 => mapping(address => uint256)) public eventPoints;

    /// @notice eventId → user → earliest prediction timestamp (tiebreaker)
    mapping(uint256 => mapping(address => uint256)) public eventSubmissionTime;

    /// @notice eventId → list of all participants who earned points
    mapping(uint256 => address[]) private _eventParticipants;

    /// @notice eventId → user → already recorded (avoid duplicates)
    mapping(uint256 => mapping(address => bool)) private _eventRecorded;

    /// @notice user → total all-time points across all events
    mapping(address => uint256) public globalPoints;

    // ─── Errors ───────────────────────────────────────────────────────────────

    error OnlyEventManager();
    error ArrayLengthMismatch();
    error ZeroAddress();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyEventManager() {
        if (msg.sender != eventManager) revert OnlyEventManager();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Set the EventManager address (called once after deployment)
    function setEventManager(address _eventManager) external onlyOwner {
        if (_eventManager == address(0)) revert ZeroAddress();
        eventManager = _eventManager;
    }

    // ─── Write (EventManager only) ────────────────────────────────────────────

    /// @inheritdoc ILeaderboard
    /// @dev Called by EventManager after AI oracle submits verified result.
    ///      submissionTimestamps are the on-chain block.timestamp values stored
    ///      when each user submitted their prediction — used as tiebreaker.
    function updatePoints(
        uint256 eventId,
        address[] calldata users,
        uint256[] calldata points,
        uint256[] calldata submissionTimestamps
    ) external onlyEventManager {
        if (users.length != points.length || users.length != submissionTimestamps.length) {
            revert ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 pts = points[i];

            // Record participant once per event
            if (!_eventRecorded[eventId][user]) {
                _eventRecorded[eventId][user] = true;
                _eventParticipants[eventId].push(user);
                eventSubmissionTime[eventId][user] = submissionTimestamps[i];
            }

            eventPoints[eventId][user] = pts;

            // Accumulate global points
            globalPoints[user] += pts;

            emit PointsUpdated(eventId, user, pts);
            emit GlobalPointsUpdated(user, globalPoints[user]);
        }
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @inheritdoc ILeaderboard
    /// @dev Returns top N entries sorted by points desc, tiebroken by earliest timestamp.
    ///      Uses insertion sort — acceptable for typical event sizes (<500 participants).
    function getTopN(uint256 eventId, uint256 n) external view returns (RankEntry[] memory) {
        address[] memory participants = _eventParticipants[eventId];
        uint256 total = participants.length;

        if (total == 0) return new RankEntry[](0);

        uint256 resultSize = n < total ? n : total;

        // Build full sorted array via insertion sort
        RankEntry[] memory sorted = new RankEntry[](total);
        for (uint256 i = 0; i < total; i++) {
            sorted[i] = RankEntry({
                user: participants[i],
                points: eventPoints[eventId][participants[i]],
                firstSubmission: eventSubmissionTime[eventId][participants[i]]
            });
        }

        // Insertion sort descending by points, tiebreak by earliest submission
        for (uint256 i = 1; i < total; i++) {
            RankEntry memory key = sorted[i];
            int256 j = int256(i) - 1;
            while (j >= 0 && _isLower(sorted[uint256(j)], key)) {
                sorted[uint256(j + 1)] = sorted[uint256(j)];
                j--;
            }
            sorted[uint256(j + 1)] = key;
        }

        // Return top N
        RankEntry[] memory result = new RankEntry[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = sorted[i];
        }
        return result;
    }

    /// @inheritdoc ILeaderboard
    function getUserEventRank(uint256 eventId, address user)
        external
        view
        returns (uint256 rank, uint256 points)
    {
        points = eventPoints[eventId][user];
        address[] memory participants = _eventParticipants[eventId];
        rank = 1;
        for (uint256 i = 0; i < participants.length; i++) {
            address other = participants[i];
            if (other == user) continue;
            uint256 otherPts = eventPoints[eventId][other];
            if (otherPts > points) {
                rank++;
            } else if (otherPts == points) {
                // Earlier submission = better rank
                if (eventSubmissionTime[eventId][other] < eventSubmissionTime[eventId][user]) {
                    rank++;
                }
            }
        }
    }

    /// @inheritdoc ILeaderboard
    function getGlobalPoints(address user) external view returns (uint256) {
        return globalPoints[user];
    }

    /// @inheritdoc ILeaderboard
    /// @dev Global leaderboard across all events — sorted by all-time points.
    ///      NOTE: This is a view-only function and iterates all known users.
    ///      For large user bases, use off-chain indexing (backend cache).
    function getGlobalTopN(uint256 n) external view returns (RankEntry[] memory) {
        // This is intentionally left as a stub for on-chain use.
        // The backend caches global rankings via event logs.
        // Returning empty array here — frontend reads from backend cache.
        return new RankEntry[](n);
    }

    /// @notice Get all participants for an event
    function getEventParticipants(uint256 eventId) external view returns (address[] memory) {
        return _eventParticipants[eventId];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Returns true if `a` should come AFTER `b` in the sorted order
    ///      (i.e., `a` is "lower ranked" than `b`)
    function _isLower(RankEntry memory a, RankEntry memory b) internal pure returns (bool) {
        if (a.points != b.points) return a.points < b.points;
        // Same points: earlier submission is better (lower timestamp = higher rank)
        return a.firstSubmission > b.firstSubmission;
    }
}

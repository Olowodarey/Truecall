// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ILeaderboard} from "./interfaces/ILeaderboard.sol";

/// @title Leaderboard
/// @author TrueCall Team
/// @notice Tracks per-event and global points for all users.
///         Only the EventManager contract can write points.
///         Upgradeable via UUPS proxy pattern.
/// @custom:oz-upgrades-from Leaderboard
contract Leaderboard is ILeaderboard, Initializable, OwnableUpgradeable, UUPSUpgradeable {
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

    // ─── Storage gap for future upgrades ─────────────────────────────────────
    // solhint-disable-next-line var-name-mixedcase
    uint256[50] private __gap;

    // ─── Errors ───────────────────────────────────────────────────────────────

    error OnlyEventManager();
    error ArrayLengthMismatch();
    error ZeroAddress();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyEventManager() {
        if (msg.sender != eventManager) revert OnlyEventManager();
        _;
    }

    // ─── Constructor (disabled for proxy) ────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer (replaces constructor) ──────────────────────────────────

    /// @notice Initialize the contract (called once via proxy deployment)
    /// @param _owner The initial owner address
    function initialize(address _owner) external initializer {
        if (_owner == address(0)) revert ZeroAddress();
        __Ownable_init(_owner);
    }

    // ─── UUPS Upgrade Authorization ───────────────────────────────────────────

    /// @dev Only owner can authorize upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Set the EventManager address
    function setEventManager(address _eventManager) external onlyOwner {
        if (_eventManager == address(0)) revert ZeroAddress();
        eventManager = _eventManager;
    }

    // ─── Write (EventManager only) ────────────────────────────────────────────

    /// @inheritdoc ILeaderboard
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

            if (!_eventRecorded[eventId][user]) {
                _eventRecorded[eventId][user] = true;
                _eventParticipants[eventId].push(user);
                eventSubmissionTime[eventId][user] = submissionTimestamps[i];
            }

            eventPoints[eventId][user] = pts;
            globalPoints[user] += pts;

            emit PointsUpdated(eventId, user, pts);
            emit GlobalPointsUpdated(user, globalPoints[user]);
        }
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @inheritdoc ILeaderboard
    function getTopN(uint256 eventId, uint256 n) external view returns (RankEntry[] memory) {
        address[] memory participants = _eventParticipants[eventId];
        uint256 total = participants.length;

        if (total == 0) return new RankEntry[](0);

        uint256 resultSize = n < total ? n : total;

        RankEntry[] memory sorted = new RankEntry[](total);
        for (uint256 i = 0; i < total; i++) {
            sorted[i] = RankEntry({
                user: participants[i],
                points: eventPoints[eventId][participants[i]],
                firstSubmission: eventSubmissionTime[eventId][participants[i]]
            });
        }

        // Insertion sort: descending points, tiebreak by earliest submission
        for (uint256 i = 1; i < total; i++) {
            RankEntry memory key = sorted[i];
            int256 j = int256(i) - 1;
            while (j >= 0 && _isLower(sorted[uint256(j)], key)) {
                sorted[uint256(j + 1)] = sorted[uint256(j)];
                j--;
            }
            sorted[uint256(j + 1)] = key;
        }

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
    function getGlobalTopN(uint256 n) external pure returns (RankEntry[] memory) {
        // Stub — global rankings served from backend event-log cache
        return new RankEntry[](n);
    }

    /// @notice Get all participants for an event
    function getEventParticipants(uint256 eventId) external view returns (address[] memory) {
        return _eventParticipants[eventId];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _isLower(RankEntry memory a, RankEntry memory b) internal pure returns (bool) {
        if (a.points != b.points) return a.points < b.points;
        return a.firstSubmission > b.firstSubmission;
    }
}

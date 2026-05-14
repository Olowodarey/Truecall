// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IEventManager
/// @notice Interface for the TrueCall EventManager contract
interface IEventManager {
    // ─── Enums ────────────────────────────────────────────────────────────────

    enum EventStatus {
        OPEN,      // Accepting predictions
        LOCKED,    // Deadline passed, awaiting result
        VERIFIED,  // AI agent submitted result, dispute window open
        RESOLVED,  // Prizes claimable
        DISPUTED,  // Under admin review
        CANCELLED  // Cancelled, refunds available
    }

    enum ScoringRule {
        EXACT_SCORE_ONLY, // 3pts for exact score, 0 otherwise
        OUTCOME_ONLY,     // 1pt for correct W/D/L, 0 otherwise
        BOTH              // 3pts exact, 1pt outcome, 0 wrong
    }

    enum EventType {
        PUBLIC,  // Admin-created, open to all
        PRIVATE  // User-created, invite code required
    }

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Event {
        uint256 eventId;
        EventType eventType;
        address creator;
        string homeTeam;
        string awayTeam;
        string matchId;          // API-Football match ID
        uint256 kickoffTime;
        uint256 predictionDeadline;
        uint256 entryFee;        // in cUSD (18 decimals)
        uint256 prizePool;       // accumulated entry fees
        uint256 maxParticipants; // 0 = unlimited (public events)
        EventStatus status;
        ScoringRule scoringRule;
        uint8 finalHomeScore;
        uint8 finalAwayScore;
        bytes32 resultProof;     // keccak256(eventId, home, away, timestamp, agent)
        uint256 verifiedAt;
        bytes32 inviteCodeHash;  // keccak256 of invite code (private events only)
    }

    struct Prediction {
        uint8 homeScore;
        uint8 awayScore;
        uint256 submittedAt;  // block.timestamp — immutable anti-cheat proof
        bool exists;
        uint256 pointsEarned; // set by AI oracle after verification
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event PublicEventCreated(
        uint256 indexed eventId,
        string homeTeam,
        string awayTeam,
        string matchId,
        uint256 kickoffTime,
        uint256 entryFee
    );

    event PrivateEventCreated(
        uint256 indexed eventId,
        address indexed creator,
        string homeTeam,
        string awayTeam,
        string matchId,
        uint256 kickoffTime,
        uint256 entryFee,
        uint256 maxParticipants
    );

    event PredictionSubmitted(
        uint256 indexed eventId,
        address indexed user,
        uint8 homeScore,
        uint8 awayScore,
        uint256 timestamp
    );

    event ResultVerified(
        uint256 indexed eventId,
        uint8 homeScore,
        uint8 awayScore,
        bytes32 proof,
        address indexed agent,
        uint256 timestamp
    );

    event EventResolved(uint256 indexed eventId, address[5] winners);
    event PrizeClaimed(uint256 indexed eventId, address indexed winner, uint256 amount);
    event ResultDisputed(uint256 indexed eventId, address indexed disputer);
    event DisputeResolved(uint256 indexed eventId, bool agentWasWrong);
    event EventCancelled(uint256 indexed eventId);
    event RefundClaimed(uint256 indexed eventId, address indexed user, uint256 amount);
}

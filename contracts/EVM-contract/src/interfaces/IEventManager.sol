// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IEventManager
/// @notice Interface for the TrueCall EventManager contract
interface IEventManager {
    // ─── Enums ────────────────────────────────────────────────────────────────

    enum EventStatus {
        OPEN,      // Accepting joins and predictions
        LOCKED,    // Prediction window closed, matches in progress
        RESOLVED,  // All matches verified, prizes claimable
        DISPUTED,  // At least one match result under admin review
        CANCELLED  // Cancelled, refunds available
    }

    enum ScoringRule {
        EXACT_SCORE_ONLY, // 3pts for exact score, 0 otherwise
        OUTCOME_ONLY,     // 1pt for correct W/D/L, 0 otherwise
        BOTH              // 3pts exact, 1pt outcome, 0 wrong
    }

    enum MatchStatus {
        PENDING,   // Not yet started
        LOCKED,    // Kickoff passed, awaiting result
        VERIFIED,  // AI agent submitted result, dispute window open
        DISPUTED,  // Under admin review
        RESOLVED   // Final — points distributed
    }

    enum EventType {
        PUBLIC,  // Admin-created, open to all
        PRIVATE  // User-created, invite code required
    }

    // ─── Structs ──────────────────────────────────────────────────────────────

    /// @notice Event = the container. Holds entry fee, window, participants, prize pool.
    ///         Does NOT hold match details — matches are stored separately.
    struct Event {
        uint256 eventId;
        EventType eventType;
        address creator;
        string name;                 // e.g. "Gameweek 32 Predictions"
        uint256 startTime;           // when predictions open
        uint256 predictionDeadline;  // last time to join and predict (before first kickoff)
        uint256 entryFee;            // ONE-TIME fee in cUSD (18 decimals)
        uint256 prizePool;           // accumulated entry fees
        uint256 maxParticipants;     // 0 = unlimited (public events)
        EventStatus status;
        uint256 matchCount;          // number of matches added to this event
        uint256 resolvedMatchCount;  // incremented as each match is verified
        bytes32 inviteCodeHash;      // keccak256 of invite code (private events only)
    }

    /// @notice Match = a single football fixture inside an event.
    ///         Each match has its own scoring rule and kickoff time.
    struct Match {
        uint256 matchId;        // auto-incremented within the event
        uint256 eventId;        // parent event
        string apiMatchId;      // API-Football fixture ID (off-chain reference)
        string homeTeam;
        string awayTeam;
        uint256 kickoffTime;    // unix timestamp
        ScoringRule scoringRule;
        MatchStatus status;
        uint8 finalHomeScore;
        uint8 finalAwayScore;
        bytes32 resultProof;    // keccak256(eventId, matchId, home, away, timestamp, agent)
        uint256 verifiedAt;
    }

    /// @notice Prediction = a user's score guess for a specific match.
    ///         Timestamped at submission — immutable anti-cheat proof.
    struct MatchPrediction {
        uint8 homeScore;
        uint8 awayScore;
        uint256 submittedAt;   // block.timestamp — cannot be altered after submission
        bool exists;
        uint256 pointsEarned;  // set by AI oracle after match verification
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event PublicEventCreated(
        uint256 indexed eventId,
        string name,
        uint256 predictionDeadline,
        uint256 entryFee
    );

    event PrivateEventCreated(
        uint256 indexed eventId,
        address indexed creator,
        string name,
        uint256 predictionDeadline,
        uint256 entryFee,
        uint256 maxParticipants
    );

    event MatchAdded(
        uint256 indexed eventId,
        uint256 indexed matchId,
        string apiMatchId,
        string homeTeam,
        string awayTeam,
        uint256 kickoffTime,
        ScoringRule scoringRule
    );

    event PredictionSubmitted(
        uint256 indexed eventId,
        uint256 indexed matchId,
        address indexed user,
        uint8 homeScore,
        uint8 awayScore,
        uint256 timestamp
    );

    event UserJoinedEvent(
        uint256 indexed eventId,
        address indexed user,
        uint256 entryFee
    );

    event MatchResultVerified(
        uint256 indexed eventId,
        uint256 indexed matchId,
        uint8 homeScore,
        uint8 awayScore,
        bytes32 proof,
        address indexed agent
    );

    event MatchDisputed(uint256 indexed eventId, uint256 indexed matchId, address indexed disputer);
    event MatchDisputeResolved(uint256 indexed eventId, uint256 indexed matchId, bool agentWasWrong);
    event EventResolved(uint256 indexed eventId, address[5] winners);
    event PrizeClaimed(uint256 indexed eventId, address indexed winner, uint256 amount);
    event EventCancelled(uint256 indexed eventId);
    event RefundClaimed(uint256 indexed eventId, address indexed user, uint256 amount);
}

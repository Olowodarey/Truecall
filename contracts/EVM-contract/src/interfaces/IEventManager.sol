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

    /// @notice Event = A competition/tournament that houses multiple matches
    struct Event {
        uint256 eventId;
        EventType eventType;
        address creator;
        string eventName;        // e.g., "Premier League Week 10"
        uint256 startDate;       // When event starts (users can join before this)
        uint256 endDate;         // When event ends (all matches must finish before this)
        address entryToken;      // Token address for entry fee (any Celo native token)
        uint256 entryFee;        // Entry fee amount (18 decimals) - ONE-TIME payment
        uint256 prizePool;       // accumulated entry fees
        uint256 maxParticipants; // 0 = unlimited (public events)
        EventStatus status;
        ScoringRule scoringRule; // Applied to all matches in this event
        bytes32 inviteCodeHash;  // keccak256 of invite code (private events only)
    }

    /// @notice Match = Individual fixture within an event
    struct Match {
        uint256 matchId;
        uint256 eventId;         // Parent event
        string homeTeam;
        string awayTeam;
        string apiMatchId;       // API-Football match ID
        uint256 kickoffTime;
        uint256 predictionDeadline;
        MatchStatus status;
        uint8 finalHomeScore;
        uint8 finalAwayScore;
        bytes32 resultProof;     // keccak256(matchId, home, away, timestamp, agent)
        uint256 verifiedAt;
        bool allowScorePrediction;   // If true, users can predict exact score (5 pts)
        bool allowOutcomePrediction; // If true, users can predict outcome (3 pts)
    }

    enum MatchStatus {
        OPEN,      // Accepting predictions
        LOCKED,    // Deadline passed, awaiting result
        VERIFIED,  // AI agent submitted result
        DISPUTED   // Under admin review
    }

    enum Outcome {
        HOME_WIN,
        DRAW,
        AWAY_WIN
    }

    struct Prediction {
        // Correct Score Prediction (5 points if correct)
        uint8 homeScore;
        uint8 awayScore;
        bool hasScorePrediction;
        uint256 scorePointsEarned;
        
        // Outcome Prediction (3 points if correct)
        Outcome outcome;
        bool hasOutcomePrediction;
        uint256 outcomePointsEarned;
        
        uint256 submittedAt;  // block.timestamp — immutable anti-cheat proof
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event PublicEventCreated(
        uint256 indexed eventId,
        string eventName,
        uint256 startDate,
        uint256 endDate,
        uint256 entryFee
    );

    event PrivateEventCreated(
        uint256 indexed eventId,
        address indexed creator,
        string eventName,
        uint256 startDate,
        uint256 endDate,
        uint256 entryFee,
        uint256 maxParticipants
    );

    event UserJoinedEvent(
        uint256 indexed eventId,
        address indexed user,
        uint256 timestamp
    );

    event MatchAdded(
        uint256 indexed matchId,
        uint256 indexed eventId,
        string homeTeam,
        string awayTeam,
        string apiMatchId,
        uint256 kickoffTime,
        bool allowScorePrediction,
        bool allowOutcomePrediction
    );

    event ScorePredictionSubmitted(
        uint256 indexed matchId,
        uint256 indexed eventId,
        address indexed user,
        uint8 homeScore,
        uint8 awayScore,
        uint256 timestamp
    );

    event OutcomePredictionSubmitted(
        uint256 indexed matchId,
        uint256 indexed eventId,
        address indexed user,
        Outcome outcome,
        uint256 timestamp
    );

    event MatchResultVerified(
        uint256 indexed matchId,
        uint256 indexed eventId,
        uint8 homeScore,
        uint8 awayScore,
        bytes32 proof,
        address indexed agent,
        uint256 timestamp
    );

    event EventResolved(uint256 indexed eventId, address[5] winners);
    event PrizeClaimed(uint256 indexed eventId, address indexed winner, uint256 amount);
    event MatchResultDisputed(uint256 indexed matchId, address indexed disputer);
    event DisputeResolved(uint256 indexed matchId, bool agentWasWrong);
    event EventCancelled(uint256 indexed eventId);
    event RefundClaimed(uint256 indexed eventId, address indexed user, uint256 amount);
}

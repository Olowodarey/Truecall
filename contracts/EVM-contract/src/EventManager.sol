// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IEventManager} from "./interfaces/IEventManager.sol";
import {ILeaderboard} from "./interfaces/ILeaderboard.sol";

/// @title EventManager
/// @author TrueCall Team
/// @notice Manages public and private prediction events on TrueCall.
///         - Admin creates public events (open to all)
///         - Users create private events (invite-code gated)
///         - Users pay a ONE-TIME entry fee per event (in cUSD)
///         - AI Oracle Agent submits verified results + points
///         - Top 5 point holders share 99% of prize pool
///         - Platform takes 1% fee
contract EventManager is IEventManager, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Platform fee in basis points (100 = 1%)
    uint256 public constant PLATFORM_FEE_BPS = 100;

    /// @notice Total basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Dispute window after result verification (2 hours)
    uint256 public constant DISPUTE_WINDOW = 2 hours;

    /// @notice Time after which unclaimed prizes go to treasury (30 days)
    uint256 public constant CLAIM_EXPIRY = 30 days;

    /// @notice Minimum entry fee (1 cUSD = 1e18)
    uint256 public constant MIN_ENTRY_FEE = 1e18;

    /// @notice Prize shares for top 5 in basis points (must sum to 9900 = 99%)
    uint256[5] public PRIZE_SHARES = [4000, 2500, 1500, 1000, 500]; // 40%, 25%, 15%, 10%, 5%

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice cUSD token on Celo
    IERC20 public immutable cUSD;

    /// @notice Leaderboard contract
    ILeaderboard public leaderboard;

    /// @notice AI Oracle Agent address (ERC-8004 registered)
    address public aiOracleAgent;

    /// @notice Treasury address for platform fees
    address public treasury;

    /// @notice Auto-incrementing event ID
    uint256 public nextEventId;

    /// @notice Accumulated platform fees (withdrawn by admin)
    uint256 public pendingTreasuryFees;

    /// @notice eventId → Event
    mapping(uint256 => Event) public events;

    /// @notice eventId → user → Prediction
    mapping(uint256 => mapping(address => Prediction)) public predictions;

    /// @notice eventId → ordered list of participants
    mapping(uint256 => address[]) private _participants;

    /// @notice eventId → user → has joined (prevents double entry)
    mapping(uint256 => mapping(address => bool)) private _hasJoined;

    /// @notice eventId → top 5 winners (set after resolution)
    mapping(uint256 => address[5]) private _winners;

    /// @notice eventId → winner address → prize amount claimable
    mapping(uint256 => mapping(address => uint256)) public claimable;

    /// @notice eventId → winner address → has claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    /// @notice eventId → user → refund available (cancelled events)
    mapping(uint256 => mapping(address => bool)) public refundAvailable;

    // ─── Errors ───────────────────────────────────────────────────────────────

    error OnlyAIAgent();
    error EventNotOpen();
    error DeadlinePassed();
    error AlreadyJoined();
    error EventFull();
    error InvalidInviteCode();
    error EventNotVerified();
    error DisputeWindowOpen();
    error DisputeWindowClosed();
    error EventNotDisputed();
    error NothingToClaim();
    error ClaimExpired();
    error NotParticipant();
    error EventNotCancelled();
    error ArrayLengthMismatch();
    error ZeroAddress();
    error FeeTooLow();
    error KickoffInPast();
    error DeadlineAfterKickoff();
    error NotCreator();
    error EventHasParticipants();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAIAgent() {
        if (msg.sender != aiOracleAgent) revert OnlyAIAgent();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param _cUSD cUSD token address on Celo
    /// @param _treasury Platform fee recipient
    constructor(address _cUSD, address _treasury) Ownable(msg.sender) {
        if (_cUSD == address(0) || _treasury == address(0)) revert ZeroAddress();
        cUSD = IERC20(_cUSD);
        treasury = _treasury;
    }

    // ─── Admin Configuration ──────────────────────────────────────────────────

    function setLeaderboard(address _leaderboard) external onlyOwner {
        if (_leaderboard == address(0)) revert ZeroAddress();
        leaderboard = ILeaderboard(_leaderboard);
    }

    function setAIAgent(address _agent) external onlyOwner {
        if (_agent == address(0)) revert ZeroAddress();
        aiOracleAgent = _agent;
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── Event Creation ───────────────────────────────────────────────────────

    /// @notice Admin creates a public event (open to all users)
    /// @param homeTeam Home team name
    /// @param awayTeam Away team name
    /// @param matchId API-Football fixture ID
    /// @param kickoffTime Unix timestamp of match kickoff
    /// @param predictionDeadline Unix timestamp — must be <= kickoffTime
    /// @param entryFee Entry fee in cUSD (18 decimals)
    /// @param scoringRule Scoring rule for this event
    function createPublicEvent(
        string calldata homeTeam,
        string calldata awayTeam,
        string calldata matchId,
        uint256 kickoffTime,
        uint256 predictionDeadline,
        uint256 entryFee,
        ScoringRule scoringRule
    ) external onlyOwner whenNotPaused returns (uint256 eventId) {
        _validateEventParams(kickoffTime, predictionDeadline, entryFee);

        eventId = nextEventId++;

        Event storage ev = events[eventId];
        ev.eventId = eventId;
        ev.eventType = EventType.PUBLIC;
        ev.creator = msg.sender;
        ev.homeTeam = homeTeam;
        ev.awayTeam = awayTeam;
        ev.matchId = matchId;
        ev.kickoffTime = kickoffTime;
        ev.predictionDeadline = predictionDeadline;
        ev.entryFee = entryFee;
        ev.status = EventStatus.OPEN;
        ev.scoringRule = scoringRule;

        emit PublicEventCreated(eventId, homeTeam, awayTeam, matchId, kickoffTime, entryFee);
    }

    /// @notice Any user creates a private event with an invite code
    /// @param inviteCodeHash keccak256 hash of the invite code (plain text stored off-chain)
    /// @param maxParticipants Maximum number of participants (2-100)
    function createPrivateEvent(
        string calldata homeTeam,
        string calldata awayTeam,
        string calldata matchId,
        uint256 kickoffTime,
        uint256 predictionDeadline,
        uint256 entryFee,
        ScoringRule scoringRule,
        uint256 maxParticipants,
        bytes32 inviteCodeHash
    ) external whenNotPaused returns (uint256 eventId) {
        _validateEventParams(kickoffTime, predictionDeadline, entryFee);
        require(maxParticipants >= 2 && maxParticipants <= 100, "maxParticipants: 2-100");
        require(inviteCodeHash != bytes32(0), "Invalid invite code hash");

        eventId = nextEventId++;

        Event storage ev = events[eventId];
        ev.eventId = eventId;
        ev.eventType = EventType.PRIVATE;
        ev.creator = msg.sender;
        ev.homeTeam = homeTeam;
        ev.awayTeam = awayTeam;
        ev.matchId = matchId;
        ev.kickoffTime = kickoffTime;
        ev.predictionDeadline = predictionDeadline;
        ev.entryFee = entryFee;
        ev.maxParticipants = maxParticipants;
        ev.status = EventStatus.OPEN;
        ev.scoringRule = scoringRule;
        ev.inviteCodeHash = inviteCodeHash;

        // Creator gets free entry — record them as participant with no fee
        _hasJoined[eventId][msg.sender] = true;
        _participants[eventId].push(msg.sender);

        emit PrivateEventCreated(
            eventId, msg.sender, homeTeam, awayTeam, matchId, kickoffTime, entryFee, maxParticipants
        );
    }

    // ─── Joining & Predicting ─────────────────────────────────────────────────

    /// @notice Join a PUBLIC event and submit prediction in one transaction.
    ///         User pays the ONE-TIME entry fee here. No further fees required.
    /// @param eventId The event to join
    /// @param homeScore Predicted home team score
    /// @param awayScore Predicted away team score
    function joinAndPredict(
        uint256 eventId,
        uint8 homeScore,
        uint8 awayScore
    ) external nonReentrant whenNotPaused {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.OPEN) revert EventNotOpen();
        if (block.timestamp >= ev.predictionDeadline) revert DeadlinePassed();
        if (_hasJoined[eventId][msg.sender]) revert AlreadyJoined();
        if (ev.eventType != EventType.PUBLIC) revert InvalidInviteCode();

        _collectEntryFee(eventId, msg.sender);
        _recordPrediction(eventId, msg.sender, homeScore, awayScore);
    }

    /// @notice Join a PRIVATE event with invite code and submit prediction.
    ///         User pays the ONE-TIME entry fee here. No further fees required.
    /// @param eventId The private event to join
    /// @param inviteCode Plain-text invite code (hashed and verified on-chain)
    /// @param homeScore Predicted home team score
    /// @param awayScore Predicted away team score
    function joinPrivateAndPredict(
        uint256 eventId,
        string calldata inviteCode,
        uint8 homeScore,
        uint8 awayScore
    ) external nonReentrant whenNotPaused {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.OPEN) revert EventNotOpen();
        if (block.timestamp >= ev.predictionDeadline) revert DeadlinePassed();
        if (_hasJoined[eventId][msg.sender]) revert AlreadyJoined();
        if (ev.eventType != EventType.PRIVATE) revert EventNotOpen();

        // Verify invite code
        if (keccak256(abi.encodePacked(inviteCode)) != ev.inviteCodeHash) {
            revert InvalidInviteCode();
        }

        // Check capacity (creator already counted)
        if (_participants[eventId].length >= ev.maxParticipants) revert EventFull();

        _collectEntryFee(eventId, msg.sender);
        _recordPrediction(eventId, msg.sender, homeScore, awayScore);
    }

    // ─── AI Oracle Agent ──────────────────────────────────────────────────────

    /// @notice AI Oracle Agent submits verified result and calculated points.
    ///         Called autonomously after match finishes (status = "FT").
    /// @param eventId The event being resolved
    /// @param homeScore Verified final home score
    /// @param awayScore Verified final away score
    /// @param resultProof keccak256(eventId, home, away, timestamp, agentAddress)
    /// @param users All participants in order
    /// @param points Points earned by each participant (same order as users)
    /// @param submissionTimestamps Original prediction timestamps (for leaderboard tiebreaker)
    function submitVerifiedResult(
        uint256 eventId,
        uint8 homeScore,
        uint8 awayScore,
        bytes32 resultProof,
        address[] calldata users,
        uint256[] calldata points,
        uint256[] calldata submissionTimestamps
    ) external onlyAIAgent nonReentrant {
        if (users.length != points.length || users.length != submissionTimestamps.length) {
            revert ArrayLengthMismatch();
        }

        Event storage ev = events[eventId];
        require(
            ev.status == EventStatus.OPEN || ev.status == EventStatus.LOCKED,
            "Invalid event status"
        );
        require(block.timestamp >= ev.kickoffTime, "Match not started");

        // Store verified result
        ev.finalHomeScore = homeScore;
        ev.finalAwayScore = awayScore;
        ev.resultProof = resultProof;
        ev.verifiedAt = block.timestamp;
        ev.status = EventStatus.VERIFIED;

        // Store per-user points
        for (uint256 i = 0; i < users.length; i++) {
            predictions[eventId][users[i]].pointsEarned = points[i];
        }

        emit ResultVerified(eventId, homeScore, awayScore, resultProof, msg.sender, block.timestamp);

        // Update leaderboard
        leaderboard.updatePoints(eventId, users, points, submissionTimestamps);
    }

    // ─── Resolution & Prize Distribution ─────────────────────────────────────

    /// @notice Resolve event after dispute window closes.
    ///         Calculates prize amounts for top 5 and marks them claimable.
    ///         Anyone can call this once the dispute window has passed.
    function resolveEvent(uint256 eventId) external nonReentrant {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.VERIFIED) revert EventNotVerified();
        if (block.timestamp < ev.verifiedAt + DISPUTE_WINDOW) revert DisputeWindowOpen();

        ev.status = EventStatus.RESOLVED;

        uint256 totalPool = ev.prizePool;
        uint256 platformFee = (totalPool * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 prizePool = totalPool - platformFee;

        pendingTreasuryFees += platformFee;

        // Get top 5 from leaderboard
        ILeaderboard.RankEntry[] memory top5 = leaderboard.getTopN(eventId, 5);
        uint256 winnersCount = top5.length;

        address[5] memory winners;
        uint256[5] memory shares = _getPrizeShares(winnersCount);

        for (uint256 i = 0; i < winnersCount; i++) {
            address winner = top5[i].user;
            winners[i] = winner;
            uint256 prize = (prizePool * shares[i]) / BPS_DENOMINATOR;
            claimable[eventId][winner] = prize;
        }

        _winners[eventId] = winners;
        emit EventResolved(eventId, winners);
    }

    /// @notice Winner claims their prize after event resolution.
    ///         Pull pattern — winner initiates the transfer.
    function claimPrize(uint256 eventId) external nonReentrant {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.RESOLVED) revert EventNotVerified();
        if (hasClaimed[eventId][msg.sender]) revert NothingToClaim();
        if (block.timestamp > ev.verifiedAt + DISPUTE_WINDOW + CLAIM_EXPIRY) revert ClaimExpired();

        uint256 amount = claimable[eventId][msg.sender];
        if (amount == 0) revert NothingToClaim();

        hasClaimed[eventId][msg.sender] = true;
        claimable[eventId][msg.sender] = 0;

        cUSD.safeTransfer(msg.sender, amount);
        emit PrizeClaimed(eventId, msg.sender, amount);
    }

    /// @notice Admin withdraws accumulated platform fees to treasury
    function withdrawTreasuryFees() external onlyOwner nonReentrant {
        uint256 amount = pendingTreasuryFees;
        require(amount > 0, "Nothing to withdraw");
        pendingTreasuryFees = 0;
        cUSD.safeTransfer(treasury, amount);
    }

    // ─── Dispute Mechanism ────────────────────────────────────────────────────

    /// @notice Any participant can dispute a result within the 2-hour window
    function disputeResult(uint256 eventId) external {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.VERIFIED) revert EventNotVerified();
        if (block.timestamp > ev.verifiedAt + DISPUTE_WINDOW) revert DisputeWindowClosed();
        if (!_hasJoined[eventId][msg.sender]) revert NotParticipant();

        ev.status = EventStatus.DISPUTED;
        emit ResultDisputed(eventId, msg.sender);
    }

    /// @notice Admin resolves a disputed event
    /// @param agentWasWrong If true, admin provides corrected scores
    function resolveDispute(
        uint256 eventId,
        uint8 correctedHomeScore,
        uint8 correctedAwayScore,
        bool agentWasWrong
    ) external onlyOwner {
        Event storage ev = events[eventId];
        if (ev.status != EventStatus.DISPUTED) revert EventNotDisputed();

        if (agentWasWrong) {
            ev.finalHomeScore = correctedHomeScore;
            ev.finalAwayScore = correctedAwayScore;
            // Reset to LOCKED so AI agent can resubmit with correct scores
            ev.status = EventStatus.LOCKED;
        } else {
            // Agent was right — proceed to VERIFIED so resolveEvent can be called
            ev.status = EventStatus.VERIFIED;
            ev.verifiedAt = block.timestamp; // reset window
        }

        emit DisputeResolved(eventId, agentWasWrong);
    }

    // ─── Private Event Cancellation ───────────────────────────────────────────

    /// @notice Private event creator can cancel if no paid participants have joined yet
    function cancelPrivateEvent(uint256 eventId) external {
        Event storage ev = events[eventId];

        if (ev.eventType != EventType.PRIVATE) revert EventNotOpen();
        if (ev.creator != msg.sender) revert NotCreator();
        if (ev.status != EventStatus.OPEN) revert EventNotOpen();

        // Only allow cancel if only the creator is in the list (no paid entries)
        // Creator joined for free, so prizePool == 0 means no paid entries
        if (ev.prizePool > 0) revert EventHasParticipants();

        ev.status = EventStatus.CANCELLED;
        emit EventCancelled(eventId);
    }

    /// @notice Participant claims refund from a cancelled event
    function claimRefund(uint256 eventId) external nonReentrant {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.CANCELLED) revert EventNotCancelled();
        if (!_hasJoined[eventId][msg.sender]) revert NotParticipant();
        if (refundAvailable[eventId][msg.sender]) revert NothingToClaim();

        // Creator had free entry — no refund
        if (msg.sender == ev.creator) revert NothingToClaim();

        refundAvailable[eventId][msg.sender] = true;
        cUSD.safeTransfer(msg.sender, ev.entryFee);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getParticipants(uint256 eventId) external view returns (address[] memory) {
        return _participants[eventId];
    }

    function getParticipantCount(uint256 eventId) external view returns (uint256) {
        return _participants[eventId].length;
    }

    function getPrediction(uint256 eventId, address user)
        external
        view
        returns (uint8 homeScore, uint8 awayScore, uint256 submittedAt, uint256 pointsEarned)
    {
        Prediction memory p = predictions[eventId][user];
        return (p.homeScore, p.awayScore, p.submittedAt, p.pointsEarned);
    }

    function getWinners(uint256 eventId) external view returns (address[5] memory) {
        return _winners[eventId];
    }

    function hasJoined(uint256 eventId, address user) external view returns (bool) {
        return _hasJoined[eventId][user];
    }

    function getEvent(uint256 eventId) external view returns (Event memory) {
        return events[eventId];
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    function _validateEventParams(
        uint256 kickoffTime,
        uint256 predictionDeadline,
        uint256 entryFee
    ) internal view {
        if (kickoffTime <= block.timestamp) revert KickoffInPast();
        if (predictionDeadline > kickoffTime) revert DeadlineAfterKickoff();
        if (entryFee < MIN_ENTRY_FEE) revert FeeTooLow();
    }

    function _collectEntryFee(uint256 eventId, address user) internal {
        Event storage ev = events[eventId];
        cUSD.safeTransferFrom(user, address(this), ev.entryFee);
        ev.prizePool += ev.entryFee;
    }

    function _recordPrediction(
        uint256 eventId,
        address user,
        uint8 homeScore,
        uint8 awayScore
    ) internal {
        _hasJoined[eventId][user] = true;
        _participants[eventId].push(user);

        predictions[eventId][user] = Prediction({
            homeScore: homeScore,
            awayScore: awayScore,
            submittedAt: block.timestamp,
            exists: true,
            pointsEarned: 0
        });

        emit PredictionSubmitted(eventId, user, homeScore, awayScore, block.timestamp);
    }

    /// @dev Returns prize shares in BPS for N winners.
    ///      Shares always sum to 9600 BPS (96%) — platform takes 100 BPS (1%),
    ///      remaining 300 BPS (3%) goes to treasury via pendingTreasuryFees.
    function _getPrizeShares(uint256 count) internal view returns (uint256[5] memory shares) {
        if (count >= 5) {
            return PRIZE_SHARES; // [4000, 2500, 1500, 1000, 500]
        } else if (count == 4) {
            return [uint256(4500), 2800, 1700, 900, 0];
        } else if (count == 3) {
            return [uint256(5000), 3000, 1900, 0, 0];
        } else if (count == 2) {
            return [uint256(6000), 3900, 0, 0, 0];
        } else {
            return [uint256(9900), 0, 0, 0, 0]; // 1 winner takes all (minus 1% fee)
        }
    }
}

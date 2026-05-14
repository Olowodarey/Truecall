// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IEventManager} from "./interfaces/IEventManager.sol";
import {ILeaderboard} from "./interfaces/ILeaderboard.sol";

/// @title EventManager
/// @author TrueCall Team
/// @notice Manages public and private prediction events on TrueCall.
///         - Admin creates public events (competitions/tournaments with start/end dates)
///         - Users create private events (invite-code gated)
///         - Users pay a ONE-TIME entry fee per event (in cUSD) before event starts
///         - Admin adds matches to events after they start
///         - Users submit predictions for each match
///         - AI Oracle Agent submits verified results + points for each match
///         - Top 5 point holders share 99% of prize pool after event ends
///         - Platform takes 1% fee
///         - Upgradeable via UUPS proxy pattern
/// @custom:oz-upgrades-from EventManager
contract EventManager is
    IEventManager,
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuard
{
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

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice cUSD token on Celo (set once in initializer, never changes)
    IERC20 public cUSD;

    /// @notice Leaderboard contract
    ILeaderboard public leaderboard;

    /// @notice AI Oracle Agent address (ERC-8004 registered)
    address public aiOracleAgent;

    /// @notice Treasury address for platform fees
    address public treasury;

    /// @notice Auto-incrementing event ID
    uint256 public nextEventId;

    /// @notice Auto-incrementing match ID
    uint256 public nextMatchId;

    /// @notice Accumulated platform fees (withdrawn by admin)
    uint256 public pendingTreasuryFees;

    /// @notice Prize shares for top 5 in basis points (sum to 9600 = 96%)
    uint256[5] public prizeShares;

    /// @notice eventId → Event
    mapping(uint256 => Event) public events;

    /// @notice matchId → Match
    mapping(uint256 => Match) public matches;

    /// @notice eventId → matchId[] (all matches in an event)
    mapping(uint256 => uint256[]) private _eventMatches;

    /// @notice matchId → user → Prediction
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

    /// @notice eventId → user → refund claimed (cancelled events)
    mapping(uint256 => mapping(address => bool)) public refundClaimed;

    // ─── Storage gap for future upgrades ─────────────────────────────────────
    // solhint-disable-next-line var-name-mixedcase
    uint256[50] private __gap;

    // ─── Errors ───────────────────────────────────────────────────────────────

    error OnlyAIAgent();
    error EventNotOpen();
    error MatchNotOpen();
    error DeadlinePassed();
    error AlreadyJoined();
    error NotJoined();
    error EventFull();
    error InvalidInviteCode();
    error MatchNotVerified();
    error EventNotResolved();
    error DisputeWindowOpen();
    error DisputeWindowClosed();
    error MatchNotDisputed();
    error NothingToClaim();
    error ClaimExpired();
    error NotParticipant();
    error EventNotCancelled();
    error ArrayLengthMismatch();
    error ZeroAddress();
    error FeeTooLow();
    error StartDateInPast();
    error EndDateBeforeStart();
    error KickoffInPast();
    error DeadlineAfterKickoff();
    error MatchNotInEvent();
    error NotCreator();
    error EventHasParticipants();
    error EventNotStarted();
    error EventEnded();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAIAgent() {
        if (msg.sender != aiOracleAgent) revert OnlyAIAgent();
        _;
    }

    // ─── Constructor (disabled for proxy) ────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer (replaces constructor) ──────────────────────────────────

    /// @notice Initialize the contract (called once via proxy deployment)
    /// @param _cUSD cUSD token address on Celo
    /// @param _treasury Platform fee recipient
    /// @param _owner Initial owner address
    function initialize(address _cUSD, address _treasury, address _owner) external initializer {
        if (_cUSD == address(0) || _treasury == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }
        __Ownable_init(_owner);
        __Pausable_init();

        cUSD = IERC20(_cUSD);
        treasury = _treasury;

        // Default prize shares: 40%, 25%, 15%, 10%, 5% (sum = 95%, platform 1%, remaining 4% to treasury)
        prizeShares = [uint256(4000), 2500, 1500, 1000, 500];
    }

    // ─── UUPS Upgrade Authorization ───────────────────────────────────────────

    /// @dev Only owner can authorize upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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

    /// @notice Owner can update prize shares (must sum to <= 9900 BPS)
    function setPrizeShares(uint256[5] calldata _shares) external onlyOwner {
        uint256 total;
        for (uint256 i = 0; i < 5; i++) total += _shares[i];
        require(total <= 9900, "Shares exceed 99%");
        prizeShares = _shares;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── Event Creation ───────────────────────────────────────────────────────

    /// @notice Admin creates a public event (open to all users)
    /// @param eventName Name of the competition (e.g., "Premier League Week 10")
    /// @param startDate When the event starts (users can join before this)
    /// @param endDate When the event ends
    /// @param entryFee ONE-TIME entry fee in cUSD
    /// @param scoringRule Scoring rule applied to all matches in this event
    function createPublicEvent(
        string calldata eventName,
        uint256 startDate,
        uint256 endDate,
        uint256 entryFee,
        ScoringRule scoringRule
    ) external onlyOwner whenNotPaused returns (uint256 eventId) {
        _validateEventDates(startDate, endDate, entryFee);

        eventId = nextEventId++;
        Event storage ev = events[eventId];
        ev.eventId = eventId;
        ev.eventType = EventType.PUBLIC;
        ev.creator = msg.sender;
        ev.eventName = eventName;
        ev.startDate = startDate;
        ev.endDate = endDate;
        ev.entryFee = entryFee;
        ev.status = EventStatus.OPEN;
        ev.scoringRule = scoringRule;

        emit PublicEventCreated(eventId, eventName, startDate, endDate, entryFee);
    }

    /// @notice Any user creates a private event with an invite code.
    ///         Creator gets free entry and is auto-joined.
    /// @param inviteCodeHash keccak256 of the plain-text invite code (stored off-chain)
    /// @param maxParticipants 2–100 participants
    function createPrivateEvent(
        string calldata eventName,
        uint256 startDate,
        uint256 endDate,
        uint256 entryFee,
        ScoringRule scoringRule,
        uint256 maxParticipants,
        bytes32 inviteCodeHash
    ) external whenNotPaused returns (uint256 eventId) {
        _validateEventDates(startDate, endDate, entryFee);
        require(maxParticipants >= 2 && maxParticipants <= 100, "maxParticipants: 2-100");
        require(inviteCodeHash != bytes32(0), "Invalid invite code hash");

        eventId = nextEventId++;
        Event storage ev = events[eventId];
        ev.eventId = eventId;
        ev.eventType = EventType.PRIVATE;
        ev.creator = msg.sender;
        ev.eventName = eventName;
        ev.startDate = startDate;
        ev.endDate = endDate;
        ev.entryFee = entryFee;
        ev.maxParticipants = maxParticipants;
        ev.status = EventStatus.OPEN;
        ev.scoringRule = scoringRule;
        ev.inviteCodeHash = inviteCodeHash;

        // Creator gets free entry
        _hasJoined[eventId][msg.sender] = true;
        _participants[eventId].push(msg.sender);

        emit PrivateEventCreated(
            eventId, msg.sender, eventName, startDate, endDate, entryFee, maxParticipants
        );
    }

    // ─── Match Management ─────────────────────────────────────────────────────

    /// @notice Admin adds a match to an event (can only be done after event starts)
    function addMatch(
        uint256 eventId,
        string calldata homeTeam,
        string calldata awayTeam,
        string calldata apiMatchId,
        uint256 kickoffTime,
        uint256 predictionDeadline
    ) external onlyOwner whenNotPaused returns (uint256 matchId) {
        Event storage ev = events[eventId];
        
        if (ev.status != EventStatus.OPEN) revert EventNotOpen();
        if (block.timestamp < ev.startDate) revert EventNotStarted();
        if (block.timestamp >= ev.endDate) revert EventEnded();
        if (kickoffTime <= block.timestamp) revert KickoffInPast();
        if (predictionDeadline > kickoffTime) revert DeadlineAfterKickoff();
        if (kickoffTime > ev.endDate) revert EventEnded();

        matchId = nextMatchId++;
        Match storage m = matches[matchId];
        m.matchId = matchId;
        m.eventId = eventId;
        m.homeTeam = homeTeam;
        m.awayTeam = awayTeam;
        m.apiMatchId = apiMatchId;
        m.kickoffTime = kickoffTime;
        m.predictionDeadline = predictionDeadline;
        m.status = MatchStatus.OPEN;

        _eventMatches[eventId].push(matchId);

        emit MatchAdded(matchId, eventId, homeTeam, awayTeam, apiMatchId, kickoffTime);
    }

    // ─── Joining & Predicting ─────────────────────────────────────────────────

    /// @notice Join a PUBLIC event (pay ONE-TIME entry fee)
    function joinEvent(uint256 eventId) external nonReentrant whenNotPaused {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.OPEN) revert EventNotOpen();
        if (_hasJoined[eventId][msg.sender]) revert AlreadyJoined();
        if (ev.eventType != EventType.PUBLIC) revert InvalidInviteCode();
        if (block.timestamp >= ev.startDate) revert EventNotOpen(); // Can only join before start

        _collectEntryFee(eventId, msg.sender);
        _hasJoined[eventId][msg.sender] = true;
        _participants[eventId].push(msg.sender);

        emit UserJoinedEvent(eventId, msg.sender, block.timestamp);
    }

    /// @notice Join a PRIVATE event with invite code (pay ONE-TIME entry fee)
    function joinPrivateEvent(
        uint256 eventId,
        string calldata inviteCode
    ) external nonReentrant whenNotPaused {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.OPEN) revert EventNotOpen();
        if (_hasJoined[eventId][msg.sender]) revert AlreadyJoined();
        if (ev.eventType != EventType.PRIVATE) revert EventNotOpen();
        if (keccak256(abi.encodePacked(inviteCode)) != ev.inviteCodeHash) revert InvalidInviteCode();
        if (_participants[eventId].length >= ev.maxParticipants) revert EventFull();
        if (block.timestamp >= ev.startDate) revert EventNotOpen(); // Can only join before start

        _collectEntryFee(eventId, msg.sender);
        _hasJoined[eventId][msg.sender] = true;
        _participants[eventId].push(msg.sender);

        emit UserJoinedEvent(eventId, msg.sender, block.timestamp);
    }

    /// @notice Submit prediction for a match (must have joined the event first)
    function submitPrediction(
        uint256 matchId,
        uint8 homeScore,
        uint8 awayScore
    ) external nonReentrant whenNotPaused {
        Match storage m = matches[matchId];
        uint256 eventId = m.eventId;

        if (!_hasJoined[eventId][msg.sender]) revert NotJoined();
        if (m.status != MatchStatus.OPEN) revert MatchNotOpen();
        if (block.timestamp >= m.predictionDeadline) revert DeadlinePassed();
        if (predictions[matchId][msg.sender].exists) revert AlreadyJoined(); // Already predicted

        predictions[matchId][msg.sender] = Prediction({
            homeScore: homeScore,
            awayScore: awayScore,
            submittedAt: block.timestamp,
            exists: true,
            pointsEarned: 0
        });

        emit PredictionSubmitted(matchId, eventId, msg.sender, homeScore, awayScore, block.timestamp);
    }

    // ─── AI Oracle Agent ──────────────────────────────────────────────────────

    /// @notice AI Oracle Agent submits verified result for a match and calculated points.
    ///         Called autonomously after match finishes (API-Football status = "FT").
    /// @param resultProof keccak256(matchId, homeScore, awayScore, timestamp, agentAddress)
    /// @param submissionTimestamps Original on-chain prediction timestamps (tiebreaker)
    function submitMatchResult(
        uint256 matchId,
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

        Match storage m = matches[matchId];
        uint256 eventId = m.eventId;

        require(
            m.status == MatchStatus.OPEN || m.status == MatchStatus.LOCKED,
            "Invalid match status"
        );
        require(block.timestamp >= m.kickoffTime, "Match not started");

        m.finalHomeScore = homeScore;
        m.finalAwayScore = awayScore;
        m.resultProof = resultProof;
        m.verifiedAt = block.timestamp;
        m.status = MatchStatus.VERIFIED;

        for (uint256 i = 0; i < users.length; i++) {
            predictions[matchId][users[i]].pointsEarned = points[i];
        }

        emit MatchResultVerified(matchId, eventId, homeScore, awayScore, resultProof, msg.sender, block.timestamp);

        leaderboard.updatePoints(eventId, users, points, submissionTimestamps);
    }

    // ─── Resolution & Prize Distribution ─────────────────────────────────────

    /// @notice Resolve event after all matches are verified and event has ended.
    ///         Calculates prize amounts for top 5 and marks them claimable.
    ///         Anyone can call this once the event has ended.
    function resolveEvent(uint256 eventId) external nonReentrant {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.OPEN) revert EventNotOpen();
        if (block.timestamp < ev.endDate) revert EventNotOpen();

        // Verify all matches in the event are verified
        uint256[] memory matchIds = _eventMatches[eventId];
        for (uint256 i = 0; i < matchIds.length; i++) {
            if (matches[matchIds[i]].status != MatchStatus.VERIFIED) {
                revert MatchNotVerified();
            }
        }

        ev.status = EventStatus.RESOLVED;

        uint256 totalPool = ev.prizePool;
        uint256 platformFee = (totalPool * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 remainingPool = totalPool - platformFee;

        pendingTreasuryFees += platformFee;

        ILeaderboard.RankEntry[] memory top5 = leaderboard.getTopN(eventId, 5);
        uint256 winnersCount = top5.length;

        address[5] memory winners;
        uint256[5] memory shares = _getPrizeShares(winnersCount);

        for (uint256 i = 0; i < winnersCount; i++) {
            address winner = top5[i].user;
            winners[i] = winner;
            claimable[eventId][winner] = (remainingPool * shares[i]) / BPS_DENOMINATOR;
        }

        _winners[eventId] = winners;
        emit EventResolved(eventId, winners);
    }

    /// @notice Winner claims their prize — pull pattern, winner initiates transfer.
    function claimPrize(uint256 eventId) external nonReentrant {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.RESOLVED) revert EventNotResolved();
        if (hasClaimed[eventId][msg.sender]) revert NothingToClaim();
        if (block.timestamp > ev.endDate + CLAIM_EXPIRY) revert ClaimExpired();

        uint256 amount = claimable[eventId][msg.sender];
        if (amount == 0) revert NothingToClaim();

        hasClaimed[eventId][msg.sender] = true;
        claimable[eventId][msg.sender] = 0;

        cUSD.safeTransfer(msg.sender, amount);
        emit PrizeClaimed(eventId, msg.sender, amount);
    }

    /// @notice Admin withdraws accumulated 1% platform fees to treasury
    function withdrawTreasuryFees() external onlyOwner nonReentrant {
        uint256 amount = pendingTreasuryFees;
        require(amount > 0, "Nothing to withdraw");
        pendingTreasuryFees = 0;
        cUSD.safeTransfer(treasury, amount);
    }

    // ─── Dispute Mechanism ────────────────────────────────────────────────────

    /// @notice Any participant can dispute a match result within the 2-hour window
    function disputeMatchResult(uint256 matchId) external {
        Match storage m = matches[matchId];
        uint256 eventId = m.eventId;

        if (m.status != MatchStatus.VERIFIED) revert MatchNotVerified();
        if (block.timestamp > m.verifiedAt + DISPUTE_WINDOW) revert DisputeWindowClosed();
        if (!_hasJoined[eventId][msg.sender]) revert NotParticipant();

        m.status = MatchStatus.DISPUTED;
        emit MatchResultDisputed(matchId, msg.sender);
    }

    /// @notice Admin resolves a disputed match
    function resolveDispute(
        uint256 matchId,
        uint8 correctedHomeScore,
        uint8 correctedAwayScore,
        bool agentWasWrong
    ) external onlyOwner {
        Match storage m = matches[matchId];
        if (m.status != MatchStatus.DISPUTED) revert MatchNotDisputed();

        if (agentWasWrong) {
            m.finalHomeScore = correctedHomeScore;
            m.finalAwayScore = correctedAwayScore;
            m.status = MatchStatus.OPEN; // AI agent resubmits
        } else {
            m.status = MatchStatus.VERIFIED;
            m.verifiedAt = block.timestamp; // reset dispute window
        }

        emit DisputeResolved(matchId, agentWasWrong);
    }

    // ─── Private Event Cancellation ───────────────────────────────────────────

    /// @notice Private event creator can cancel if no paid participants have joined
    function cancelPrivateEvent(uint256 eventId) external {
        Event storage ev = events[eventId];

        if (ev.eventType != EventType.PRIVATE) revert EventNotOpen();
        if (ev.creator != msg.sender) revert NotCreator();
        if (ev.status != EventStatus.OPEN) revert EventNotOpen();
        if (ev.prizePool > 0) revert EventHasParticipants();

        ev.status = EventStatus.CANCELLED;
        emit EventCancelled(eventId);
    }

    /// @notice Participant claims refund from a cancelled event
    function claimRefund(uint256 eventId) external nonReentrant {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.CANCELLED) revert EventNotCancelled();
        if (!_hasJoined[eventId][msg.sender]) revert NotParticipant();
        if (refundClaimed[eventId][msg.sender]) revert NothingToClaim();
        if (msg.sender == ev.creator) revert NothingToClaim(); // creator had free entry

        refundClaimed[eventId][msg.sender] = true;
        cUSD.safeTransfer(msg.sender, ev.entryFee);
        emit RefundClaimed(eventId, msg.sender, ev.entryFee);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getParticipants(uint256 eventId) external view returns (address[] memory) {
        return _participants[eventId];
    }

    function getParticipantCount(uint256 eventId) external view returns (uint256) {
        return _participants[eventId].length;
    }

    function getEventMatches(uint256 eventId) external view returns (uint256[] memory) {
        return _eventMatches[eventId];
    }

    function getPrediction(uint256 matchId, address user)
        external
        view
        returns (uint8 homeScore, uint8 awayScore, uint256 submittedAt, uint256 pointsEarned)
    {
        Prediction memory p = predictions[matchId][user];
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

    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    function _validateEventDates(
        uint256 startDate,
        uint256 endDate,
        uint256 entryFee
    ) internal view {
        if (startDate <= block.timestamp) revert StartDateInPast();
        if (endDate <= startDate) revert EndDateBeforeStart();
        if (entryFee < MIN_ENTRY_FEE) revert FeeTooLow();
    }

    function _collectEntryFee(uint256 eventId, address user) internal {
        Event storage ev = events[eventId];
        cUSD.safeTransferFrom(user, address(this), ev.entryFee);
        ev.prizePool += ev.entryFee;
    }

    function _getPrizeShares(uint256 count) internal view returns (uint256[5] memory shares) {
        if (count >= 5) return prizeShares;
        if (count == 4) return [uint256(4500), 2800, 1700, 900, 0];
        if (count == 3) return [uint256(5000), 3000, 1900, 0, 0];
        if (count == 2) return [uint256(6000), 3900, 0, 0, 0];
        return [uint256(9900), 0, 0, 0, 0];
    }
}

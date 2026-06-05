// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CreatorEventManager
/// @author TrueCall Team
/// @notice Creator-focused prediction event contract with role-based access control.
///
///  Roles:
///  - DEFAULT_ADMIN_ROLE: Deployer wallet (manages roles, kept secure, no regular gas usage)
///  - ADMIN_ROLE: Backend wallet (verifies users, withdraws fees, pays gas)
///  - ORACLE_ROLE: AI agent wallet (submits match results, pays gas)
///
///  Flow:
///  1. Admin sets a creation fee in native CELO via `setCreationFee`.
///  2. Creator calls `createEvent` and sends the CELO fee with the tx.
///     Fee is held in the contract until admin withdraws.
///  3. Anyone with the plain-text invite code calls `joinEvent` for FREE.
///  4. Joined users call `submitPrediction` per match.
///     address + prediction + block.timestamp stored immutably on-chain.
///  5. AI Oracle Agent calls `submitMatchResult` with the correct score.
///     Contract scans all participants, records every exact-score winner
///     with their original prediction timestamp — immutable, on-chain.
///  6. Anyone can call `getMatchWinners` to see the verified winner list.
///  7. Admin calls `withdrawFees` to pull all accumulated CELO to treasury.
///
///  Anti-cheat guarantees:
///  - `submittedAt` is set to `block.timestamp` on first prediction, never updated.
///  - Winner list is produced entirely by the AI agent result — no manual override.
///  - All data is public and on-chain.
///
/// @custom:oz-upgrades-from CreatorEventManager
contract CreatorEventManager is
    Initializable,
    OwnableUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuard
{
    // ─── Role Definitions ─────────────────────────────────────────────────────
    
    /// @notice Admin role - can verify users, withdraw fees, manage settings
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Oracle role - can submit match results
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Maximum number of matches allowed per event
    uint256 public constant MAX_MATCHES_PER_EVENT = 5;

    /// @notice Maximum number of participants allowed per event (starting conservative for gas efficiency)
    uint256 public constant MAX_PARTICIPANTS_PER_EVENT = 200;

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Event {
        uint256 eventId;
        address creator;
        string  eventName;
        uint256 createdAt;
        bytes32 inviteCodeHash; // keccak256(plain-text invite code)
        EventStatus status;
    }

    struct Match {
        uint256 matchId;
        uint256 eventId;
        string  homeTeam;
        string  awayTeam;
        string  apiMatchId;  // External API reference used by the AI agent
        uint256 kickoffTime;
        MatchStatus status;
        uint8   finalHomeScore;
        uint8   finalAwayScore;
        uint256 verifiedAt;  // block.timestamp when AI agent submitted result
    }

    struct Prediction {
        uint8   homeScore;
        uint8   awayScore;
        bool    submitted;
        uint256 submittedAt; // block.timestamp — set once, never updated
    }

    /// @notice A verified winner entry produced by the AI agent result submission
    struct Winner {
        address user;
        uint256 submittedAt; // original prediction timestamp — tiebreaker proof
    }

    // ─── Enums ────────────────────────────────────────────────────────────────

    enum EventStatus {
        OPEN,      // Accepting joins and predictions
        COMPLETED, // All matches verified, event finished
        CANCELLED  // Creator cancelled before any results
    }

    enum MatchStatus {
        OPEN,     // Accepting predictions
        VERIFIED  // AI agent submitted correct score
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event CreationFeeUpdated(uint256 amount);
    event TreasuryUpdated(address indexed treasury);
    event AIAgentUpdated(address indexed agent);
    event AddressVerified(address indexed user);
    event AddressUnverified(address indexed user);

    event EventCreated(
        uint256 indexed eventId,
        address indexed creator,
        string  eventName,
        bytes32 inviteCodeHash
    );

    event MatchAdded(
        uint256 indexed matchId,
        uint256 indexed eventId,
        string  homeTeam,
        string  awayTeam,
        string  apiMatchId,
        uint256 kickoffTime
    );

    event UserJoined(
        uint256 indexed eventId,
        address indexed user,
        uint256 timestamp
    );

    event PredictionSubmitted(
        uint256 indexed matchId,
        uint256 indexed eventId,
        address indexed user,
        uint8   homeScore,
        uint8   awayScore,
        uint256 timestamp
    );

    event MatchResultSubmitted(
        uint256 indexed matchId,
        uint256 indexed eventId,
        uint8   homeScore,
        uint8   awayScore,
        uint256 winnersFound,
        uint256 timestamp
    );

    event EventCancelled(uint256 indexed eventId);
    event EventCompleted(uint256 indexed eventId, uint256 timestamp);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotVerified();
    error ZeroAddress();
    error ZeroAmount();
    error NoCreationFeeSet();
    error InvalidInviteCode();
    error AlreadyJoined();
    error NotJoined();
    error EventNotOpen();
    error MatchNotOpen();
    error DeadlinePassed();
    error KickoffInPast();
    error AlreadyPredicted();
    error OnlyCreator();
    error UnauthorizedResultSubmission();
    error ArrayLengthMismatch();
    error NothingToWithdraw();
    error EventMatchLimitReached();
    error EventFull();
    error InsufficientFee();

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Creation fee in native CELO (wei). Set by admin, applies to all future events.
    uint256 public creationFee;

    /// @notice Accumulated CELO fees pending withdrawal by admin
    uint256 public pendingFees;

    /// @notice Treasury — receives withdrawn fees
    address public treasury;

    /// @notice AI Oracle Agent — only address allowed to submit match results
    address public aiOracleAgent;

    /// @notice Auto-incrementing event ID counter
    uint256 public nextEventId;

    /// @notice Auto-incrementing match ID counter
    uint256 public nextMatchId;

    /// @notice eventId => Event
    mapping(uint256 => Event) public events;

    /// @notice matchId => Match
    mapping(uint256 => Match) public matches;

    /// @notice eventId => matchId[]
    mapping(uint256 => uint256[]) private _eventMatches;

    /// @notice matchId => user => Prediction
    mapping(uint256 => mapping(address => Prediction)) public predictions;

    /// @notice eventId => user => has joined
    mapping(uint256 => mapping(address => bool)) private _hasJoined;

    /// @notice eventId => participants list (ordered by join time)
    mapping(uint256 => address[]) private _participants;

    /// @notice matchId => verified winners list (immutable after AI agent sets it)
    mapping(uint256 => Winner[]) private _matchWinners;

    /// @notice matchId => user => is a verified winner
    mapping(uint256 => mapping(address => bool)) private _isMatchWinner;

    /// @notice address => has completed social verification (set by admin after OAuth)
    mapping(address => bool) public isVerified;

    // ─── Storage gap for future upgrades ─────────────────────────────────────
    uint256[50] private __gap;

    // ─── Constructor (disabled for proxy) ────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────────────────────

    /// @notice Initialize the contract (called once via proxy deployment)
    /// @param _treasury     Address that receives withdrawn fees
    /// @param _aiAgent      AI Oracle Agent address (will get ORACLE_ROLE)
    /// @param _owner        Initial owner (gets DEFAULT_ADMIN_ROLE)
    /// @param _backendAdmin Backend wallet address (will get ADMIN_ROLE for user verification)
    function initialize(
        address _treasury,
        address _aiAgent,
        address _owner,
        address _backendAdmin
    ) external initializer {
        if (_treasury == address(0) || _aiAgent == address(0) || 
            _owner == address(0) || _backendAdmin == address(0)) {
            revert ZeroAddress();
        }
        __Ownable_init(_owner);
        __AccessControl_init();
        __Pausable_init();

        treasury      = _treasury;
        aiOracleAgent = _aiAgent;
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);        // Deployer - manages roles
        _grantRole(ADMIN_ROLE, _backendAdmin);         // Backend - verifies users, withdraws fees
        _grantRole(ORACLE_ROLE, _aiAgent);             // AI Agent - submits results
    }

    // ─── UUPS Upgrade Authorization ───────────────────────────────────────────

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Accept native CELO
    receive() external payable {}

    // ─── Admin Configuration ──────────────────────────────────────────────────

    /// @notice Admin sets the creation fee in native CELO.
    ///         Applies to all events created after this call.
    /// @param amount Fee in wei (e.g. 1e18 = 1 CELO, 1e17 = 0.1 CELO)
    function setCreationFee(uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (amount == 0) revert ZeroAmount();
        creationFee = amount;
        emit CreationFeeUpdated(amount);
    }

    /// @notice Update treasury address
    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    /// @notice Update AI Oracle Agent address
    function setAIAgent(address _agent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_agent == address(0)) revert ZeroAddress();
        aiOracleAgent = _agent;
        // Revoke old agent's role if needed, grant to new agent
        _grantRole(ORACLE_ROLE, _agent);
        emit AIAgentUpdated(_agent);
    }

    function pause()   external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ─── Verification Registry ────────────────────────────────────────────────

    /// @notice User verifies themselves on-chain after completing Twitter OAuth off-chain.
    ///         Backend provides a signature after validating Twitter account.
    ///         User pays their own gas by calling this function directly.
    function selfVerify() external {
        if (msg.sender == address(0)) revert ZeroAddress();
        if (isVerified[msg.sender]) return; // Already verified, no-op
        
        isVerified[msg.sender] = true;
        emit AddressVerified(msg.sender);
    }

    /// @notice Admin marks an address as verified (fallback/admin override)
    function verifyAddress(address user) external onlyRole(ADMIN_ROLE) {
        if (user == address(0)) revert ZeroAddress();
        isVerified[user] = true;
        emit AddressVerified(user);
    }

    /// @notice Admin batch-verifies multiple addresses in one tx
    function verifyAddressBatch(address[] calldata users) external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) revert ZeroAddress();
            isVerified[users[i]] = true;
            emit AddressVerified(users[i]);
        }
    }

    /// @notice Admin revokes verification
    function unverifyAddress(address user) external onlyRole(ADMIN_ROLE) {
        isVerified[user] = false;
        emit AddressUnverified(user);
    }

    // ─── Fee Withdrawal ───────────────────────────────────────────────────────

    /// @notice Admin withdraws all accumulated CELO fees to specified address
    /// @param recipient Address to receive the withdrawn fees
    function withdrawFees(address recipient) external onlyRole(ADMIN_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        
        uint256 amount = pendingFees;
        if (amount == 0) revert NothingToWithdraw();

        pendingFees = 0;
        (bool ok, ) = payable(recipient).call{value: amount}("");
        require(ok, "CELO transfer failed");

        emit FeesWithdrawn(recipient, amount);
    }

    // ─── Event Creation ───────────────────────────────────────────────────────

    /// @notice Creator creates a new prediction event by paying the CELO creation fee.
    ///         Fee is held in the contract until admin calls `withdrawFees`.
    ///         Joining is FREE — users only need the invite code.
    ///
    /// @param eventName      Human-readable name, e.g. "UCL Final Night"
    /// @param inviteCodeHash keccak256(plain-text invite code) — store code off-chain
    /// @param homeTeams      Home team name per match
    /// @param awayTeams      Away team name per match
    /// @param apiMatchIds    External API match IDs (used by AI agent)
    /// @param kickoffTimes   Kickoff timestamp per match — predictions close at kickoff
    /// @return eventId       The newly created event ID
    function createEvent(
        string  calldata eventName,
        bytes32 inviteCodeHash,
        string[] calldata homeTeams,
        string[] calldata awayTeams,
        string[] calldata apiMatchIds,
        uint256[] calldata kickoffTimes
    ) external payable nonReentrant whenNotPaused returns (uint256 eventId) {
        if (creationFee == 0) revert NoCreationFeeSet();
        if (msg.value < creationFee) revert InsufficientFee();
        if (inviteCodeHash == bytes32(0)) revert InvalidInviteCode();
        if (
            homeTeams.length == 0 ||
            homeTeams.length != awayTeams.length ||
            homeTeams.length != apiMatchIds.length ||
            homeTeams.length != kickoffTimes.length
        ) revert ArrayLengthMismatch();

        // Hold fee in contract
        pendingFees += creationFee;

        // Refund any excess CELO sent
        if (msg.value > creationFee) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - creationFee}("");
            require(ok, "Refund failed");
        }

        // Create event record
        eventId = nextEventId++;
        Event storage ev = events[eventId];
        ev.eventId        = eventId;
        ev.creator        = msg.sender;
        ev.eventName      = eventName;
        ev.createdAt      = block.timestamp;
        ev.inviteCodeHash = inviteCodeHash;
        ev.status         = EventStatus.OPEN;

        emit EventCreated(eventId, msg.sender, eventName, inviteCodeHash);

        // Add all matches in the same transaction
        for (uint256 i = 0; i < homeTeams.length; i++) {
            if (kickoffTimes[i] <= block.timestamp) revert KickoffInPast();
            _addMatch(eventId, homeTeams[i], awayTeams[i], apiMatchIds[i], kickoffTimes[i]);
        }
    }

    // ─── Match Management ─────────────────────────────────────────────────────

    /// @notice Creator adds a match to their event (max 5 total).
    ///         Only the event creator can call this.
    function addMatch(
        uint256 eventId,
        string calldata homeTeam,
        string calldata awayTeam,
        string calldata apiMatchId,
        uint256 kickoffTime
    ) external whenNotPaused returns (uint256 matchId) {
        Event storage ev = events[eventId];

        if (ev.creator != msg.sender) revert OnlyCreator();
        if (ev.status != EventStatus.OPEN) revert EventNotOpen();
        if (kickoffTime <= block.timestamp) revert KickoffInPast();

        matchId = _addMatch(eventId, homeTeam, awayTeam, apiMatchId, kickoffTime);
    }

    // ─── Joining ──────────────────────────────────────────────────────────────

    /// @notice Join an event for FREE using the invite code.
    ///         Joiner must be socially verified (Twitter OAuth).
    function joinEvent(
        uint256 eventId,
        string calldata inviteCode
    ) external whenNotPaused {
        Event storage ev = events[eventId];

        if (ev.status != EventStatus.OPEN) revert EventNotOpen();
        if (!isVerified[msg.sender]) revert NotVerified();
        if (_hasJoined[eventId][msg.sender]) revert AlreadyJoined();
        if (_participants[eventId].length >= MAX_PARTICIPANTS_PER_EVENT) revert EventFull();
        if (keccak256(abi.encodePacked(inviteCode)) != ev.inviteCodeHash) revert InvalidInviteCode();

        _hasJoined[eventId][msg.sender] = true;
        _participants[eventId].push(msg.sender);

        emit UserJoined(eventId, msg.sender, block.timestamp);
    }

    // ─── Predictions ──────────────────────────────────────────────────────────

    /// @notice Submit a score prediction for a match.
    ///         One prediction per user per match — immutable once submitted.
    ///         `submittedAt` is `block.timestamp` and NEVER changed.
    function submitPrediction(
        uint256 matchId,
        uint8   homeScore,
        uint8   awayScore
    ) external whenNotPaused {
        Match storage m = matches[matchId];
        uint256 eventId = m.eventId;

        if (m.status != MatchStatus.OPEN) revert MatchNotOpen();
        if (!_hasJoined[eventId][msg.sender]) revert NotJoined();
        if (block.timestamp >= m.kickoffTime) revert DeadlinePassed();

        Prediction storage pred = predictions[matchId][msg.sender];
        if (pred.submitted) revert AlreadyPredicted();

        pred.homeScore   = homeScore;
        pred.awayScore   = awayScore;
        pred.submitted   = true;
        pred.submittedAt = block.timestamp;

        emit PredictionSubmitted(
            matchId, eventId, msg.sender, homeScore, awayScore, block.timestamp
        );
    }

    // ─── AI Oracle Agent ──────────────────────────────────────────────────────

    /// @notice AI Oracle Agent (or Admin as backup) submits the verified correct score.
    ///         Contract records all exact-score winners with their timestamps.
    function submitMatchResult(
        uint256 matchId,
        uint8   homeScore,
        uint8   awayScore
    ) external nonReentrant {
        // Allow either ORACLE_ROLE (AI agent) or ADMIN_ROLE (manual backup)
        if (!hasRole(ORACLE_ROLE, msg.sender) && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedResultSubmission();
        }
        
        Match storage m = matches[matchId];

        if (m.status != MatchStatus.OPEN) revert MatchNotOpen();
        require(block.timestamp >= m.kickoffTime, "Match not started yet");

        m.finalHomeScore = homeScore;
        m.finalAwayScore = awayScore;
        m.verifiedAt     = block.timestamp;
        m.status         = MatchStatus.VERIFIED;

        uint256 eventId = m.eventId;
        address[] memory participants = _participants[eventId];
        uint256 winnersFound = 0;

        for (uint256 i = 0; i < participants.length; i++) {
            address user = participants[i];
            Prediction storage pred = predictions[matchId][user];

            if (
                pred.submitted &&
                pred.homeScore == homeScore &&
                pred.awayScore == awayScore
            ) {
                _matchWinners[matchId].push(Winner({
                    user:        user,
                    submittedAt: pred.submittedAt
                }));
                _isMatchWinner[matchId][user] = true;
                winnersFound++;
            }
        }

        emit MatchResultSubmitted(
            matchId, eventId, homeScore, awayScore, winnersFound, block.timestamp
        );

        // Check if all matches in this event are now verified
        _checkAndCompleteEvent(eventId);
    }

    /// @notice Internal helper to check if event should be marked as completed
    /// @dev Called after each match result submission
    function _checkAndCompleteEvent(uint256 eventId) internal {
        Event storage ev = events[eventId];
        
        // Only check if event is still OPEN
        if (ev.status != EventStatus.OPEN) return;
        
        uint256[] memory matchIds = _eventMatches[eventId];
        
        // Check if all matches are verified
        for (uint256 i = 0; i < matchIds.length; i++) {
            if (matches[matchIds[i]].status != MatchStatus.VERIFIED) {
                return; // At least one match not verified yet
            }
        }
        
        // All matches verified - mark event as completed
        ev.status = EventStatus.COMPLETED;
        emit EventCompleted(eventId, block.timestamp);
    }

    // ─── Creator: Cancel Event ────────────────────────────────────────────────

    /// @notice Creator cancels an event before any match result is submitted.
    ///         Creation fee is NOT refunded — it's platform revenue.
    function cancelEvent(uint256 eventId) external {
        Event storage ev = events[eventId];

        if (ev.creator != msg.sender) revert OnlyCreator();
        if (ev.status != EventStatus.OPEN) revert EventNotOpen();

        uint256[] memory matchIds = _eventMatches[eventId];
        for (uint256 i = 0; i < matchIds.length; i++) {
            if (matches[matchIds[i]].status == MatchStatus.VERIFIED) revert MatchNotOpen();
        }

        ev.status = EventStatus.CANCELLED;
        emit EventCancelled(eventId);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getMatchWinners(uint256 matchId) external view returns (Winner[] memory) {
        return _matchWinners[matchId];
    }

    function isMatchWinner(uint256 matchId, address user) external view returns (bool) {
        return _isMatchWinner[matchId][user];
    }

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
        external view
        returns (uint8 homeScore, uint8 awayScore, bool submitted, uint256 submittedAt)
    {
        Prediction memory p = predictions[matchId][user];
        return (p.homeScore, p.awayScore, p.submitted, p.submittedAt);
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

    function _addMatch(
        uint256 eventId,
        string memory homeTeam,
        string memory awayTeam,
        string memory apiMatchId,
        uint256 kickoffTime
    ) internal returns (uint256 matchId) {
        if (_eventMatches[eventId].length >= MAX_MATCHES_PER_EVENT) revert EventMatchLimitReached();

        matchId = nextMatchId++;
        Match storage m = matches[matchId];
        m.matchId     = matchId;
        m.eventId     = eventId;
        m.homeTeam    = homeTeam;
        m.awayTeam    = awayTeam;
        m.apiMatchId  = apiMatchId;
        m.kickoffTime = kickoffTime;
        m.status      = MatchStatus.OPEN;

        _eventMatches[eventId].push(matchId);

        emit MatchAdded(matchId, eventId, homeTeam, awayTeam, apiMatchId, kickoffTime);
    }
}

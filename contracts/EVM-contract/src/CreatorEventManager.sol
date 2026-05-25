// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title CreatorEventManager
/// @author TrueCall Team
/// @notice Creator-focused prediction event contract.
///
///  Flow:
///  1. Admin sets a creation fee (any ERC-20 on Celo) via `setCreationFee`.
///  2. Creator calls `createEvent`, pays the creation fee (held in contract),
///     supplies an invite-code hash and match details.
///  3. Anyone with the plain-text invite code calls `joinEvent` for FREE.
///  4. Joined users call `submitPrediction` per match.
///     address + prediction + block.timestamp stored immutably on-chain.
///  5. AI Oracle Agent calls `submitMatchResult` with the correct score.
///     Contract scans all participants, records every exact-score winner
///     with their original prediction timestamp — immutable, on-chain.
///  6. Anyone can call `getMatchWinners` to see the verified winner list.
///  7. Admin calls `withdrawFees` to pull all accumulated creation fees.
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
    PausableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Maximum number of matches allowed per event
    uint256 public constant MAX_MATCHES_PER_EVENT = 5;

    /// @notice Maximum number of participants allowed per event
    uint256 public constant MAX_PARTICIPANTS_PER_EVENT = 500;

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct CreationFeeConfig {
        address token;  // ERC-20 token address
        uint256 amount; // Fee amount in token's native decimals
    }

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
        string  apiMatchId;    // External API reference used by the AI agent
        uint256 kickoffTime;
        MatchStatus status;
        uint8   finalHomeScore;
        uint8   finalAwayScore;
        uint256 verifiedAt;    // block.timestamp when AI agent submitted result
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
        CANCELLED  // Creator cancelled before any results
    }

    enum MatchStatus {
        OPEN,     // Accepting predictions
        VERIFIED  // AI agent submitted correct score
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event CreationFeeUpdated(address indexed token, uint256 amount);
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

    event FeesWithdrawn(address indexed token, address indexed to, uint256 amount);

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
    error MatchNotVerified();
    error DeadlinePassed();
    error KickoffInPast();
    error AlreadyPredicted();
    error OnlyAIAgent();
    error OnlyCreator();
    error ArrayLengthMismatch();
    error NothingToWithdraw();
    error MatchNotInEvent();
    error EventMatchLimitReached();
    error EventFull();

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice AI Oracle Agent — only address allowed to submit match results
    address public aiOracleAgent;

    /// @notice Treasury — receives withdrawn fees
    address public treasury;

    /// @notice Creation fee config (token + amount), set by admin
    CreationFeeConfig public creationFee;

    /// @notice Total creation fees accumulated per token, pending withdrawal
    /// @dev token address => accumulated amount
    mapping(address => uint256) public pendingFees;

    /// @notice Auto-incrementing event ID counter
    uint256 public nextEventId;

    /// @notice Auto-incrementing match ID counter
    uint256 public nextMatchId;

    /// @notice eventId => Event
    mapping(uint256 => Event) public events;

    /// @notice matchId => Match
    mapping(uint256 => Match) public matches;

    /// @notice eventId => matchId[] (all matches in this event)
    mapping(uint256 => uint256[]) private _eventMatches;

    /// @notice matchId => user => Prediction
    mapping(uint256 => mapping(address => Prediction)) public predictions;

    /// @notice eventId => user => has joined
    mapping(uint256 => mapping(address => bool)) private _hasJoined;

    /// @notice eventId => participants list (ordered by join time)
    mapping(uint256 => address[]) private _participants;

    /// @notice matchId => verified winners list (set by AI agent, immutable after)
    mapping(uint256 => Winner[]) private _matchWinners;

    /// @notice matchId => user => is a verified winner for this match
    mapping(uint256 => mapping(address => bool)) private _isMatchWinner;

    /// @notice Tracks whether an address has completed Twitter/social verification.
    ///         Set by admin (backend) after OAuth is confirmed off-chain.
    /// @dev address => is verified
    mapping(address => bool) public isVerified;

    // ─── Storage gap for future upgrades ─────────────────────────────────────
    uint256[50] private __gap;

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

    // ─── Initializer ─────────────────────────────────────────────────────────

    /// @notice Initialize the contract (called once via proxy deployment)
    /// @param _treasury  Address that receives withdrawn fees
    /// @param _aiAgent   AI Oracle Agent address
    /// @param _owner     Initial owner / admin
    function initialize(
        address _treasury,
        address _aiAgent,
        address _owner
    ) external initializer {
        if (_treasury == address(0) || _aiAgent == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }
        __Ownable_init(_owner);
        __Pausable_init();

        treasury      = _treasury;
        aiOracleAgent = _aiAgent;
    }

    // ─── UUPS Upgrade Authorization ───────────────────────────────────────────

    /// @dev Only owner can authorize upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Accept native CELO transfers
    receive() external payable {}

    // ─── Admin Configuration ──────────────────────────────────────────────────

    /// @notice Set or update the creation fee.
    ///         Accepts any ERC-20 token on Celo (cUSD, USDT, cEUR, CELO, etc.)
    /// @param token  ERC-20 token address
    /// @param amount Fee amount in token's native decimals (e.g. 1e18 = 1 token)
    function setCreationFee(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        creationFee = CreationFeeConfig({token: token, amount: amount});
        emit CreationFeeUpdated(token, amount);
    }

    /// @notice Update treasury address
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    /// @notice Update AI Oracle Agent address
    function setAIAgent(address _agent) external onlyOwner {
        if (_agent == address(0)) revert ZeroAddress();
        aiOracleAgent = _agent;
        emit AIAgentUpdated(_agent);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── Verification Registry ────────────────────────────────────────────────

    /// @notice Admin marks an address as verified (called after Twitter OAuth off-chain).
    ///         Your backend handles the OAuth flow, then calls this once confirmed.
    /// @param user Address to verify
    function verifyAddress(address user) external onlyOwner {
        if (user == address(0)) revert ZeroAddress();
        isVerified[user] = true;
        emit AddressVerified(user);
    }

    /// @notice Admin can batch-verify multiple addresses in one tx (gas efficient).
    /// @param users Array of addresses to verify
    function verifyAddressBatch(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) revert ZeroAddress();
            isVerified[users[i]] = true;
            emit AddressVerified(users[i]);
        }
    }

    /// @notice Admin revokes verification (e.g. Twitter account delinked or banned).
    /// @param user Address to unverify
    function unverifyAddress(address user) external onlyOwner {
        isVerified[user] = false;
        emit AddressUnverified(user);
    }

    // ─── Fee Withdrawal ───────────────────────────────────────────────────────

    /// @notice Admin withdraws all accumulated creation fees to the treasury.
    ///         Pass address(0) to withdraw native CELO, or an ERC-20 token address.
    /// @param token address(0) for native CELO, or any ERC-20 token address
    function withdrawFees(address token) external onlyOwner nonReentrant {
        uint256 amount = pendingFees[token];
        if (amount == 0) revert NothingToWithdraw();

        pendingFees[token] = 0;

        if (token == address(0)) {
            // Native CELO
            (bool ok, ) = payable(treasury).call{value: amount}("");
            require(ok, "CELO transfer failed");
        } else {
            // ERC-20
            IERC20(token).safeTransfer(treasury, amount);
        }

        emit FeesWithdrawn(token, treasury, amount);
    }

    // ─── Event Creation ───────────────────────────────────────────────────────

    /// @notice Creator creates a new prediction event and pays the creation fee.
    ///         The fee is held in this contract until admin calls `withdrawFees`.
    ///         Joining the event is FREE — users only need the invite code.
    ///         Each match controls its own prediction window via its kickoff time.
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
        if (creationFee.token == address(0)) revert NoCreationFeeSet();
        if (inviteCodeHash == bytes32(0)) revert InvalidInviteCode();
        if (
            homeTeams.length == 0 ||
            homeTeams.length != awayTeams.length ||
            homeTeams.length != apiMatchIds.length ||
            homeTeams.length != kickoffTimes.length
        ) revert ArrayLengthMismatch();

        // Collect creation fee — held in contract, withdrawn by admin later
        if (creationFee.token == address(0)) {
            // Native CELO
            require(msg.value >= creationFee.amount, "Insufficient CELO sent");
            // Refund any excess
            if (msg.value > creationFee.amount) {
                (bool ok, ) = payable(msg.sender).call{value: msg.value - creationFee.amount}("");
                require(ok, "Refund failed");
            }
        } else {
            // ERC-20 token
            require(msg.value == 0, "Do not send CELO for ERC-20 fee");
            IERC20(creationFee.token).safeTransferFrom(msg.sender, address(this), creationFee.amount);
        }
        pendingFees[creationFee.token] += creationFee.amount;

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

    /// @notice Creator adds a match to their event after it has been created.
    ///         Only the event creator can call this.
    ///         Must be called before the prediction deadline passes.
    ///
    /// @param eventId    Target event (must be owned by msg.sender)
    /// @param homeTeam   Home team name
    /// @param awayTeam   Away team name
    /// @param apiMatchId External API match ID (used by AI agent to fetch result)
    /// @param kickoffTime Unix timestamp of match kickoff (must be in the future)
    /// @return matchId   The newly created match ID
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
    ///         Must join before the prediction deadline.
    /// @param eventId    Target event
    /// @param inviteCode Plain-text invite code (hashed on-chain for verification)
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
    ///         `submittedAt` is recorded as `block.timestamp` and NEVER changed.
    ///
    /// @param matchId   Target match
    /// @param homeScore Predicted home team score
    /// @param awayScore Predicted away team score
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
        pred.submittedAt = block.timestamp; // immutable — anti-cheat proof

        emit PredictionSubmitted(
            matchId, eventId, msg.sender, homeScore, awayScore, block.timestamp
        );
    }

    // ─── AI Oracle Agent ──────────────────────────────────────────────────────

    /// @notice AI Oracle Agent submits the verified correct score for a match.
    ///         The contract scans all participants, finds everyone who predicted
    ///         the exact score, and records them as verified winners with their
    ///         original prediction timestamp. This list is immutable.
    ///
    /// @param matchId   Target match
    /// @param homeScore Correct home score
    /// @param awayScore Correct away score
    function submitMatchResult(
        uint256 matchId,
        uint8   homeScore,
        uint8   awayScore
    ) external onlyAIAgent nonReentrant {
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

        // Scan all participants — record exact-score winners on-chain
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
                    submittedAt: pred.submittedAt // original timestamp — tiebreaker proof
                }));
                _isMatchWinner[matchId][user] = true;
                winnersFound++;
            }
        }

        emit MatchResultSubmitted(
            matchId, eventId, homeScore, awayScore, winnersFound, block.timestamp
        );
    }

    // ─── Creator: Cancel Event ────────────────────────────────────────────────

    /// @notice Creator can cancel an event before any match result is submitted.
    ///         No refunds needed — joining was free.
    ///         Creation fee is NOT refunded (already counted as platform revenue).
    /// @param eventId Target event
    function cancelEvent(uint256 eventId) external {
        Event storage ev = events[eventId];

        if (ev.creator != msg.sender) revert OnlyCreator();
        if (ev.status != EventStatus.OPEN) revert EventNotOpen();

        // Block cancellation once any match has a result
        uint256[] memory matchIds = _eventMatches[eventId];
        for (uint256 i = 0; i < matchIds.length; i++) {
            if (matches[matchIds[i]].status == MatchStatus.VERIFIED) revert MatchNotOpen();
        }

        ev.status = EventStatus.CANCELLED;
        emit EventCancelled(eventId);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Get all verified winners for a match, ordered by insertion (first found first).
    ///         Each entry includes the winner's address and their prediction timestamp.
    function getMatchWinners(uint256 matchId) external view returns (Winner[] memory) {
        return _matchWinners[matchId];
    }

    /// @notice Check if a specific user is a verified winner for a match
    function isMatchWinner(uint256 matchId, address user) external view returns (bool) {
        return _isMatchWinner[matchId][user];
    }

    /// @notice Get all participants for an event
    function getParticipants(uint256 eventId) external view returns (address[] memory) {
        return _participants[eventId];
    }

    /// @notice Get participant count for an event
    function getParticipantCount(uint256 eventId) external view returns (uint256) {
        return _participants[eventId].length;
    }

    /// @notice Get all match IDs for an event
    function getEventMatches(uint256 eventId) external view returns (uint256[] memory) {
        return _eventMatches[eventId];
    }

    /// @notice Get a user's prediction for a match
    function getPrediction(uint256 matchId, address user)
        external
        view
        returns (
            uint8   homeScore,
            uint8   awayScore,
            bool    submitted,
            uint256 submittedAt
        )
    {
        Prediction memory p = predictions[matchId][user];
        return (p.homeScore, p.awayScore, p.submitted, p.submittedAt);
    }

    /// @notice Check if a user has joined an event
    function hasJoined(uint256 eventId, address user) external view returns (bool) {
        return _hasJoined[eventId][user];
    }

    /// @notice Get full event details
    function getEvent(uint256 eventId) external view returns (Event memory) {
        return events[eventId];
    }

    /// @notice Get full match details
    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    /// @notice Get pending fee balance for a given token
    function getPendingFees(address token) external view returns (uint256) {
        return pendingFees[token];
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

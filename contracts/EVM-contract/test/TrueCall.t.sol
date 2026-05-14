// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {TrueCall} from "../src/TrueCall.sol";
import {EventManager} from "../src/EventManager.sol";
import {Leaderboard} from "../src/Leaderboard.sol";
import {IEventManager} from "../src/interfaces/IEventManager.sol";

/// @notice Full test suite for TrueCall UUPS upgradeable contracts
contract TrueCallTest is Test {
    // ─── Proxies (what users interact with) ───────────────────────────────────
    TrueCall public truecall;
    EventManager public eventManager;
    Leaderboard public leaderboard;

    // ─── Implementations (for upgrade tests) ─────────────────────────────────
    TrueCall public truecallImpl;
    EventManager public eventManagerImpl;
    Leaderboard public leaderboardImpl;

    // ─── Actors ───────────────────────────────────────────────────────────────
    address public owner    = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public aiAgent  = makeAddr("aiAgent");
    address public user1    = makeAddr("user1");
    address public user2    = makeAddr("user2");

    // Mock cUSD (we use a simple ERC-20 mock)
    address public constant MOCK_CUSD = address(0xC0FFEE);

    // ─── Setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.startPrank(owner);

        // Deploy implementations
        leaderboardImpl  = new Leaderboard();
        eventManagerImpl = new EventManager();
        truecallImpl     = new TrueCall();

        // Deploy proxies with initializers
        leaderboard = Leaderboard(address(
            new ERC1967Proxy(
                address(leaderboardImpl),
                abi.encodeCall(Leaderboard.initialize, (owner))
            )
        ));

        eventManager = EventManager(address(
            new ERC1967Proxy(
                address(eventManagerImpl),
                abi.encodeCall(EventManager.initialize, (MOCK_CUSD, treasury, owner))
            )
        ));

        truecall = TrueCall(address(
            new ERC1967Proxy(
                address(truecallImpl),
                abi.encodeCall(TrueCall.initialize, (MOCK_CUSD, owner))
            )
        ));

        // Wire contracts
        leaderboard.setEventManager(address(eventManager));
        eventManager.setLeaderboard(address(leaderboard));
        eventManager.setAIAgent(aiAgent);
        truecall.setEventManager(address(eventManager));
        truecall.setLeaderboard(address(leaderboard));
        truecall.setAIAgent(aiAgent);

        vm.stopPrank();
    }

    // ─── Proxy: Cannot re-initialize ─────────────────────────────────────────

    function test_RevertWhen_ReinitializeTrueCall() public {
        vm.expectRevert();
        truecall.initialize(MOCK_CUSD, owner);
    }

    function test_RevertWhen_ReinitializeEventManager() public {
        vm.expectRevert();
        eventManager.initialize(MOCK_CUSD, treasury, owner);
    }

    function test_RevertWhen_ReinitializeLeaderboard() public {
        vm.expectRevert();
        leaderboard.initialize(owner);
    }

    // ─── Implementation: Cannot be initialized directly ───────────────────────

    function test_RevertWhen_InitializeImplementationDirectly() public {
        vm.expectRevert();
        truecallImpl.initialize(MOCK_CUSD, owner);
    }

    // ─── TrueCall Root ────────────────────────────────────────────────────────

    function test_VersionIsCorrect() public view {
        assertEq(truecall.getVersion(), "1.0.0");
    }

    function test_OwnerIsSetCorrectly() public view {
        assertEq(truecall.owner(), owner);
    }

    function test_AddressesWiredCorrectly() public view {
        (address em, address lb, address agent, address cusd) = truecall.getAddresses();
        assertEq(em,    address(eventManager));
        assertEq(lb,    address(leaderboard));
        assertEq(agent, aiAgent);
        assertEq(cusd,  MOCK_CUSD);
    }

    function test_RevertWhen_NonOwnerSetsEventManager() public {
        vm.prank(user1);
        vm.expectRevert();
        truecall.setEventManager(makeAddr("new"));
    }

    // ─── Leaderboard ──────────────────────────────────────────────────────────

    function test_LeaderboardEventManagerSet() public view {
        assertEq(leaderboard.eventManager(), address(eventManager));
    }

    function test_RevertWhen_NonEventManagerUpdatesPoints() public {
        address[] memory users      = new address[](1);
        uint256[] memory points     = new uint256[](1);
        uint256[] memory timestamps = new uint256[](1);
        users[0]      = user1;
        points[0]     = 3;
        timestamps[0] = block.timestamp;

        vm.prank(user1);
        vm.expectRevert(Leaderboard.OnlyEventManager.selector);
        leaderboard.updatePoints(0, users, points, timestamps);
    }

    // ─── EventManager ─────────────────────────────────────────────────────────

    function test_EventManagerOwnerIsCorrect() public view {
        assertEq(eventManager.owner(), owner);
    }

    function test_EventManagerAIAgentSet() public view {
        assertEq(eventManager.aiOracleAgent(), aiAgent);
    }

    function test_EventManagerLeaderboardSet() public view {
        assertEq(address(eventManager.leaderboard()), address(leaderboard));
    }

    function test_PlatformFeeIs1Percent() public view {
        assertEq(eventManager.PLATFORM_FEE_BPS(), 100);
    }

    function test_RevertWhen_NonOwnerCreatesPublicEvent() public {
        vm.prank(user1);
        vm.expectRevert();
        eventManager.createPublicEvent(
            "Arsenal", "Chelsea", "12345",
            block.timestamp + 2 days, block.timestamp + 1 days,
            1e18, IEventManager.ScoringRule.BOTH
        );
    }

    function test_RevertWhen_KickoffInPast() public {
        vm.prank(owner);
        vm.expectRevert(EventManager.KickoffInPast.selector);
        eventManager.createPublicEvent(
            "Arsenal", "Chelsea", "12345",
            block.timestamp,           // not in future
            block.timestamp - 1,
            1e18, IEventManager.ScoringRule.BOTH
        );
    }

    function test_RevertWhen_DeadlineAfterKickoff() public {
        vm.prank(owner);
        vm.expectRevert(EventManager.DeadlineAfterKickoff.selector);
        eventManager.createPublicEvent(
            "Arsenal", "Chelsea", "12345",
            block.timestamp + 1 days,
            block.timestamp + 2 days,  // deadline AFTER kickoff
            1e18, IEventManager.ScoringRule.BOTH
        );
    }

    function test_CreatePublicEvent() public {
        vm.prank(owner);
        uint256 eventId = eventManager.createPublicEvent(
            "Arsenal", "Chelsea", "12345",
            block.timestamp + 2 days, block.timestamp + 1 days,
            1e18, IEventManager.ScoringRule.BOTH
        );

        assertEq(eventId, 0);
        IEventManager.Event memory ev = eventManager.getEvent(0);
        assertEq(ev.homeTeam, "Arsenal");
        assertEq(ev.awayTeam, "Chelsea");
        assertEq(ev.entryFee, 1e18);
        assertEq(uint8(ev.status),    uint8(IEventManager.EventStatus.OPEN));
        assertEq(uint8(ev.eventType), uint8(IEventManager.EventType.PUBLIC));
    }

    function test_CreatePrivateEvent() public {
        bytes32 codeHash = keccak256(abi.encodePacked("ABC123"));

        vm.prank(user1);
        uint256 eventId = eventManager.createPrivateEvent(
            "Man City", "Liverpool", "99999",
            block.timestamp + 2 days, block.timestamp + 1 days,
            2e18, IEventManager.ScoringRule.BOTH,
            10, codeHash
        );

        IEventManager.Event memory ev = eventManager.getEvent(eventId);
        assertEq(uint8(ev.eventType), uint8(IEventManager.EventType.PRIVATE));
        assertEq(ev.maxParticipants, 10);
        assertEq(ev.inviteCodeHash, codeHash);

        // Creator auto-joined with free entry
        assertTrue(eventManager.hasJoined(eventId, user1));
        assertEq(eventManager.getParticipantCount(eventId), 1);
        // Prize pool is 0 — creator didn't pay
        assertEq(ev.prizePool, 0);
    }

    // ─── UUPS Upgrade ─────────────────────────────────────────────────────────

    function test_OwnerCanUpgradeEventManager() public {
        EventManager newImpl = new EventManager();

        vm.prank(owner);
        // upgradeToAndCall with empty calldata — no re-initialization needed
        eventManager.upgradeToAndCall(address(newImpl), "");

        // State is preserved after upgrade
        assertEq(eventManager.owner(), owner);
        assertEq(address(eventManager.leaderboard()), address(leaderboard));
        assertEq(eventManager.aiOracleAgent(), aiAgent);
        assertEq(eventManager.PLATFORM_FEE_BPS(), 100);
    }

    function test_OwnerCanUpgradeLeaderboard() public {
        Leaderboard newImpl = new Leaderboard();

        vm.prank(owner);
        leaderboard.upgradeToAndCall(address(newImpl), "");

        assertEq(leaderboard.owner(), owner);
        assertEq(leaderboard.eventManager(), address(eventManager));
    }

    function test_OwnerCanUpgradeTrueCall() public {
        TrueCall newImpl = new TrueCall();

        vm.prank(owner);
        truecall.upgradeToAndCall(address(newImpl), "");

        assertEq(truecall.owner(), owner);
        assertEq(truecall.getVersion(), "1.0.0");
    }

    function test_RevertWhen_NonOwnerUpgrades() public {
        EventManager newImpl = new EventManager();

        vm.prank(user1);
        vm.expectRevert();
        eventManager.upgradeToAndCall(address(newImpl), "");
    }

    function test_StatePreservedAfterUpgrade() public {
        // Create an event before upgrade
        vm.prank(owner);
        uint256 eventId = eventManager.createPublicEvent(
            "Arsenal", "Chelsea", "12345",
            block.timestamp + 2 days, block.timestamp + 1 days,
            1e18, IEventManager.ScoringRule.BOTH
        );

        // Upgrade
        EventManager newImpl = new EventManager();
        vm.prank(owner);
        eventManager.upgradeToAndCall(address(newImpl), "");

        // Event data still exists after upgrade
        IEventManager.Event memory ev = eventManager.getEvent(eventId);
        assertEq(ev.homeTeam, "Arsenal");
        assertEq(ev.awayTeam, "Chelsea");
        assertEq(uint8(ev.status), uint8(IEventManager.EventStatus.OPEN));
    }
}

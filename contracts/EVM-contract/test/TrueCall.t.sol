// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {TrueCall} from "../src/TrueCall.sol";
import {EventManager} from "../src/EventManager.sol";
import {Leaderboard} from "../src/Leaderboard.sol";
import {IEventManager} from "../src/interfaces/IEventManager.sol";

contract TrueCallTest is Test {
    TrueCall public trueCall;
    EventManager public eventManager;
    Leaderboard public leaderboard;

    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public aiAgent = makeAddr("aiAgent");

    // Mock cUSD address (ERC-20)
    address public constant MOCK_CUSD = address(0xC0FFEE);

    function setUp() public {
        vm.startPrank(owner);

        leaderboard = new Leaderboard();
        eventManager = new EventManager(MOCK_CUSD, treasury);
        trueCall = new TrueCall(MOCK_CUSD);

        // Wire contracts
        leaderboard.setEventManager(address(eventManager));
        eventManager.setLeaderboard(address(leaderboard));
        eventManager.setAIAgent(aiAgent);
        trueCall.setEventManager(address(eventManager));
        trueCall.setLeaderboard(address(leaderboard));
        trueCall.setAIAgent(aiAgent);

        vm.stopPrank();
    }

    // ─── TrueCall Root ────────────────────────────────────────────────────────

    function test_VersionIsCorrect() public view {
        assertEq(trueCall.getVersion(), "1.0.0");
    }

    function test_OwnerIsSetCorrectly() public view {
        assertEq(trueCall.owner(), owner);
    }

    function test_AddressesWiredCorrectly() public view {
        (address em, address lb, address agent, address cusd) = trueCall.getAddresses();
        assertEq(em, address(eventManager));
        assertEq(lb, address(leaderboard));
        assertEq(agent, aiAgent);
        assertEq(cusd, MOCK_CUSD);
    }

    function test_RevertWhen_NonOwnerSetsEventManager() public {
        vm.prank(makeAddr("random"));
        vm.expectRevert();
        trueCall.setEventManager(makeAddr("new"));
    }

    // ─── Leaderboard ──────────────────────────────────────────────────────────

    function test_LeaderboardEventManagerSet() public view {
        assertEq(leaderboard.eventManager(), address(eventManager));
    }

    function test_RevertWhen_NonEventManagerUpdatesPoints() public {
        address[] memory users = new address[](1);
        uint256[] memory points = new uint256[](1);
        uint256[] memory timestamps = new uint256[](1);
        users[0] = makeAddr("user");
        points[0] = 3;
        timestamps[0] = block.timestamp;

        vm.prank(makeAddr("random"));
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

    function test_RevertWhen_NonOwnerCreatesPublicEvent() public {
        vm.prank(makeAddr("random"));
        vm.expectRevert();
        eventManager.createPublicEvent(
            "Arsenal",
            "Chelsea",
            "12345",
            block.timestamp + 2 days,
            block.timestamp + 1 days,
            1e18,
            IEventManager.ScoringRule.BOTH
        );
    }

    function test_RevertWhen_KickoffInPast() public {
        vm.prank(owner);
        vm.expectRevert(EventManager.KickoffInPast.selector);
        eventManager.createPublicEvent(
            "Arsenal",
            "Chelsea",
            "12345",
            block.timestamp, // not in future (equal = past)
            block.timestamp - 1,
            1e18,
            IEventManager.ScoringRule.BOTH
        );
    }

    function test_RevertWhen_DeadlineAfterKickoff() public {
        vm.prank(owner);
        vm.expectRevert(EventManager.DeadlineAfterKickoff.selector);
        eventManager.createPublicEvent(
            "Arsenal",
            "Chelsea",
            "12345",
            block.timestamp + 1 days,
            block.timestamp + 2 days, // deadline AFTER kickoff
            1e18,
            IEventManager.ScoringRule.BOTH
        );
    }

    function test_CreatePublicEvent() public {
        vm.prank(owner);
        uint256 eventId = eventManager.createPublicEvent(
            "Arsenal",
            "Chelsea",
            "12345",
            block.timestamp + 2 days,
            block.timestamp + 1 days,
            1e18,
            IEventManager.ScoringRule.BOTH
        );

        assertEq(eventId, 0);

        EventManager.Event memory ev = eventManager.getEvent(0);
        assertEq(ev.homeTeam, "Arsenal");
        assertEq(ev.awayTeam, "Chelsea");
        assertEq(ev.entryFee, 1e18);
        assertEq(uint8(ev.status), uint8(IEventManager.EventStatus.OPEN));
        assertEq(uint8(ev.eventType), uint8(IEventManager.EventType.PUBLIC));
    }

    function test_CreatePrivateEvent() public {
        bytes32 codeHash = keccak256(abi.encodePacked("ABC123"));

        vm.prank(makeAddr("creator"));
        uint256 eventId = eventManager.createPrivateEvent(
            "Man City",
            "Liverpool",
            "99999",
            block.timestamp + 2 days,
            block.timestamp + 1 days,
            2e18,
            IEventManager.ScoringRule.BOTH,
            10,
            codeHash
        );

        EventManager.Event memory ev = eventManager.getEvent(eventId);
        assertEq(uint8(ev.eventType), uint8(IEventManager.EventType.PRIVATE));
        assertEq(ev.maxParticipants, 10);
        assertEq(ev.inviteCodeHash, codeHash);

        // Creator should be auto-joined
        assertTrue(eventManager.hasJoined(eventId, makeAddr("creator")));
        assertEq(eventManager.getParticipantCount(eventId), 1);
    }

    function test_PlatformFeeConstant() public view {
        assertEq(eventManager.PLATFORM_FEE_BPS(), 100); // 1%
    }
}

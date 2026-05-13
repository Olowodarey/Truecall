// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/TrueCall.sol";

contract TrueCallTest is Test {
    TrueCall public trueCall;

    address public owner = makeAddr("owner");
    address public user1 = makeAddr("user1");

    // ─── Setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.prank(owner);
        trueCall = new TrueCall();
    }

    // ─── Deployment ───────────────────────────────────────────────────────────

    function test_OwnerIsSetCorrectly() public view {
        assertEq(trueCall.owner(), owner);
    }

    function test_VersionIsCorrect() public view {
        assertEq(trueCall.getVersion(), "1.0.0");
    }

    function test_EmitsDeployedEvent() public {
        vm.expectEmit(true, false, false, true);
        emit TrueCall.ContractDeployed(owner, block.timestamp);
        vm.prank(owner);
        new TrueCall();
    }

    // ─── Pause ────────────────────────────────────────────────────────────────

    function test_OwnerCanPause() public {
        vm.prank(owner);
        trueCall.pause();
        assertTrue(trueCall.paused());
    }

    function test_OwnerCanUnpause() public {
        vm.prank(owner);
        trueCall.pause();

        vm.prank(owner);
        trueCall.unpause();
        assertFalse(trueCall.paused());
    }

    function test_RevertWhen_NonOwnerPauses() public {
        vm.prank(user1);
        vm.expectRevert();
        trueCall.pause();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EventManager} from "../src/EventManager.sol";
import {IEventManager} from "../src/interfaces/IEventManager.sol";

/// @notice Tests the createPublicEvent function
/// @dev Run with:
///   forge script script/TestCreateEvent.s.sol --rpc-url celo-sepolia --broadcast
contract TestCreateEvent is Script {
    address constant EVENT_MANAGER_PROXY = 0xc76C9f0Bb031245ce145c0b7B822E2d0A1267e89;
    address constant CUSD_TOKEN = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1; // cUSD on Celo Sepolia

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=== Testing createPublicEvent ===");
        console.log("Deployer:", deployer);
        console.log("EventManager:", EVENT_MANAGER_PROXY);

        vm.startBroadcast(deployerKey);

        EventManager eventManager = EventManager(EVENT_MANAGER_PROXY);

        // Create a public event
        // Use future dates (current time is around May 16, 2026)
        // startDate: May 20, 2026 at 2:00 AM UTC
        // endDate: May 27, 2026 at 2:01 AM UTC
        uint256 startDate = block.timestamp + 4 days;
        uint256 endDate = block.timestamp + 11 days;
        uint256 entryFee = 1e18; // 1 cUSD

        console.log("Current timestamp:", block.timestamp);
        console.log("Creating event with:");
        console.log("  Name: Test Event");
        console.log("  Start:", startDate);
        console.log("  End:", endDate);
        console.log("  Token:", CUSD_TOKEN);
        console.log("  Fee:", entryFee);
        console.log("  Scoring Rule: BOTH");

        uint256 eventId = eventManager.createPublicEvent(
            "Test Event",
            startDate,
            endDate,
            CUSD_TOKEN,
            entryFee,
            IEventManager.ScoringRule.BOTH
        );

        console.log("Event created successfully!");
        console.log("Event ID:", eventId);

        vm.stopBroadcast();
    }
}

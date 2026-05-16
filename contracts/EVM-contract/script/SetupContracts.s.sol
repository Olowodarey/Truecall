// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EventManager} from "../src/EventManager.sol";
import {Leaderboard} from "../src/Leaderboard.sol";

/// @notice Sets up contract references after deployment
/// @dev Run with:
///   forge script script/SetupContracts.s.sol --rpc-url celo-sepolia --broadcast
contract SetupContracts is Script {
    address constant EVENT_MANAGER_PROXY  = 0xc76C9f0Bb031245ce145c0b7B822E2d0A1267e89;
    address constant LEADERBOARD_PROXY    = 0xa95a8c09A3873C4429E69Ba05fA74dF852f539e2;
    address constant AI_AGENT             = 0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        console.log("=== Setting up contract references ===");
        console.log("EventManager:  ", EVENT_MANAGER_PROXY);
        console.log("Leaderboard:   ", LEADERBOARD_PROXY);
        console.log("AI Agent:      ", AI_AGENT);

        vm.startBroadcast(deployerKey);

        // Set Leaderboard on EventManager
        EventManager eventManager = EventManager(EVENT_MANAGER_PROXY);
        eventManager.setLeaderboard(LEADERBOARD_PROXY);
        console.log("Set Leaderboard on EventManager");

        // Set EventManager on Leaderboard
        Leaderboard leaderboard = Leaderboard(LEADERBOARD_PROXY);
        leaderboard.setEventManager(EVENT_MANAGER_PROXY);
        console.log("Set EventManager on Leaderboard");

        // Set AI Agent on EventManager
        eventManager.setAIAgent(AI_AGENT);
        console.log("Set AI Agent on EventManager");

        vm.stopBroadcast();

        console.log("Setup Complete");
    }
}

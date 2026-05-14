// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TrueCall} from "../src/TrueCall.sol";
import {EventManager} from "../src/EventManager.sol";
import {Leaderboard} from "../src/Leaderboard.sol";

/// @notice Deploys the full TrueCall system to Celo
/// @dev Run with:
///   Testnet:  forge script script/Deploy.s.sol --rpc-url alfajores --broadcast --verify
///   Mainnet:  forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify
contract Deploy is Script {
    // ─── Celo Addresses ───────────────────────────────────────────────────────

    // cUSD on Celo Mainnet
    address constant CUSD_MAINNET = 0x765DE816845861e75A25fCA122bb6898B8B1282a;

    // cUSD on Alfajores Testnet
    address constant CUSD_ALFAJORES = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);
        address aiAgent = vm.envOr("AI_AGENT_ADDRESS", deployer); // update after ERC-8004 registration

        // Detect network
        address cUSD = block.chainid == 42220 ? CUSD_MAINNET : CUSD_ALFAJORES;

        console.log("=== TrueCall Deployment ===");
        console.log("Deployer:  ", deployer);
        console.log("Treasury:  ", treasury);
        console.log("AI Agent:  ", aiAgent);
        console.log("cUSD:      ", cUSD);
        console.log("Chain ID:  ", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. Deploy Leaderboard
        Leaderboard leaderboard = new Leaderboard();
        console.log("Leaderboard:   ", address(leaderboard));

        // 2. Deploy EventManager
        EventManager eventManager = new EventManager(cUSD, treasury);
        console.log("EventManager:  ", address(eventManager));

        // 3. Deploy TrueCall root registry
        TrueCall trueCall = new TrueCall(cUSD);
        console.log("TrueCall:      ", address(trueCall));

        // 4. Wire contracts together
        leaderboard.setEventManager(address(eventManager));
        eventManager.setLeaderboard(address(leaderboard));
        eventManager.setAIAgent(aiAgent);
        trueCall.setEventManager(address(eventManager));
        trueCall.setLeaderboard(address(leaderboard));
        trueCall.setAIAgent(aiAgent);

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Update .env with:");
        console.log("TRUECALL_ADDRESS=", address(trueCall));
        console.log("EVENT_MANAGER_ADDRESS=", address(eventManager));
        console.log("LEADERBOARD_ADDRESS=", address(leaderboard));

        console.log("\n=== Verify Commands ===");
        console.log("forge verify-contract", address(leaderboard), "Leaderboard --chain celo");
        console.log("forge verify-contract", address(eventManager), "EventManager --chain celo");
        console.log("forge verify-contract", address(trueCall), "TrueCall --chain celo");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {TrueCall} from "../src/TrueCall.sol";
import {EventManager} from "../src/EventManager.sol";
import {Leaderboard} from "../src/Leaderboard.sol";

/// @notice Deploys the full TrueCall system using UUPS proxies to Celo
/// @dev Run with:
///   Testnet:  forge script script/Deploy.s.sol --rpc-url celo-sepolia --broadcast --verify
///   Mainnet:  forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify
///
/// Upgrade flow (after deployment):
///   1. Deploy new implementation: forge create src/EventManager.sol:EventManager
///   2. Call proxy.upgradeToAndCall(newImpl, "") from owner wallet
contract Deploy is Script {
    // ─── Celo Addresses ───────────────────────────────────────────────────────

    address constant CUSD_MAINNET      = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    address constant CUSD_CELO_SEPOLIA = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1; // testnet cUSD

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        address treasury    = vm.envOr("TREASURY_ADDRESS", deployer);
        address aiAgent     = vm.envOr("AI_AGENT_ADDRESS", deployer);

        // Chain ID 42220 = Celo Mainnet, 11142220 = Celo Sepolia testnet
        address cusd = block.chainid == 42220 ? CUSD_MAINNET : CUSD_CELO_SEPOLIA;

        console.log("=== TrueCall UUPS Proxy Deployment ===");
        console.log("Network:   ", block.chainid == 42220 ? "Celo Mainnet" : "Celo Sepolia Testnet");
        console.log("Deployer:  ", deployer);
        console.log("Treasury:  ", treasury);
        console.log("AI Agent:  ", aiAgent);
        console.log("cUSD:      ", cusd);
        console.log("Chain ID:  ", block.chainid);

        vm.startBroadcast(deployerKey);

        // ── 1. Deploy Leaderboard implementation + proxy ──────────────────────
        Leaderboard leaderboardImpl = new Leaderboard();
        bytes memory lbInit = abi.encodeCall(Leaderboard.initialize, (deployer));
        ERC1967Proxy leaderboardProxy = new ERC1967Proxy(address(leaderboardImpl), lbInit);
        Leaderboard leaderboard = Leaderboard(address(leaderboardProxy));
        console.log("Leaderboard impl:  ", address(leaderboardImpl));
        console.log("Leaderboard proxy: ", address(leaderboardProxy));

        // ── 2. Deploy EventManager implementation + proxy ─────────────────────
        EventManager eventManagerImpl = new EventManager();
        bytes memory emInit = abi.encodeCall(EventManager.initialize, (cusd, treasury, deployer));
        ERC1967Proxy eventManagerProxy = new ERC1967Proxy(address(eventManagerImpl), emInit);
        EventManager eventManager = EventManager(address(eventManagerProxy));
        console.log("EventManager impl:  ", address(eventManagerImpl));
        console.log("EventManager proxy: ", address(eventManagerProxy));

        // ── 3. Deploy TrueCall root registry implementation + proxy ───────────
        TrueCall truecallImpl = new TrueCall();
        bytes memory tcInit = abi.encodeCall(TrueCall.initialize, (cusd, deployer));
        ERC1967Proxy truecallProxy = new ERC1967Proxy(address(truecallImpl), tcInit);
        TrueCall truecall = TrueCall(address(truecallProxy));
        console.log("TrueCall impl:  ", address(truecallImpl));
        console.log("TrueCall proxy: ", address(truecallProxy));

        // ── 4. Wire contracts together ────────────────────────────────────────
        leaderboard.setEventManager(address(eventManagerProxy));
        eventManager.setLeaderboard(address(leaderboardProxy));
        eventManager.setAIAgent(aiAgent);
        truecall.setEventManager(address(eventManagerProxy));
        truecall.setLeaderboard(address(leaderboardProxy));
        truecall.setAIAgent(aiAgent);

        vm.stopBroadcast();

        // ── 5. Print summary ──────────────────────────────────────────────────
        console.log("\n=== Deployment Complete ===");
        console.log("Save these proxy addresses - they never change after upgrades:");
        console.log("TRUECALL_PROXY=      ", address(truecallProxy));
        console.log("EVENT_MANAGER_PROXY= ", address(eventManagerProxy));
        console.log("LEADERBOARD_PROXY=   ", address(leaderboardProxy));

        console.log("\n=== Verify Implementation Contracts ===");
        console.log("forge verify-contract", address(leaderboardImpl),   "Leaderboard   --chain celo");
        console.log("forge verify-contract", address(eventManagerImpl),  "EventManager  --chain celo");
        console.log("forge verify-contract", address(truecallImpl),      "TrueCall      --chain celo");
    }
}

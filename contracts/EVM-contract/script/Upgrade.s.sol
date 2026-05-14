// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {TrueCall} from "../src/TrueCall.sol";
import {EventManager} from "../src/EventManager.sol";
import {Leaderboard} from "../src/Leaderboard.sol";

/// @notice Upgrades one or more TrueCall contracts to a new implementation.
/// @dev Set env vars to control which contracts to upgrade:
///
///   Upgrade EventManager only:
///     UPGRADE_EVENT_MANAGER=true \
///     EVENT_MANAGER_PROXY=0x... \
///     forge script script/Upgrade.s.sol --rpc-url celo --broadcast
///
///   Upgrade all:
///     UPGRADE_ALL=true \
///     TRUECALL_PROXY=0x... \
///     EVENT_MANAGER_PROXY=0x... \
///     LEADERBOARD_PROXY=0x... \
///     forge script script/Upgrade.s.sol --rpc-url celo --broadcast
contract Upgrade is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        bool upgradeAll            = vm.envOr("UPGRADE_ALL", false);
        bool upgradeTrueCall       = upgradeAll || vm.envOr("UPGRADE_TRUECALL", false);
        bool upgradeEventManager   = upgradeAll || vm.envOr("UPGRADE_EVENT_MANAGER", false);
        bool upgradeLeaderboard    = upgradeAll || vm.envOr("UPGRADE_LEADERBOARD", false);

        console.log("=== TrueCall Upgrade ===");
        console.log("Upgrader: ", deployer);

        vm.startBroadcast(deployerKey);

        // ── Upgrade TrueCall ──────────────────────────────────────────────────
        if (upgradeTrueCall) {
            address proxy = vm.envAddress("TRUECALL_PROXY");
            TrueCall newImpl = new TrueCall();
            UUPSUpgradeable(proxy).upgradeToAndCall(address(newImpl), "");
            console.log("TrueCall upgraded:");
            console.log("  Proxy:       ", proxy);
            console.log("  New impl:    ", address(newImpl));
        }

        // ── Upgrade EventManager ──────────────────────────────────────────────
        if (upgradeEventManager) {
            address proxy = vm.envAddress("EVENT_MANAGER_PROXY");
            EventManager newImpl = new EventManager();
            UUPSUpgradeable(proxy).upgradeToAndCall(address(newImpl), "");
            console.log("EventManager upgraded:");
            console.log("  Proxy:       ", proxy);
            console.log("  New impl:    ", address(newImpl));
        }

        // ── Upgrade Leaderboard ───────────────────────────────────────────────
        if (upgradeLeaderboard) {
            address proxy = vm.envAddress("LEADERBOARD_PROXY");
            Leaderboard newImpl = new Leaderboard();
            UUPSUpgradeable(proxy).upgradeToAndCall(address(newImpl), "");
            console.log("Leaderboard upgraded:");
            console.log("  Proxy:       ", proxy);
            console.log("  New impl:    ", address(newImpl));
        }

        vm.stopBroadcast();

        console.log("\n=== Upgrade Complete ===");
        console.log("Proxy addresses are unchanged - no frontend updates needed.");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {CreatorEventManager} from "../src/CreatorEventManager.sol";

/// @notice Upgrades the CreatorEventManager proxy to the latest implementation.
///
/// Required env vars (set in .env):
///   PRIVATE_KEY                      - owner wallet private key (DEFAULT_ADMIN_ROLE)
///   CREATOR_EVENT_MANAGER_PROXY      - proxy address (defaults to mainnet proxy below)
///
/// Dry-run (no broadcast):
///   forge script script/UpgradeCreatorEventManager.s.sol --rpc-url celo
///
/// Deploy:
///   forge script script/UpgradeCreatorEventManager.s.sol --rpc-url celo --broadcast --verify
contract UpgradeCreatorEventManager is Script {
    // Mainnet proxy — matches NEXT_PUBLIC_CREATOR_EVENT_MANAGER in frontend
    address constant DEFAULT_PROXY = 0xbA57166902064dE0EE16Df3A30839da7382F06E5;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        address proxy = vm.envOr("CREATOR_EVENT_MANAGER_PROXY", DEFAULT_PROXY);

        bool isMainnet = block.chainid == 42220;

        console.log("=== CreatorEventManager Upgrade ===");
        console.log("Network:  ", isMainnet ? "Celo Mainnet" : "Celo Testnet");
        console.log("Chain ID: ", block.chainid);
        console.log("Upgrader: ", deployer);
        console.log("Proxy:    ", proxy);

        vm.startBroadcast(deployerKey);

        // Deploy new implementation
        CreatorEventManager newImpl = new CreatorEventManager();
        console.log("New impl: ", address(newImpl));

        // Upgrade proxy to new implementation (no re-initialisation needed)
        UUPSUpgradeable(proxy).upgradeToAndCall(address(newImpl), "");

        vm.stopBroadcast();

        console.log("\n=== Upgrade Complete ===");
        console.log("Proxy address unchanged: ", proxy);
        console.log("New implementation:      ", address(newImpl));
        console.log("\nChanges in this upgrade:");
        console.log("  - _checkAndCompleteEvent: only auto-completes when event has 5 matches");
        console.log("  - completeEvent(): creator can manually close events with < 5 matches");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CreatorEventManager} from "../src/CreatorEventManager.sol";

/// @notice Updates the creation fee on the deployed CreatorEventManager proxy.
/// Usage:
///   Set fee to 0.1 CELO:
///     forge script script/SetCreationFee.s.sol --rpc-url celo --broadcast
///
///   Custom amount via env:
///     CREATION_FEE_AMOUNT=1000000000000000000 \
///     forge script script/SetCreationFee.s.sol --rpc-url celo --broadcast
contract SetCreationFee is Script {
    // Deployed proxy address - UPDATE THIS after deployment!
    address constant PROXY = 0x8A18Da2A173b3951c797a438102345cF92838880;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        // Default: 0.1 CELO — override with env var if needed
        uint256 amount = vm.envOr("CREATION_FEE_AMOUNT", uint256(0.1 ether));

        console.log("Proxy:  ", PROXY);
        console.log("Amount (wei): ", amount);
        console.log("Amount (CELO):", amount / 1e18);

        vm.startBroadcast(deployerKey);
        CreatorEventManager(payable(PROXY)).setCreationFee(amount);
        vm.stopBroadcast();

        console.log("Creation fee updated.");
    }
}

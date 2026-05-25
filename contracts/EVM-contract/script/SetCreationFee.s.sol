// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CreatorEventManager} from "../src/CreatorEventManager.sol";

/// @notice Updates the creation fee on the deployed CreatorEventManager proxy.
/// Usage:
///   Native CELO fee (0.1 CELO):
///     forge script script/SetCreationFee.s.sol --rpc-url celo-sepolia --broadcast
///
///   Custom token + amount via env:
///     CREATION_FEE_TOKEN=0x874069... CREATION_FEE_AMOUNT=1000000000000000000 \
///     forge script script/SetCreationFee.s.sol --rpc-url celo-sepolia --broadcast
contract SetCreationFee is Script {
    // Deployed proxy address
    address constant PROXY = 0x34ef9AebB8354cbc45ED67086F74B722aD959787;

    // address(0) = native CELO
    address constant NATIVE_CELO = address(0);

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        // Default: 0.1 native CELO — override with env vars if needed
        address token  = vm.envOr("CREATION_FEE_TOKEN",  NATIVE_CELO);
        uint256 amount = vm.envOr("CREATION_FEE_AMOUNT", uint256(0.1 ether));

        console.log("Proxy:  ", PROXY);
        console.log("Token:  ", token == address(0) ? "Native CELO (address(0))" : vm.toString(token));
        console.log("Amount: ", amount);

        vm.startBroadcast(deployerKey);
        CreatorEventManager(payable(PROXY)).setCreationFee(token, amount);
        vm.stopBroadcast();

        console.log("Creation fee updated.");
    }
}

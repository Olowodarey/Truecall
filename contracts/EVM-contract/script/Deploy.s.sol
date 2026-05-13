// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TrueCall.sol";

contract DeployTrueCall is Script {
    function run() external returns (TrueCall trueCall) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        trueCall = new TrueCall();

        vm.stopBroadcast();

        console.log("TrueCall deployed at:", address(trueCall));
        console.log("Owner:", trueCall.owner());
        console.log("Version:", trueCall.getVersion());
    }
}

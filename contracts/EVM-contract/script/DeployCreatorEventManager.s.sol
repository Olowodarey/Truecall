// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {CreatorEventManager} from "../src/CreatorEventManager.sol";

/// @notice Deploys CreatorEventManager behind a UUPS proxy to Celo.
///         Creation fee is always native CELO.
///
/// Required env vars (set in .env):
///   PRIVATE_KEY         - deployer private key
///   TREASURY_ADDRESS    - address that receives fees (defaults to deployer)
///   AI_AGENT_ADDRESS    - AI Oracle Agent address (defaults to deployer)
///   CREATION_FEE_AMOUNT - fee in wei (defaults to 0.1 CELO = 1e17)
///
/// Deploy:
///   forge script script/DeployCreatorEventManager.s.sol --rpc-url celo-sepolia --broadcast --verify
contract DeployCreatorEventManager is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        address treasury   = vm.envOr("TREASURY_ADDRESS",    deployer);
        address aiAgent    = vm.envOr("AI_AGENT_ADDRESS",    deployer);
        uint256 feeAmount  = vm.envOr("CREATION_FEE_AMOUNT", uint256(0.1 ether));

        bool isMainnet = block.chainid == 42220;

        console.log("=== CreatorEventManager Deployment ===");
        console.log("Network:     ", isMainnet ? "Celo Mainnet" : "Celo Sepolia Testnet");
        console.log("Deployer:    ", deployer);
        console.log("Treasury:    ", treasury);
        console.log("AI Agent:    ", aiAgent);
        console.log("Fee (wei):   ", feeAmount);
        console.log("Chain ID:    ", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. Deploy implementation
        CreatorEventManager impl = new CreatorEventManager();
        console.log("Impl:        ", address(impl));

        // 2. Deploy proxy with initializer
        bytes memory initData = abi.encodeCall(
            CreatorEventManager.initialize,
            (treasury, aiAgent, deployer)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        CreatorEventManager manager = CreatorEventManager(payable(address(proxy)));
        console.log("Proxy:       ", address(proxy));

        // 3. Set creation fee in native CELO
        manager.setCreationFee(feeAmount);
        console.log("Fee set:     ", feeAmount, "wei CELO");

        vm.stopBroadcast();

        console.log("\n=== Done ===");
        console.log("CREATOR_EVENT_MANAGER_PROXY=", address(proxy));
        console.log("CREATOR_EVENT_MANAGER_IMPL= ", address(impl));
    }
}

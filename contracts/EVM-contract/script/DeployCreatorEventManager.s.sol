// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {CreatorEventManager} from "../src/CreatorEventManager.sol";

/// @notice Deploys CreatorEventManager behind a UUPS proxy to Celo.
///
/// Required env vars (set in .env):
///   PRIVATE_KEY          — deployer private key
///   TREASURY_ADDRESS     — address that receives creation fees (defaults to deployer)
///   AI_AGENT_ADDRESS     — AI Oracle Agent address (defaults to deployer)
///   CREATION_FEE_TOKEN   — ERC-20 token address for creation fee (defaults to cUSD)
///   CREATION_FEE_AMOUNT  — Creation fee in wei (defaults to 1 cUSD = 1e18)
///
/// Deploy to testnet:
///   forge script script/DeployCreatorEventManager.s.sol \
///     --rpc-url celo-sepolia --broadcast --verify
///
/// Deploy to mainnet:
///   forge script script/DeployCreatorEventManager.s.sol \
///     --rpc-url celo --broadcast --verify
///
/// Upgrade flow (after deployment):
///   1. Deploy new implementation:
///      forge create src/CreatorEventManager.sol:CreatorEventManager --rpc-url celo
///   2. Call proxy.upgradeToAndCall(newImpl, "") from owner wallet
contract DeployCreatorEventManager is Script {
    // ─── Celo Token Addresses ─────────────────────────────────────────────────

    address constant CUSD_MAINNET      = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    address constant CUSD_CELO_SEPOLIA = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);
        address aiAgent  = vm.envOr("AI_AGENT_ADDRESS", deployer);

        // Default creation fee token: cUSD on the target network
        address defaultToken = block.chainid == 42220 ? CUSD_MAINNET : CUSD_CELO_SEPOLIA;
        address feeToken     = vm.envOr("CREATION_FEE_TOKEN", defaultToken);
        uint256 feeAmount    = vm.envOr("CREATION_FEE_AMOUNT", uint256(1e18)); // 1 token default

        bool isMainnet = block.chainid == 42220;

        console.log("=== CreatorEventManager UUPS Proxy Deployment ===");
        console.log("Network:          ", isMainnet ? "Celo Mainnet" : "Celo Sepolia Testnet");
        console.log("Deployer:         ", deployer);
        console.log("Treasury:         ", treasury);
        console.log("AI Agent:         ", aiAgent);
        console.log("Creation Fee Token:", feeToken);
        console.log("Creation Fee Amt: ", feeAmount);
        console.log("Chain ID:         ", block.chainid);

        vm.startBroadcast(deployerKey);

        // ── 1. Deploy implementation ──────────────────────────────────────────
        CreatorEventManager impl = new CreatorEventManager();
        console.log("Implementation:   ", address(impl));

        // ── 2. Encode initializer call ────────────────────────────────────────
        bytes memory initData = abi.encodeCall(
            CreatorEventManager.initialize,
            (treasury, aiAgent, deployer)
        );

        // ── 3. Deploy UUPS proxy ──────────────────────────────────────────────
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        CreatorEventManager manager = CreatorEventManager(payable(address(proxy)));
        console.log("Proxy:            ", address(proxy));

        // ── 4. Set creation fee ───────────────────────────────────────────────
        manager.setCreationFee(feeToken, feeAmount);
        console.log("Creation fee set: ", feeAmount, "of token", feeToken);

        vm.stopBroadcast();

        // ── 5. Summary ────────────────────────────────────────────────────────
        console.log("\n=== Deployment Complete ===");
        console.log("Save the proxy address - it never changes after upgrades:");
        console.log("CREATOR_EVENT_MANAGER_PROXY=", address(proxy));
        console.log("CREATOR_EVENT_MANAGER_IMPL= ", address(impl));
        console.log("\nVerify implementation:");
        console.log(
            "forge verify-contract",
            address(impl),
            "CreatorEventManager --chain",
            isMainnet ? "celo" : "celo-sepolia"
        );
    }
}

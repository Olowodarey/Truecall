#!/usr/bin/env node
/**
 * Deploy truecall-v4 to Stacks testnet.
 * Usage: MNEMONIC="your twelve word phrase here" node deploy-truecall-v4.mjs
 */

import { readFileSync } from "fs";
import { createInterface } from "readline";
import {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";
import { mnemonicToSeedSync } from "@scure/bip39";
import { HDKey } from "@scure/bip32";

// ── Config ──────────────────────────────────────────────────────────────────
const CONTRACT_NAME = "truecall-v4";
const CONTRACT_PATH = new URL(
  "../contracts/truecall.clar",
  import.meta.url
).pathname;
const NETWORK = new StacksTestnet({ url: "https://api.testnet.hiro.so" });

// Derive Stacks private key from mnemonic (BIP39 → BIP32 → Stacks path m/44'/5757'/0'/0/0)
function derivePrivateKey(mnemonic) {
  const seed = mnemonicToSeedSync(mnemonic.trim());
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive("m/44'/5757'/0'/0/0");
  return child.privateKey;
}

async function main() {
  // Read mnemonic from env or prompt
  let mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    mnemonic = await new Promise((resolve) => {
      rl.question("Enter your wallet mnemonic phrase: ", (ans) => {
        rl.close();
        resolve(ans);
      });
    });
  }

  const privateKey = derivePrivateKey(mnemonic);
  if (!privateKey) {
    console.error("❌ Could not derive private key from mnemonic.");
    process.exit(1);
  }

  const codeBody = readFileSync(CONTRACT_PATH, "utf8");
  console.log(`\n📄 Contract: ${CONTRACT_NAME}`);
  console.log(`📍 Source: ${CONTRACT_PATH}`);
  console.log(`🌐 Network: Stacks Testnet\n`);

  console.log("⏳ Building transaction...");
  const tx = await makeContractDeploy({
    contractName: CONTRACT_NAME,
    codeBody,
    senderKey: Buffer.from(privateKey).toString("hex"),
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    clarityVersion: 2,
  });

  console.log("📡 Broadcasting to testnet...");
  const result = await broadcastTransaction({ transaction: tx, network: NETWORK });

  if (result.error) {
    console.error("❌ Broadcast failed:", result.error, result.reason);
    process.exit(1);
  }

  console.log("\n✅ Transaction broadcast successfully!");
  console.log(`🔗 TXID: ${result.txid}`);
  console.log(
    `🔍 Track: https://explorer.hiro.so/txid/${result.txid}?chain=testnet`
  );
  console.log("\n⏰ Wait ~10-20 min for Bitcoin block confirmation.");
}

main().catch((err) => {
  console.error("❌ Deploy failed:", err.message ?? err);
  process.exit(1);
});

/**
 * setup-testnet.mjs
 * Sets approved-oracle and approved-sbtc on the deployed prediction-market.
 * Uses @stacks/transactions which the clarinet environment already ships.
 *
 * Run: node --input-type=module < setup-testnet.mjs
 *   OR: node setup-testnet.mjs  (Node 22+ with package.json "type":"module")
 *
 * Key derivation: paste the c32-encoded private key from Leather wallet
 *   Settings → Secret Key → "Export private key" (64-char hex or 66-char hex01)
 *
 * DEPLOYER_PRIV_KEY env var should be the hex private key (with or without "01" suffix)
 */

import pkg from "@stacks/network";
const { StacksTestnet } = pkg;

import {
  makeContractCall,
  broadcastTransaction,
  principalCV,
  AnchorMode,
  PostConditionMode,
  bufferCV,
} from "@stacks/transactions";

const DEPLOYER = "ST3TWY4THYR9PMMD72N7SA8SE1FJPSF219RNZQY5F";
const API = "https://api.testnet.hiro.so";
const PRIV_KEY = process.env.DEPLOYER_PRIV_KEY ?? ""; // pass via env
const PM = "prediction-market";
const ORACLE_ADDR = `${DEPLOYER}.mock-pyth`;
const SBTC_ADDR = `${DEPLOYER}.mock-sbtc`;

if (!PRIV_KEY) {
  console.error("❌ Set DEPLOYER_PRIV_KEY env var to your hex private key");
  console.error("   Get it: Leather Wallet → Settings → Export Private Key");
  console.error("   Usage:  DEPLOYER_PRIV_KEY=<hex> node setup-testnet.mjs");
  process.exit(1);
}

async function getNonce() {
  const r = await fetch(`${API}/v2/accounts/${DEPLOYER}?proof=0`);
  const d = await r.json();
  return Number(d.nonce ?? 0);
}

async function contractCall(functionName, args, nonce) {
  const tx = await makeContractCall({
    contractAddress: DEPLOYER,
    contractName: PM,
    functionName,
    functionArgs: args,
    senderKey: PRIV_KEY,
    network: new StacksTestnet({ url: API }),
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 3000n,
    nonce: BigInt(nonce),
  });
  return broadcastTransaction({
    transaction: tx,
    url: `${API}/v2/transactions`,
  });
}

async function main() {
  console.log("🔑 Using deployer:", DEPLOYER);
  const nonce = await getNonce();
  console.log("   Nonce:", nonce);

  console.log("\n📡 set-approved-oracle →", ORACLE_ADDR);
  const r1 = await contractCall(
    "set-approved-oracle",
    [principalCV(ORACLE_ADDR)],
    nonce,
  );
  console.log(
    "   ",
    r1.txid ? `✅ txid: ${r1.txid}` : `❌ ${JSON.stringify(r1)}`,
  );

  console.log("\n📡 set-approved-sbtc →", SBTC_ADDR);
  const r2 = await contractCall(
    "set-approved-sbtc",
    [principalCV(SBTC_ADDR)],
    nonce + 1,
  );
  console.log(
    "   ",
    r2.txid ? `✅ txid: ${r2.txid}` : `❌ ${JSON.stringify(r2)}`,
  );

  if (r1.txid && r2.txid) {
    console.log("\n✅ Both transactions broadcast!");
    console.log(
      `   Oracle: https://explorer.hiro.so/txid/${r1.txid}?chain=testnet`,
    );
    console.log(
      `   sBTC:   https://explorer.hiro.so/txid/${r2.txid}?chain=testnet`,
    );
  }
}

main().catch(console.error);

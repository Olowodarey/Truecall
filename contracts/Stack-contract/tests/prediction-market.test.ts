import { describe, expect, it } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// ─────────────────────────────────────────────────────────────────────────────
//  Accounts — available in every test's fresh simnet
// ─────────────────────────────────────────────────────────────────────────────
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallets = [
  accounts.get("wallet_1")!,
  accounts.get("wallet_2")!,
  accounts.get("wallet_3")!,
  accounts.get("wallet_4")!,
  accounts.get("wallet_5")!,
  accounts.get("wallet_6")!,
  accounts.get("wallet_7")!,
  accounts.get("wallet_8")!,
  accounts.get("faucet")!,
];

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────
const ENTRY_FEE = 10_000_000; // 10 STX in microSTX
const DISPUTE_WINDOW = 12; // burn blocks, matches contract constant

/**
 * stacks.ts — On-chain read helpers + transaction builders for TrueCall
 * All reads go directly to Hiro testnet API (no backend needed).
 * All writes use @stacks/transactions + @stacks/connect.
 */

import {
  Cl,
  ClarityType,
  cvToValue,
  hexToCV,
  fetchCallReadOnlyFunction,
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  stringAsciiCV,
  uintCV,
  boolCV,
  principalCV,
  trueCV,
  falseCV,
  type ClarityValue,
} from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { STACKS_TESTNET } from "@stacks/network";
import { CONTRACTS, DEPLOYER, HIRO_API } from "./contracts";
import type {
  ChainEvent,
  ChainMarket,
  ChainPosition,
  ChainStakeInfo,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const [pmAddr, pmName] = CONTRACTS.PREDICTION_MARKET.split(".");

function parsePrincipal(cv: ClarityValue): string {
  return (cv as any).value ?? "";
}

function parseUint(cv: ClarityValue | any): number {
  const val = cv.value !== undefined ? cv.value : cv;
  return Number(val);
}

function parseBool(cv: ClarityValue | any): boolean {
  return cv.type === ClarityType.BoolTrue || cv === true;
}

function parseString(cv: ClarityValue | any): string {
  return String(cv.data ?? cv.value ?? cv);
}

function parseTuple(cv: ClarityValue | any): Record<string, any> {
  return cv.data ?? cv.value ?? {};
}

function parseOptionalTuple(
  cv: ClarityValue | any,
): Record<string, any> | null {
  const inner = cv.value ?? cv;
  return parseTuple(inner);
}

async function readOnly(
  contractAddress: string,
  contractName: string,
  functionName: string,
  args: ClarityValue[],
): Promise<ClarityValue> {
  return fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName,
    functionArgs: args,
    senderAddress: contractAddress,
    network: STACKS_TESTNET,
  });
}

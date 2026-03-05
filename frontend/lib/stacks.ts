/**
 * stacks.ts — On-chain read helpers + transaction builders for TrueCall
 * All reads go directly to Hiro testnet API (no backend needed).
 * All writes use @stacks/transactions + @stacks/connect.
 */

import {
  Cl,
  ClarityType,
  cvToValue,
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
import { CONTRACTS, DEPLOYER, HIRO_API } from "./contracts";
import type {
  ChainEvent,
  ChainMarket,
  ChainPosition,
  ChainStakeInfo,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const [pmAddr, pmName] = CONTRACTS.PREDICTION_MARKET.split(".");
const [govAddr, govName] = CONTRACTS.GOVERNANCE.split(".");
const [stakeAddr, stakeName] = CONTRACTS.STAKING.split(".");

function parsePrincipal(cv: ClarityValue): string {
  return (cv as any).value ?? "";
}

function parseUint(cv: ClarityValue): number {
  return Number((cv as any).value ?? 0);
}

function parseBool(cv: ClarityValue): boolean {
  return cv.type === ClarityType.BoolTrue;
}

function parseString(cv: ClarityValue): string {
  return (cv as any).value ?? "";
}

function parseTuple(cv: ClarityValue): Record<string, ClarityValue> {
  return (cv as any).value ?? {};
}

function parseOptionalTuple(
  cv: ClarityValue,
): Record<string, ClarityValue> | null {
  if (cv.type === ClarityType.OptionalNone) return null;
  return parseTuple((cv as any).value);
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
    // @ts-ignore — network type compat
    network: { url: HIRO_API },
  });
}

// ─── PREDICTION MARKET reads ─────────────────────────────────────────────────

export async function getEvent(eventId: number): Promise<ChainEvent | null> {
  const res = await readOnly(pmAddr, pmName, "get-event", [uintCV(eventId)]);
  const t = parseOptionalTuple(res);
  if (!t) return null;
  return {
    id: eventId,
    title: parseString(t["title"]),
    creator: parsePrincipal(t["creator"]),
    daoApproved: parseBool(t["dao-approved"]),
    closeBlock: parseUint(t["close-block"]),
    entryFee: parseUint(t["entry-fee"]),
    useSbtc: parseBool(t["use-sbtc"]),
    marketCount: parseUint(t["market-count"]),
    finalizedMarketCount: parseUint(t["finalized-market-count"]),
    isActive: parseBool(t["is-active"]),
    totalPool: parseUint(t["total-pool"]),
  };
}

export async function getEventByTitle(
  title: string,
): Promise<ChainEvent | null> {
  const res = await readOnly(pmAddr, pmName, "get-event-by-title", [
    stringAsciiCV(title),
  ]);
  const t = parseOptionalTuple(res);
  if (!t) return null;
  // Re-fetch to get the event with its ID from the nonce — title lookup doesn't return id
  // We derive ID from events-by-title which returns event tuple directly
  return {
    id: 0, // unknown from title fetch alone; use getEventNonce scan or store separately
    title: parseString(t["title"]),
    creator: parsePrincipal(t["creator"]),
    daoApproved: parseBool(t["dao-approved"]),
    closeBlock: parseUint(t["close-block"]),
    entryFee: parseUint(t["entry-fee"]),
    useSbtc: parseBool(t["use-sbtc"]),
    marketCount: parseUint(t["market-count"]),
    finalizedMarketCount: parseUint(t["finalized-market-count"]),
    isActive: parseBool(t["is-active"]),
    totalPool: parseUint(t["total-pool"]),
  };
}

/** Fetch all events from ID 1 up to the current nonce */
export async function getAllEvents(): Promise<ChainEvent[]> {
  // Read data-var event-nonce via the Hiro data-var API
  const resp = await fetch(
    `${HIRO_API}/v2/data_var/${pmAddr}/${pmName}/event-nonce`,
  );
  if (!resp.ok) return [];
  const { data } = await resp.json();
  const nonce = parseInt(data, 16); // data is a hex-encoded uint
  if (!nonce) return [];

  const events: ChainEvent[] = [];
  // Fetch all events in parallel
  const results = await Promise.allSettled(
    Array.from({ length: nonce }, (_, i) => getEvent(i + 1)),
  );
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) events.push(r.value);
  }
  return events;
}

export async function getMarket(marketId: number): Promise<ChainMarket | null> {
  const res = await readOnly(pmAddr, pmName, "get-market", [uintCV(marketId)]);
  const t = parseOptionalTuple(res);
  if (!t) return null;
  return {
    id: marketId,
    eventId: parseUint(t["event-id"]),
    question: parseString(t["question"]),
    targetPrice: parseUint(t["target-price"]),
    closeBlock: parseUint(t["close-block"]),
    status: parseString(t["status"]) as ChainMarket["status"],
    oraclePrice: parseUint(t["oracle-price"]),
    finalOutcome:
      t["final-outcome"].type === ClarityType.OptionalNone
        ? null
        : parseBool((t["final-outcome"] as any).value),
  };
}

/** Returns all market IDs for an event (filters out empty slots) */
export async function getMarketIdsForEvent(eventId: number): Promise<number[]> {
  const res = await readOnly(pmAddr, pmName, "get-market-ids-for-event", [
    uintCV(eventId),
  ]);
  const list = (res as any).list ?? [];
  return list
    .filter((item: ClarityValue) => item.type !== ClarityType.OptionalNone)
    .map((item: ClarityValue) =>
      parseUint(parseTuple((item as any).value)["market-id"]),
    );
}

/** Fetch all markets for an event */
export async function getMarketsForEvent(
  eventId: number,
): Promise<ChainMarket[]> {
  const ids = await getMarketIdsForEvent(eventId);
  const markets = await Promise.allSettled(ids.map(getMarket));
  return markets
    .filter(
      (r): r is PromiseFulfilledResult<ChainMarket | null> =>
        r.status === "fulfilled" && r.value !== null,
    )
    .map((r) => r.value as ChainMarket);
}

export async function getPosition(
  marketId: number,
  predictor: string,
): Promise<ChainPosition | null> {
  const res = await readOnly(pmAddr, pmName, "get-position", [
    uintCV(marketId),
    principalCV(predictor),
  ]);
  const t = parseOptionalTuple(res);
  if (!t) return null;
  return {
    prediction: parseBool(t["prediction"]),
    amount: parseUint(t["amount"]),
    claimed: parseBool(t["claimed"]),
  };
}

// ─── STAKING reads ────────────────────────────────────────────────────────────

export async function getStakeInfo(address: string): Promise<ChainStakeInfo> {
  const res = await readOnly(stakeAddr, stakeName, "get-stake-info", [
    principalCV(address),
  ]);
  const t = parseTuple(res);
  return {
    stxBalance: parseUint(t["stx-balance"]),
    stxStakedAt: parseUint(t["stx-staked-at"]),
    lockedUntil: parseUint(t["locked-until"]),
  };
}

// ─── TRANSACTION builders (via @stacks/connect) ───────────────────────────────

/** User calls predict-stx from their Leather/Xverse wallet */
export async function predictStx(
  marketId: number,
  prediction: boolean,
  userSession: {
    loadUserData: () => { profile: { stxAddress: { testnet: string } } };
  },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "predict-stx",
    functionArgs: [uintCV(marketId), prediction ? trueCV() : falseCV()],
    network: { url: HIRO_API } as any,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("predict-stx tx:", data.txId);
    },
    onCancel: () => console.log("predict-stx cancelled"),
  });
}

/** User deposits STX to staking contract */
export async function depositStx(amount: number) {
  await openContractCall({
    contractAddress: stakeAddr,
    contractName: stakeName,
    functionName: "deposit-stx",
    functionArgs: [uintCV(amount)],
    network: { url: HIRO_API } as any,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => console.log("deposit-stx tx:", data.txId),
    onCancel: () => console.log("deposit-stx cancelled"),
  });
}

/** User claims STX winnings after event is closed + all markets finalized */
export async function claimWinningsStx(eventId: number) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-winnings-stx",
    functionArgs: [uintCV(eventId)],
    network: { url: HIRO_API } as any,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => console.log("claim-winnings-stx tx:", data.txId),
    onCancel: () => console.log("claim cancelled"),
  });
}

/** Cast a governance vote */
export async function castGovernanceVote(proposalId: number, vote: boolean) {
  await openContractCall({
    contractAddress: govAddr,
    contractName: govName,
    functionName: "cast-vote",
    functionArgs: [uintCV(proposalId), vote ? trueCV() : falseCV()],
    network: { url: HIRO_API } as any,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => console.log("cast-vote tx:", data.txId),
    onCancel: () => console.log("vote cancelled"),
  });
}

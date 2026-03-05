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
  // @stacks/transactions v6 uses string type name 'none'. Older uses ClarityType.OptionalNone enum.
  if ((cv as any).type === "none" || cv.type === ClarityType.OptionalNone)
    return null;
  const inner = (cv as any).value ?? cv;
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
  const nonce = Number(cvToValue(hexToCV(data))); // safely decode uintCV
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
  const finalOutcomeCV = t["final-outcome"];
  const finalOutcomeIsNone =
    (finalOutcomeCV as any)?.type === "none" ||
    finalOutcomeCV?.type === ClarityType.OptionalNone;
  return {
    id: marketId,
    eventId: parseUint(t["event-id"]),
    question: parseString(t["question"]),
    targetPrice: parseUint(t["target-price"]),
    closeBlock: parseUint(t["close-block"]),
    status: parseString(t["status"]) as ChainMarket["status"],
    oraclePrice: parseUint(t["oracle-price"]),
    proposalBlock: parseUint(t["proposal-block"]),
    finalOutcome: finalOutcomeIsNone
      ? null
      : parseBool((finalOutcomeCV as any).value),
  };
}

/** Returns all market IDs for an event (filters out empty slots) */
export async function getMarketIdsForEvent(eventId: number): Promise<number[]> {
  const res = await readOnly(pmAddr, pmName, "get-market-ids-for-event", [
    uintCV(eventId),
  ]);
  // @stacks/transactions v6 uses string type labels ('some', 'none', 'list', 'tuple')
  const list: ClarityValue[] = (res as any).value ?? (res as any).list ?? [];
  return list
    .filter(
      (item: ClarityValue) =>
        (item as any).type === "some" || item.type === ClarityType.OptionalSome,
    )
    .map((item: ClarityValue) => {
      const innerValue = (item as any).value;
      const marketIdCV =
        (innerValue as any).value?.["market-id"] ??
        (innerValue as any)["market-id"];
      return Number((marketIdCV as any).value ?? 0);
    });
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
    network: STACKS_TESTNET,
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
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => console.log("deposit-stx tx:", data.txId),
    onCancel: () => console.log("deposit-stx cancelled"),
  });
}

/** User claims STX winnings after event is closed + all markets finalized */
export async function claimWinningsStx(
  eventId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-winnings-stx",
    functionArgs: [uintCV(eventId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("claim-winnings-stx tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("claim cancelled");
      callbacks?.onCancel?.();
    },
  });
}

/** Cast a governance vote */
export async function castGovernanceVote(proposalId: number, vote: boolean) {
  await openContractCall({
    contractAddress: govAddr,
    contractName: govName,
    functionName: "cast-vote",
    functionArgs: [uintCV(proposalId), vote ? trueCV() : falseCV()],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => console.log("cast-vote tx:", data.txId),
    onCancel: () => console.log("vote cancelled"),
  });
}

/** Admin adds a child market to an event (only deployer/keeper can typically do this successfully depending on contract logic) */
export async function addMarket(
  eventId: number,
  question: string,
  targetPriceCents: number,
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "add-market",
    functionArgs: [
      uintCV(eventId),
      stringAsciiCV(question.trim().slice(0, 128)),
      uintCV(targetPriceCents),
    ],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("add-market tx:", data.txId);
    },
    onCancel: () => console.log("add-market cancelled"),
  });
}

// ─── KEEPER / ADMIN MANAGEMENT ────────────────────────────────────────────────

/** Admin closes an event after all markets are finalized (takes 2% protocol fee) */
export async function closeEvent(
  eventId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "close-event",
    functionArgs: [uintCV(eventId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("close-event tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("close-event cancelled");
      callbacks?.onCancel?.();
    },
  });
}

/** Admin adds a trusted keeper that can propose/override market results */
export async function addKeeper(
  keeper: string,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "add-keeper",
    functionArgs: [principalCV(keeper)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("add-keeper tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("add-keeper cancelled");
      callbacks?.onCancel?.();
    },
  });
}

/** Admin removes a keeper */
export async function removeKeeper(
  keeper: string,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "remove-keeper",
    functionArgs: [principalCV(keeper)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("remove-keeper tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("remove-keeper cancelled");
      callbacks?.onCancel?.();
    },
  });
}

/** Admin sets the authorized oracle contract address */
export async function setApprovedOracle(
  oraclePrincipal: string,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "set-approved-oracle",
    functionArgs: [principalCV(oraclePrincipal)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("set-approved-oracle tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("set-approved-oracle cancelled");
      callbacks?.onCancel?.();
    },
  });
}

/** Admin sets the authorized sBTC token contract address */
export async function setApprovedSbtc(
  sbtcPrincipal: string,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "set-approved-sbtc",
    functionArgs: [principalCV(sbtcPrincipal)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("set-approved-sbtc tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("set-approved-sbtc cancelled");
      callbacks?.onCancel?.();
    },
  });
}

// ─── PREDICTION TRANSACTIONS ──────────────────────────────────────────────────

/** User enters an sBTC-denominated market with YES/NO prediction */
export async function predictSbtc(
  marketId: number,
  prediction: boolean,
  sbtcTokenContract: string,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "predict-sbtc",
    functionArgs: [
      uintCV(marketId),
      prediction ? trueCV() : falseCV(),
      principalCV(sbtcTokenContract),
    ],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("predict-sbtc tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("predict-sbtc cancelled");
      callbacks?.onCancel?.();
    },
  });
}

// ─── ORACLE RESOLUTION FUNCTIONS ─────────────────────────────────────────────

/**
 * Keeper triggers Phase 1 resolution — contract fetches BTC price from Pyth oracle.
 * No human submits a price; the oracle contract does it.
 */
export async function proposeResult(
  marketId: number,
  oracleContract: string,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "propose-result",
    functionArgs: [uintCV(marketId), principalCV(oracleContract)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("propose-result tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("propose-result cancelled");
      callbacks?.onCancel?.();
    },
  });
}

/**
 * Any user with a position can dispute the proposed outcome (Phase 2).
 * Must be called within 12 burn blocks (~2h) of propose-result.
 */
export async function disputeResult(
  marketId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "dispute-result",
    functionArgs: [uintCV(marketId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("dispute-result tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("dispute-result cancelled");
      callbacks?.onCancel?.();
    },
  });
}

/**
 * Keeper re-resolves a disputed market using the stored oracle price (Phase 2b).
 * No new price is submitted — uses the price stored at propose-result time.
 */
export async function overrideResult(
  marketId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "override-result",
    functionArgs: [uintCV(marketId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("override-result tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("override-result cancelled");
      callbacks?.onCancel?.();
    },
  });
}

/**
 * Anyone can finalize a pending market after the 2hr dispute window (Phase 3).
 * Locks in the proposed outcome and increments the event's finalized-market-count.
 */
export async function finalizeMarket(
  marketId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "finalize-market",
    functionArgs: [uintCV(marketId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("finalize-market tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("finalize-market cancelled");
      callbacks?.onCancel?.();
    },
  });
}

// ─── GAMIFICATION / REWARDS ───────────────────────────────────────────────────

/**
 * User claims 10 leaderboard points after correctly predicting a finalized market.
 * Each user can only claim once per market.
 */
export async function claimPoints(
  marketId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-points",
    functionArgs: [uintCV(marketId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("claim-points tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("claim-points cancelled");
      callbacks?.onCancel?.();
    },
  });
}

/**
 * Top 5 leaderboard users claim their sBTC prize share.
 * Fails if the event is STX-denominated.
 */
export async function claimWinningsSbtc(
  eventId: number,
  sbtcTokenContract: string,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-winnings-sbtc",
    functionArgs: [uintCV(eventId), principalCV(sbtcTokenContract)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("claim-winnings-sbtc tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("claim-winnings-sbtc cancelled");
      callbacks?.onCancel?.();
    },
  });
}

// ─── GOVERNANCE reads ─────────────────────────────────────────────────────────

function parseProposalTuple(id: number, t: Record<string, ClarityValue>) {
  return {
    id,
    proposer: parseString(t["proposer"]),
    title: parseString(t["title"]),
    question: parseString(t["question"]),
    targetPrice: parseUint(t["target-price"]),
    entryFee: parseUint(t["entry-fee"]),
    blocksOpen: parseUint(t["blocks-open"]),
    useSbtc: parseBool(t["use-sbtc"]),
    createdAt: parseUint(t["created-at"]),
    voteEndBlock: parseUint(t["vote-end-block"]),
    status: parseString(t["status"]) as
      | "active"
      | "approved"
      | "rejected"
      | "executed"
      | "cancelled"
      | "expired",
    yesVotes: parseUint(t["yes-votes"]),
    noVotes: parseUint(t["no-votes"]),
    eventId: parseUint(t["event-id"]),
  };
}

export async function getProposal(proposalId: number) {
  const res = await readOnly(govAddr, govName, "get-proposal", [
    uintCV(proposalId),
  ]);
  const t = parseOptionalTuple(res);
  if (!t) return null;
  return parseProposalTuple(proposalId, t);
}

export async function getAllProposals(count = 20) {
  const results = await Promise.allSettled(
    Array.from({ length: count }, (_, i) => getProposal(i + 1)),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof getProposal>>>> =>
        r.status === "fulfilled" && r.value !== null,
    )
    .map((r) => r.value!);
}

export interface GovernanceConfig {
  votingDuration: number;
  minStake: number;
  minStakeAge: number;
  quorumThreshold: number;
  executionWindow: number;
}

export async function getGovernanceConfig(): Promise<GovernanceConfig> {
  const res = await readOnly(govAddr, govName, "get-config", []);
  const t = parseTuple(res);
  return {
    votingDuration: parseUint(t["voting-duration"]),
    minStake: parseUint(t["min-stake"]),
    minStakeAge: parseUint(t["min-stake-age"]),
    quorumThreshold: parseUint(t["quorum-threshold"]),
    executionWindow: parseUint(t["execution-window"]),
  };
}

export async function getUserVote(
  proposalId: number,
  voter: string,
): Promise<{ vote: boolean; power: number } | null> {
  const res = await readOnly(govAddr, govName, "get-vote", [
    uintCV(proposalId),
    principalCV(voter),
  ]);
  const t = parseOptionalTuple(res);
  if (!t) return null;
  return {
    vote: parseBool(t["vote"]),
    power: parseUint(t["power"]),
  };
}

// ─── GOVERNANCE transaction builders ─────────────────────────────────────────

export async function createProposal(
  title: string,
  question: string,
  targetPrice: number,
  entryFee: number,
  blocksOpen: number,
  useSbtc: boolean,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: govAddr,
    contractName: govName,
    functionName: "create-proposal",
    functionArgs: [
      stringAsciiCV(title.trim().slice(0, 64)),
      stringAsciiCV(question.trim().slice(0, 128)),
      uintCV(targetPrice),
      uintCV(entryFee),
      uintCV(blocksOpen),
      useSbtc ? trueCV() : falseCV(),
    ],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("create-proposal tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("create-proposal cancelled");
      callbacks?.onCancel?.();
    },
  });
}

export async function castVote(
  proposalId: number,
  vote: boolean,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: govAddr,
    contractName: govName,
    functionName: "cast-vote",
    functionArgs: [uintCV(proposalId), vote ? trueCV() : falseCV()],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("cast-vote tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("cast-vote cancelled");
      callbacks?.onCancel?.();
    },
  });
}

export async function cancelProposal(
  proposalId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: govAddr,
    contractName: govName,
    functionName: "cancel-proposal",
    functionArgs: [uintCV(proposalId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("cancel-proposal tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("cancel-proposal cancelled");
      callbacks?.onCancel?.();
    },
  });
}

export async function finalizeProposal(
  proposalId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: govAddr,
    contractName: govName,
    functionName: "finalize-proposal",
    functionArgs: [uintCV(proposalId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("finalize-proposal tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("finalize-proposal cancelled");
      callbacks?.onCancel?.();
    },
  });
}

export async function executeProposal(
  proposalId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: govAddr,
    contractName: govName,
    functionName: "execute-proposal",
    functionArgs: [uintCV(proposalId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("execute-proposal tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("execute-proposal cancelled");
      callbacks?.onCancel?.();
    },
  });
}

export async function expireProposal(
  proposalId: number,
  callbacks?: { onFinish?: (txId: string) => void; onCancel?: () => void },
) {
  await openContractCall({
    contractAddress: govAddr,
    contractName: govName,
    functionName: "expire-proposal",
    functionArgs: [uintCV(proposalId)],
    network: STACKS_TESTNET,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    appDetails: { name: "TrueCall", icon: "/favicon.ico" },
    onFinish: (data: any) => {
      console.log("expire-proposal tx:", data.txId);
      callbacks?.onFinish?.(data.txId);
    },
    onCancel: () => {
      console.log("expire-proposal cancelled");
      callbacks?.onCancel?.();
    },
  });
}

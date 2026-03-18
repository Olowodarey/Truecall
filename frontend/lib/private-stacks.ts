/**
 * private-stacks.ts — Read helpers + tx builders for the private-event contract.
 * Completely separate from stacks.ts — no shared state.
 */

import {
  ClarityType,
  fetchCallReadOnlyFunction,
  stringAsciiCV,
  uintCV,
  boolCV,
  principalCV,
  bufferCV,
  type ClarityValue,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { CONTRACTS } from "./contracts";

// Use Hiro API directly to avoid CORS issues on Vercel
const NETWORK = {
  ...STACKS_TESTNET,
  coreApiUrl: process.env.NEXT_PUBLIC_HIRO_API ?? "https://api.testnet.hiro.so",
};
import type {
  ChainPrivateEvent,
  ChainRound,
  ChainPrivateParticipant,
  ChainRoundAnswer,
  LeaderboardEntry,
} from "./types";

// ─── Contract address/name split ─────────────────────────────────────────────

const [peAddr, peName] = CONTRACTS.PRIVATE_EVENT.split(".");

// ─── Low-level helpers ────────────────────────────────────────────────────────

function parsePrincipal(cv: any): string {
  return cv?.value ?? cv?.address ?? "";
}

function parseUint(cv: any): number {
  if (cv === undefined || cv === null) return 0;
  const v = cv.value !== undefined ? cv.value : cv;
  return Number(v.toString().replace(/n$/, ""));
}

function parseBool(cv: any): boolean {
  if (cv === true || cv?.type === ClarityType.BoolTrue || cv?.type === "true")
    return true;
  if (cv?.value === true) return true;
  return false;
}

function parseString(cv: any): string {
  return String(cv?.data ?? cv?.value ?? cv ?? "");
}

function parseTuple(cv: any): Record<string, any> {
  return cv?.data ?? cv?.value ?? {};
}

function parseOptional(cv: any): any | null {
  if (!cv) return null;
  if (cv.type === ClarityType.OptionalNone || cv.type === "none") return null;
  if (cv.type === ClarityType.ResponseErr) return null;
  let inner = cv;
  if (inner.type === ClarityType.ResponseOk) inner = inner.value;
  if (inner.type === ClarityType.OptionalNone || inner.type === "none")
    return null;
  if (inner.type === ClarityType.OptionalSome || inner.type === "some")
    inner = inner.value;
  return inner;
}

function parseOptionalTuple(cv: any): Record<string, any> | null {
  const inner = parseOptional(cv);
  if (!inner) return null;
  return parseTuple(inner);
}

async function readOnly(
  fn: string,
  args: ClarityValue[],
): Promise<ClarityValue> {
  return fetchCallReadOnlyFunction({
    contractAddress: peAddr,
    contractName: peName,
    functionName: fn,
    functionArgs: args,
    senderAddress: peAddr,
    network: NETWORK,
  });
}
// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPrivateEvent(
  eventId: number,
): Promise<ChainPrivateEvent | null> {
  const res = await readOnly("get-private-event", [uintCV(eventId)]);
  const t = parseOptionalTuple(res);
  if (!t) return null;

  return {
    id: eventId,
    creator: parsePrincipal(t.creator),
    title: parseString(t.title),
    inviteHash: parseString(t["invite-hash"]),
    entryFee: parseUint(t["entry-fee"]),
    joinDeadline: parseUint(t["join-deadline"]),
    maxRounds: parseUint(t["max-rounds"]),
    intervalBlocks: parseUint(t["interval-blocks"]),
    submissionWindow: parseUint(t["submission-window"]),
    answerWindow: parseUint(t["answer-window"]),
    participantCount: parseUint(t["participant-count"]),
    totalPool: parseUint(t["total-pool"]),
    currentRound: parseUint(t["current-round"]),
    completedRounds: parseUint(t["completed-rounds"]),
    nextSubmitterIndex: parseUint(t["next-submitter-index"]),
    isActive: parseBool(t["is-active"]),
    ended: parseBool(t.ended),
    feeBooked: parseBool(t["fee-booked"]),
    refundMode: parseBool(t["refund-mode"]),
  };
}

export async function getAllPrivateEvents(): Promise<ChainPrivateEvent[]> {
  const events: ChainPrivateEvent[] = [];
  let id = 1;
  while (true) {
    const ev = await getPrivateEvent(id).catch(() => null);
    if (!ev) break;
    events.push(ev);
    id++;
  }
  return events;
}

export async function getRound(
  eventId: number,
  roundNumber: number,
): Promise<ChainRound | null> {
  const res = await readOnly("get-round", [
    uintCV(eventId),
    uintCV(roundNumber),
  ]);
  const t = parseOptionalTuple(res);
  if (!t) return null;

  let finalOutcome: boolean | null = null;
  const fo = t["final-outcome"];
  if (fo?.type === ClarityType.OptionalSome || fo?.type === "some") {
    finalOutcome = parseBool(fo.value);
  }

  let question: string | null = null;
  const q = t.question;
  if (q?.type === ClarityType.OptionalSome || q?.type === "some") {
    question = parseString(q.value);
  }

  return {
    eventId,
    roundNumber,
    submitter: parsePrincipal(t.submitter),
    question,
    targetPrice: parseUint(t["target-price"]),
    submissionOpenBlock: parseUint(t["submission-open-block"]),
    submissionDeadline: parseUint(t["submission-deadline"]),
    answerCloseBlock: parseUint(t["answer-close-block"]),
    status: parseString(t.status) as ChainRound["status"],
    oraclePrice: parseUint(t["oracle-price"]),
    finalOutcome,
  };
}

export async function getPrivateParticipant(
  eventId: number,
  user: string,
): Promise<ChainPrivateParticipant | null> {
  const res = await fetchCallReadOnlyFunction({
    contractAddress: peAddr,
    contractName: peName,
    functionName: "get-private-participant",
    functionArgs: [uintCV(eventId), principalCV(user)],
    senderAddress: peAddr,
    network: NETWORK,
  });
  const t = parseOptionalTuple(res);
  if (!t) return null;

  return {
    joined: parseBool(t.joined),
    index: parseUint(t.index),
    refundClaimed: parseBool(t["refund-claimed"]),
  };
}

export async function getRoundAnswer(
  eventId: number,
  roundNumber: number,
  user: string,
): Promise<ChainRoundAnswer | null> {
  const res = await fetchCallReadOnlyFunction({
    contractAddress: peAddr,
    contractName: peName,
    functionName: "get-round-answer",
    functionArgs: [uintCV(eventId), uintCV(roundNumber), principalCV(user)],
    senderAddress: peAddr,
    network: NETWORK,
  });
  const inner = parseOptional(res);
  if (!inner) return null;
  const d = parseTuple(inner);

  return {
    prediction: parseBool(d.prediction),
    pointsClaimed: parseBool(d["points-claimed"]),
  };
}

export async function getPrivateUserPoints(
  eventId: number,
  user: string,
): Promise<number> {
  const res = await readOnly("get-user-points", [
    uintCV(eventId),
    principalCV(user),
  ]);
  return parseUint(res);
}

export async function getPrivateLeaderboard(
  eventId: number,
): Promise<LeaderboardEntry[]> {
  try {
    const res = await readOnly("get-leaderboard", [uintCV(eventId)]);
    const t = parseOptionalTuple(res);
    if (!t) return [];

    const ranks = ["rank1", "rank2", "rank3", "rank4", "rank5"];
    const leaderboard: LeaderboardEntry[] = [];

    for (const r of ranks) {
      const slot = t[r];
      if (
        !slot ||
        (slot.type !== ClarityType.OptionalSome && slot.type !== "some")
      )
        continue;
      const inner = slot.value;
      const entry = inner?.data ?? inner?.value ?? inner ?? {};
      const user = parsePrincipal(entry.user);
      const points = parseUint(entry.points);
      if (user) leaderboard.push({ user, points });
    }

    return leaderboard;
  } catch {
    return [];
  }
}

export async function isEventMember(
  eventId: number,
  user: string,
): Promise<boolean> {
  const res = await readOnly("event-is-member", [
    uintCV(eventId),
    principalCV(user),
  ]);
  return parseBool(res);
}
// ─── Tx builders ─────────────────────────────────────────────────────────────

const BASE_TX = {
  contractAddress: peAddr,
  contractName: peName,
  network: NETWORK,
  anchorMode: 3, // AnchorMode.Any
};

export function createPrivateEventTxOptions(
  title: string,
  inviteHash: Uint8Array, // sha256(invite-code) — 32 bytes
  entryFee: number,
  joinDeadline: number,
  maxRounds: number,
  intervalBlocks: number,
  submissionWindow: number,
  answerWindow: number,
) {
  return {
    ...BASE_TX,
    functionName: "create-private-event",
    functionArgs: [
      stringAsciiCV(title),
      bufferCV(inviteHash),
      uintCV(entryFee),
      uintCV(joinDeadline),
      uintCV(maxRounds),
      uintCV(intervalBlocks),
      uintCV(submissionWindow),
      uintCV(answerWindow),
    ],
    postConditionMode: 2, // Deny
    postConditions: [],
  };
}

export function joinPrivateEventTxOptions(
  eventId: number,
  inviteCode: Uint8Array,
) {
  return {
    ...BASE_TX,
    functionName: "join-private-event",
    functionArgs: [uintCV(eventId), bufferCV(inviteCode)],
    postConditionMode: 1, // Allow — STX transfer
    postConditions: [],
  };
}

export function startPrivateEventTxOptions(eventId: number) {
  return {
    ...BASE_TX,
    functionName: "start-private-event",
    functionArgs: [uintCV(eventId)],
    postConditionMode: 2,
    postConditions: [],
  };
}

export function submitRoundQuestionTxOptions(
  eventId: number,
  roundNumber: number,
  question: string,
  targetPrice: number,
) {
  return {
    ...BASE_TX,
    functionName: "submit-round-question",
    functionArgs: [
      uintCV(eventId),
      uintCV(roundNumber),
      stringAsciiCV(question),
      uintCV(targetPrice),
    ],
    postConditionMode: 2,
    postConditions: [],
  };
}

export function answerRoundTxOptions(
  eventId: number,
  roundNumber: number,
  prediction: boolean,
) {
  return {
    ...BASE_TX,
    functionName: "answer-round",
    functionArgs: [uintCV(eventId), uintCV(roundNumber), boolCV(prediction)],
    postConditionMode: 2,
    postConditions: [],
  };
}

/** Creator-only: supply the BTC price (whole dollars) to finalize the round */
export function resolveRoundTxOptions(
  eventId: number,
  roundNumber: number,
  oraclePrice: number,
) {
  return {
    ...BASE_TX,
    functionName: "resolve-round",
    functionArgs: [uintCV(eventId), uintCV(roundNumber), uintCV(oraclePrice)],
    postConditionMode: 2,
    postConditions: [],
  };
}

/** Creator-only: skip a round where the submitter missed the window */
export function skipMissedRoundTxOptions(eventId: number, roundNumber: number) {
  return {
    ...BASE_TX,
    functionName: "skip-missed-round",
    functionArgs: [uintCV(eventId), uintCV(roundNumber)],
    postConditionMode: 2,
    postConditions: [],
  };
}

export function claimRoundPointsTxOptions(
  eventId: number,
  roundNumber: number,
) {
  return {
    ...BASE_TX,
    functionName: "claim-round-points",
    functionArgs: [uintCV(eventId), uintCV(roundNumber)],
    postConditionMode: 2,
    postConditions: [],
  };
}

export function claimPrivateRefundTxOptions(eventId: number) {
  return {
    ...BASE_TX,
    functionName: "claim-refund",
    functionArgs: [uintCV(eventId)],
    postConditionMode: 1, // Allow — STX transfer back
    postConditions: [],
  };
}

export function claimPrivateWinningsTxOptions(eventId: number) {
  return {
    ...BASE_TX,
    functionName: "claim-winnings",
    functionArgs: [uintCV(eventId)],
    postConditionMode: 1, // Allow — STX transfer
    postConditions: [],
  };
}

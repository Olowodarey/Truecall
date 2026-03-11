/**
 * stacks.ts — On-chain read helpers + transaction builders for TrueCall
 * All reads go directly to Hiro testnet API (no backend needed).
 * All writes use @stacks/transactions + @stacks/connect.
 */

import {
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
  bufferCV,
  type ClarityValue,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { CONTRACTS } from "./contracts";
import type {
  ChainEvent,
  ChainQuestion,
  ChainAnswer,
  ChainParticipant,
  LeaderboardEntry,
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
  cv: ClarityValue | any
): Record<string, any> | null {
  if (cv.type === ClarityType.OptionalNone) return null;
  const inner = cv.value ?? cv;
  return parseTuple(inner);
}

async function readOnly(
  contractAddress: string,
  contractName: string,
  functionName: string,
  args: ClarityValue[]
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

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getEvent(eventId: number): Promise<ChainEvent | null> {
  const res = await readOnly(pmAddr, pmName, "get-event", [uintCV(eventId)]);
  const t = parseOptionalTuple(res);
  if (!t) return null;

  return {
    id: eventId,
    title: parseString(t.title),
    creator: parsePrincipal(t.creator),
    startBlock: parseUint(t["start-block"]),
    endBlock: parseUint(t["end-block"]),
    entryFee: parseUint(t["entry-fee"]),
    questionCount: parseUint(t["question-count"]),
    finalizedQuestionCount: parseUint(t["finalized-question-count"]),
    participantCount: parseUint(t.participant_count),
    totalPool: parseUint(t["total-pool"]),
    isActive: parseBool(t["is-active"]),
    feeBooked: parseBool(t["fee-booked"]),
    refundMode: parseBool(t["refund-mode"]),
  } as ChainEvent;
}

export async function getQuestion(
  questionId: number
): Promise<ChainQuestion | null> {
  const res = await readOnly(pmAddr, pmName, "get-question", [
    uintCV(questionId),
  ]);
  const t = parseOptionalTuple(res);
  if (!t) return null;

  let finalOutcome: boolean | null = null;
  if (t["final-outcome"]?.type === ClarityType.OptionalSome) {
    finalOutcome = parseBool(t["final-outcome"].value);
  }

  return {
    id: questionId,
    eventId: parseUint(t["event-id"]),
    question: parseString(t.question),
    targetPrice: parseUint(t["target-price"]),
    closeBlock: parseUint(t["close-block"]),
    status: parseString(t.status) as "open" | "final",
    oraclePrice: parseUint(t["oracle-price"]),
    finalOutcome,
  };
}

export async function getParticipant(
  eventId: number,
  user: string
): Promise<ChainParticipant | null> {
  const res = await readOnly(pmAddr, pmName, "get-participant", [
    uintCV(eventId),
    principalCV(user),
  ]);
  const t = parseOptionalTuple(res);
  if (!t) return null;

  return {
    joined: parseBool(t.joined),
    refundClaimed: parseBool(t["refund-claimed"]),
  };
}

export async function getAnswer(
  questionId: number,
  user: string
): Promise<ChainAnswer | null> {
  const res = await readOnly(pmAddr, pmName, "get-answer", [
    uintCV(questionId),
    principalCV(user),
  ]);
  const t = parseOptionalTuple(res);
  if (!t) return null;

  return {
    prediction: parseBool(t.prediction),
    pointsClaimed: parseBool(t["points-claimed"]),
  };
}

export async function getUserPoints(
  eventId: number,
  user: string
): Promise<number> {
  const res = await readOnly(pmAddr, pmName, "get-user-points", [
    uintCV(eventId),
    principalCV(user),
  ]);
  return parseUint(res);
}

export async function getLeaderboard(eventId: number): Promise<LeaderboardEntry[]> {
  const res = await readOnly(pmAddr, pmName, "get-leaderboard", [uintCV(eventId)]);
  const t = parseOptionalTuple(res);
  if (!t) return [];

  const ranks = ["rank1", "rank2", "rank3", "rank4", "rank5"];
  const leaderboard: LeaderboardEntry[] = [];

  for (const r of ranks) {
    if (t[r] && t[r].type === ClarityType.OptionalSome) {
      const entryTuple = t[r].value.data;
      leaderboard.push({
        user: parsePrincipal(entryTuple.user),
        points: parseUint(entryTuple.points),
      });
    }
  }

  return leaderboard;
}

// ─── Writes ──────────────────────────────────────────────────────────────────

export function createEventTxOptions(
  title: string,
  startBlock: number,
  endBlock: number,
  entryFee: number
) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "create-event",
    functionArgs: [
      stringAsciiCV(title),
      uintCV(startBlock),
      uintCV(endBlock),
      uintCV(entryFee),
    ],
    network: STACKS_TESTNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
  };
}

export function joinEventTxOptions(eventId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "join-event",
    functionArgs: [uintCV(eventId)],
    network: STACKS_TESTNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, // Allows STX transfer
    postConditions: [],
  };
}

export function addQuestionTxOptions(
  eventId: number,
  question: string,
  targetPrice: number,
  closeBlock: number
) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "add-question",
    functionArgs: [
      uintCV(eventId),
      stringAsciiCV(question),
      uintCV(targetPrice),
      uintCV(closeBlock),
    ],
    network: STACKS_TESTNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
  };
}

export function answerQuestionTxOptions(questionId: number, prediction: boolean) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "answer-question",
    functionArgs: [uintCV(questionId), boolCV(prediction)],
    network: STACKS_TESTNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
  };
}

export function finalizeQuestionTxOptions(
  questionId: number,
  priceFeedBytes: Uint8Array
) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "finalize-question",
    functionArgs: [uintCV(questionId), bufferCV(priceFeedBytes)],
    network: STACKS_TESTNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, // Allows 1 uSTX fee for Pyth
    postConditions: [],
  };
}

export function claimPointsTxOptions(questionId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-points",
    functionArgs: [uintCV(questionId)],
    network: STACKS_TESTNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
  };
}

export function closeEventTxOptions(eventId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "close-event",
    functionArgs: [uintCV(eventId)],
    network: STACKS_TESTNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
  };
}

export function claimRefundTxOptions(eventId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-refund",
    functionArgs: [uintCV(eventId)],
    network: STACKS_TESTNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    postConditions: [],
  };
}

export function claimWinningsTxOptions(eventId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-winnings",
    functionArgs: [uintCV(eventId)],
    network: STACKS_TESTNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    postConditions: [],
  };
}

export async function getAllEvents(): Promise<ChainEvent[]> {
  const events: ChainEvent[] = [];
  let currentId = 1;
  while (true) {
    const ev = await getEvent(currentId);
    if (!ev) break;
    events.push(ev);
    currentId++;
  }
  return events;
}

export async function getQuestionsForEvent(eventId: number): Promise<ChainQuestion[]> {
  const ev = await getEvent(eventId);
  if (!ev) return [];
  const questions: ChainQuestion[] = [];
  for (let i = 0; i < ev.questionCount; i++) {
    const res = await readOnly(pmAddr, pmName, "get-question-id-for-event", [
      uintCV(eventId),
      uintCV(i),
    ]);
    const t = parseOptionalTuple(res);
    if (!t) continue;
    const qId = parseUint(t["question-id"]);
    const q = await getQuestion(qId);
    if (q) questions.push(q);
  }
  return questions;
}

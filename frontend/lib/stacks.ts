/**
 * stacks.ts — On-chain read helpers + transaction builders for TrueCall
 * All reads go directly to Hiro testnet API (no backend needed).
 * All writes use @stacks/transactions + @stacks/connect.
 */

import {
  ClarityType,
  fetchCallReadOnlyFunction,
  stringAsciiCV,
  uintCV,
  intCV,
  boolCV,
  principalCV,
  bufferCV,
  tupleCV,
  type ClarityValue,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { CONTRACTS } from "./contracts";
import { withCache } from "./cache";
import type {
  ChainEvent,
  ChainQuestion,
  ChainAnswer,
  ChainParticipant,
  LeaderboardEntry,
} from "./types";

// ─── Network (use Hiro API to avoid CORS issues on Vercel) ───────────────────

const NETWORK = {
  ...STACKS_TESTNET,
  coreApiUrl: process.env.NEXT_PUBLIC_HIRO_API ?? "https://api.testnet.hiro.so",
};

// ─── Contract split ───────────────────────────────────────────────────────────

const [pmAddr, pmName] = CONTRACTS.PREDICTION_MARKET.split(".");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePrincipal(cv: ClarityValue): string {
  return (cv as any).value ?? "";
}

function parseUint(cv: ClarityValue | any): number {
  if (cv === undefined || cv === null) return 0;
  const val = cv.value !== undefined ? cv.value : cv;
  return Number(val);
}

function parseBool(cv: ClarityValue | any): boolean {
  if (cv === true) return true;
  if (cv === false) return false;
  if (cv?.type === ClarityType.BoolTrue) return true;
  if (cv?.type === ClarityType.BoolFalse) return false;
  if (cv?.type === "true") return true;
  if (cv?.type === "false") return false;
  if (cv?.value === true) return true;
  if (cv?.value === false) return false;
  return false;
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
  if (!cv) return null;
  if (cv.type === ClarityType.OptionalNone) return null;
  if (cv.type === ClarityType.ResponseErr) return null;

  let inner = cv;
  if (inner.type === ClarityType.ResponseOk) inner = inner.value;
  if (inner.type === ClarityType.OptionalNone) return null;
  if (inner.type === ClarityType.OptionalSome) inner = inner.value;

  return parseTuple(inner);
}

async function readOnly(
  contractAddress: string,
  contractName: string,
  functionName: string,
  args: ClarityValue[],
): Promise<ClarityValue> {
  const argStr = args
    .map((a) => String((a as any).value ?? (a as any).data ?? a.type))
    .join("-");
  const cacheKey = `readOnly-${functionName}-${argStr}`;

  return withCache(cacheKey, async () => {
    return fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName,
      functionArgs: args,
      senderAddress: contractAddress,
      network: NETWORK,
    });
  });
}

// ─── Reads ────────────────────────────────────────────────────────────────────

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
    participantCount: parseUint(t["participant_count"]),
    totalPool: parseUint(t["total-pool"]),
    isActive: parseBool(t["is-active"]),
    feeBooked: parseBool(t["fee-booked"]),
    refundMode: parseBool(t["refund-mode"]),
  } as ChainEvent;
}

export async function getQuestion(
  questionId: number,
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
    resolveBlock: parseUint(t["resolve-block"]),
    status: parseString(t.status) as "open" | "final",
    oraclePrice: parseUint(t["oracle-price"]),
    finalOutcome,
  };
}

export async function getParticipant(
  eventId: number,
  user: string,
): Promise<ChainParticipant | null> {
  const res = await fetchCallReadOnlyFunction({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "get-participant",
    functionArgs: [uintCV(eventId), principalCV(user)],
    senderAddress: pmAddr,
    network: NETWORK,
  });
  const t = parseOptionalTuple(res);
  if (!t) return null;

  return {
    joined: parseBool(t.joined),
    refundClaimed: parseBool(t["refund-claimed"]),
  };
}

export async function getAnswer(
  questionId: number,
  user: string,
): Promise<ChainAnswer | null> {
  const res = await fetchCallReadOnlyFunction({
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "get-answer",
    functionArgs: [uintCV(questionId), principalCV(user)],
    senderAddress: pmAddr,
    network: NETWORK,
  });

  let inner: any = res;
  if (inner?.type === ClarityType.ResponseOk) inner = inner.value;
  if (
    !inner ||
    inner?.type === ClarityType.OptionalNone ||
    inner?.type === "none"
  )
    return null;
  if (inner?.type === ClarityType.OptionalSome || inner?.type === "some")
    inner = inner.value;

  const data: Record<string, any> = inner?.data ?? inner?.value ?? inner ?? {};
  if (!data || Object.keys(data).length === 0) return null;

  return {
    prediction: parseBool(data.prediction),
    pointsClaimed: parseBool(data["points-claimed"]),
  };
}

export async function getUserPoints(
  eventId: number,
  user: string,
): Promise<number> {
  const res = await readOnly(pmAddr, pmName, "get-user-points", [
    uintCV(eventId),
    principalCV(user),
  ]);
  return parseUint(res);
}

export async function getLeaderboard(
  eventId: number,
): Promise<LeaderboardEntry[]> {
  try {
    const res = await readOnly(pmAddr, pmName, "get-leaderboard", [
      uintCV(eventId),
    ]);
    const t = parseOptionalTuple(res);
    if (!t) return [];

    const ranks = ["rank1", "rank2", "rank3", "rank4", "rank5"];
    const leaderboard: LeaderboardEntry[] = [];

    for (const r of ranks) {
      const slot = t[r];
      if (!slot || slot.type !== ClarityType.OptionalSome) continue;
      const inner = slot.value;
      const entryData: Record<string, any> =
        inner?.data ?? inner?.value ?? inner ?? {};
      const user = parsePrincipal(entryData.user);
      const points = parseUint(entryData.points);
      if (user) leaderboard.push({ user, points });
    }

    return leaderboard;
  } catch {
    return [];
  }
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

export async function getQuestionsForEvent(
  eventId: number,
): Promise<ChainQuestion[]> {
  try {
    const ev = await getEvent(eventId);
    if (!ev || ev.questionCount === 0) return [];

    const indices = Array.from({ length: ev.questionCount }, (_, i) => i);
    const idResults = await Promise.all(
      indices.map((i) =>
        readOnly(pmAddr, pmName, "get-question-id-for-event", [
          uintCV(eventId),
          uintCV(i),
        ]).catch(() => null),
      ),
    );

    const questionIds: number[] = [];
    for (const res of idResults) {
      if (!res) continue;
      const t = parseOptionalTuple(res);
      if (!t) continue;
      questionIds.push(parseUint(t["question-id"]));
    }

    const questions = await Promise.all(
      questionIds.map((qId) => getQuestion(qId).catch(() => null)),
    );

    return questions.filter(Boolean) as ChainQuestion[];
  } catch {
    return [];
  }
}
// ─── Tx builders ─────────────────────────────────────────────────────────────

export function createEventTxOptions(
  title: string,
  startBlock: number,
  endBlock: number,
  entryFee: number,
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
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 2,
    postConditions: [],
  };
}

export function joinEventTxOptions(eventId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "join-event",
    functionArgs: [uintCV(eventId)],
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 1,
    postConditions: [],
  };
}

export function addQuestionTxOptions(
  eventId: number,
  question: string,
  targetPrice: number,
  closeBlock: number,
  resolveBlock: number,
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
      uintCV(resolveBlock),
    ],
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 2,
    postConditions: [],
  };
}

export function answerQuestionTxOptions(
  questionId: number,
  prediction: boolean,
) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "answer-question",
    functionArgs: [uintCV(questionId), boolCV(prediction)],
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 2,
    postConditions: [],
  };
}

export function finalizeQuestionTxOptions(
  questionId: number,
  oraclePrice: number,
) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "finalize-question",
    functionArgs: [uintCV(questionId), uintCV(oraclePrice)],
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 2,
    postConditions: [],
  };
}

export function claimPointsTxOptions(questionId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-points",
    functionArgs: [uintCV(questionId)],
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 2,
    postConditions: [],
  };
}

export function closeEventTxOptions(eventId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "close-event",
    functionArgs: [uintCV(eventId)],
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 2,
    postConditions: [],
  };
}

export function claimRefundTxOptions(eventId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-refund",
    functionArgs: [uintCV(eventId)],
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 1,
    postConditions: [],
  };
}

export function claimWinningsTxOptions(eventId: number) {
  return {
    contractAddress: pmAddr,
    contractName: pmName,
    functionName: "claim-winnings",
    functionArgs: [uintCV(eventId)],
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 1,
    postConditions: [],
  };
}

// ── Pyth storage helpers ──────────────────────────────────────────────────────

const PYTH_STORAGE = "STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM";
const BTC_FEED_ID_HEX =
  "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

export async function getPythStoredPrice(): Promise<{
  price: number;
  expo: number;
  publishTime: number;
} | null> {
  try {
    const feedIdBytes = Uint8Array.from(
      BTC_FEED_ID_HEX.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
    );
    const res = await fetchCallReadOnlyFunction({
      contractAddress: PYTH_STORAGE,
      contractName: "pyth-storage-v4",
      functionName: "get-price",
      functionArgs: [bufferCV(feedIdBytes)],
      senderAddress: PYTH_STORAGE,
      network: NETWORK,
    });
    if ((res as any).type === ClarityType.ResponseErr) return null;
    const inner =
      (res as any).type === ClarityType.ResponseOk ? (res as any).value : res;
    const d = (inner as any).data ?? (inner as any).value ?? {};
    const rawPrice = Number(
      (d.price?.value ?? d.price ?? 0).toString().replace(/n$/, ""),
    );
    const rawExpo = Number(
      (d.expo?.value ?? d.expo ?? 0).toString().replace(/n$/, ""),
    );
    const rawPublish = Number(
      (d["publish-time"]?.value ?? d["publish-time"] ?? 0)
        .toString()
        .replace(/n$/, ""),
    );
    if (rawPrice === 0) return null;
    return { price: rawPrice, expo: rawExpo, publishTime: rawPublish };
  } catch {
    return null;
  }
}

export function setPriceTestnetTxOptions(
  priceInt: number,
  expo: number,
  conf: number,
  publishTime: number,
) {
  const feedIdBytes = Uint8Array.from(
    BTC_FEED_ID_HEX.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
  );
  return {
    contractAddress: PYTH_STORAGE,
    contractName: "pyth-storage-v4",
    functionName: "set-price-testnet",
    functionArgs: [
      tupleCV({
        "price-identifier": bufferCV(feedIdBytes),
        price: intCV(priceInt),
        conf: uintCV(conf),
        expo: intCV(expo),
        "ema-price": intCV(priceInt),
        "ema-conf": uintCV(conf),
        "publish-time": uintCV(publishTime),
        "prev-publish-time": uintCV(Math.max(0, publishTime - 1)),
      }),
    ],
    network: NETWORK,
    anchorMode: 3,
    postConditionMode: 2,
    postConditions: [],
  };
}

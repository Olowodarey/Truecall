import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { config } from "../config";
import { CREATOR_EVENT_MANAGER_ABI } from "../abi/CreatorEventManager.abi";
import { logger } from "../utils/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatorMatch {
  matchId: bigint;
  eventId: bigint;
  apiMatchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: bigint;
  status: number;
}

// ─── Chain detection ──────────────────────────────────────────────────────────

// Use Celo Mainnet
const chain = celo;

// ─── Clients ──────────────────────────────────────────────────────────────────

const account = privateKeyToAccount(config.agentPrivateKey);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const publicClient = createPublicClient({
  chain,
  transport: http(config.celoRpcUrl),
}) as any;

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(config.celoRpcUrl),
});

const creatorEventManagerAddress = (process.env.CREATOR_EVENT_MANAGER_ADDRESS ||
  "0x8A18Da2A173b3951c797a438102345cF92838880") as `0x${string}`;

logger.info("Creator Match Client initialized", {
  address: account.address,
  creatorEventManager: creatorEventManagerAddress,
  chain: "Celo Mainnet",
  chainId: chain.id,
});

// ─── Contract reads ───────────────────────────────────────────────────────────

/**
 * Scan past MatchAdded events from CreatorEventManager
 */
export async function getPendingCreatorMatchesFromLogs(
  fromBlock: bigint,
  toBlock: bigint,
): Promise<CreatorMatch[]> {
  try {
    const logs = await publicClient.getLogs({
      address: creatorEventManagerAddress,
      event: CREATOR_EVENT_MANAGER_ABI.find(
        (x) => x.type === "event" && x.name === "MatchAdded",
      ) as any,
      fromBlock,
      toBlock,
    });

    return logs.map((log: any) => ({
      matchId: log.args.matchId as bigint,
      eventId: log.args.eventId as bigint,
      apiMatchId: log.args.apiMatchId as string,
      homeTeam: log.args.homeTeam as string,
      awayTeam: log.args.awayTeam as string,
      kickoffTime: log.args.kickoffTime as bigint,
      status: 0, // OPEN
    }));
  } catch (err) {
    logger.error("Failed to fetch MatchAdded logs", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Read a single match from CreatorEventManager
 */
export async function getCreatorMatch(
  matchId: bigint,
): Promise<CreatorMatch | null> {
  try {
    const match = await publicClient.readContract({
      address: creatorEventManagerAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "getMatch",
      args: [matchId],
    });

    return {
      matchId: match.matchId as bigint,
      eventId: match.eventId as bigint,
      apiMatchId: match.apiMatchId as string,
      homeTeam: match.homeTeam as string,
      awayTeam: match.awayTeam as string,
      kickoffTime: match.kickoffTime as bigint,
      status: match.status as number,
    };
  } catch (err) {
    logger.error("Failed to read match from contract", {
      matchId: matchId.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Contract writes ──────────────────────────────────────────────────────────

/**
 * Submit match result to CreatorEventManager
 */
export async function submitCreatorMatchResult(
  matchId: bigint,
  homeScore: number,
  awayScore: number,
): Promise<`0x${string}`> {
  logger.info("Submitting creator match result", {
    matchId: matchId.toString(),
    homeScore,
    awayScore,
  });

  try {
    const txHash = await walletClient.writeContract({
      address: creatorEventManagerAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "submitMatchResult",
      args: [matchId, homeScore, awayScore],
    });

    logger.info("Transaction submitted", {
      txHash,
      matchId: matchId.toString(),
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === "reverted") {
      throw new Error(`Transaction reverted: ${txHash}`);
    }

    logger.info("Creator match result confirmed on-chain", {
      matchId: matchId.toString(),
      homeScore,
      awayScore,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
    });

    return txHash;
  } catch (err) {
    logger.error("Failed to submit creator match result", {
      matchId: matchId.toString(),
      homeScore,
      awayScore,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

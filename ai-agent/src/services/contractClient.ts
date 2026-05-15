import {
  createPublicClient,
  createWalletClient,
  http,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoAlfajores } from "viem/chains";
import { config } from "../config";
import { EVENT_MANAGER_ABI } from "../abi/EventManager.abi";
import { logger } from "../utils/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingMatch {
  matchId: bigint;
  eventId: bigint;
  apiMatchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: bigint;
}

// ─── Chain detection ──────────────────────────────────────────────────────────

// Celo Sepolia testnet (chain ID 11142220) — replaces Alfajores
const celoSepolia = {
  ...celoAlfajores,
  id: 11142220,
  name: "Celo Sepolia",
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
    public: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://celo-sepolia.blockscout.com" },
  },
} as const;

const isMainnet =
  config.celoRpcUrl.includes("forno.celo.org") &&
  !config.celoRpcUrl.includes("sepolia");
const chain = isMainnet ? celo : celoSepolia;

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

logger.info("Agent wallet loaded", { address: account.address });

// ─── Contract reads ───────────────────────────────────────────────────────────

/**
 * Scan past MatchAdded events to find all matches the agent needs to track.
 * On startup we look back STARTUP_BLOCK_LOOKBACK blocks.
 * On subsequent polls we only look at new blocks.
 */
export async function getPendingMatchesFromLogs(
  fromBlock: bigint,
  toBlock: bigint,
): Promise<PendingMatch[]> {
  const logs = await publicClient.getLogs({
    address: config.eventManagerAddress,
    event: EVENT_MANAGER_ABI.find(
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
  }));
}

/**
 * Read a single match from the contract to check its current status.
 * Status enum: 0=OPEN, 1=LOCKED, 2=VERIFIED, 3=DISPUTED
 */
export async function getMatchStatus(matchId: bigint): Promise<number> {
  const match = await publicClient.readContract({
    address: config.eventManagerAddress,
    abi: EVENT_MANAGER_ABI,
    functionName: "getMatch",
    args: [matchId],
  });
  return match.status;
}

// ─── Contract writes ──────────────────────────────────────────────────────────

/**
 * Build the resultProof: keccak256(matchId, homeScore, awayScore, timestamp, agentAddress)
 * This is stored on-chain as tamper-evident proof of who submitted what and when.
 */
function buildResultProof(
  matchId: bigint,
  homeScore: number,
  awayScore: number,
  timestamp: bigint,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("uint256, uint8, uint8, uint256, address"),
      [matchId, homeScore, awayScore, timestamp, account.address],
    ),
  );
}

/**
 * Submit a verified match result to the EventManager contract.
 * Only callable by the wallet whose address is set as aiOracleAgent.
 */
export async function submitMatchResult(
  matchId: bigint,
  homeScore: number,
  awayScore: number,
): Promise<`0x${string}`> {
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const resultProof = buildResultProof(
    matchId,
    homeScore,
    awayScore,
    timestamp,
  );

  logger.info("Submitting match result", {
    matchId: matchId.toString(),
    homeScore,
    awayScore,
    resultProof,
  });

  const txHash = await walletClient.writeContract({
    address: config.eventManagerAddress,
    abi: EVENT_MANAGER_ABI,
    functionName: "submitMatchResult",
    args: [matchId, homeScore, awayScore, resultProof],
  });

  logger.info("Transaction submitted", { txHash });

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status === "reverted") {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  logger.info("Match result confirmed on-chain", {
    matchId: matchId.toString(),
    txHash,
    blockNumber: receipt.blockNumber.toString(),
  });

  return txHash;
}

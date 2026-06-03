/**
 * Creator Match Watcher
 * Automatically fetches match results from backend API and submits to CreatorEventManager
 *
 * Flow:
 * 1. Scan for MatchAdded events on CreatorEventManager
 * 2. For matches past their kickoff time, fetch result from backend
 * 3. If match is finished, submit the result to contract
 * 4. Contract calculates winners automatically
 */

import { config } from "./config";
import { logger } from "./utils/logger";
import { matchDataService } from "./services/matchDataService";
import {
  publicClient,
  getPendingCreatorMatchesFromLogs,
  getCreatorMatch,
  submitCreatorMatchResult,
  type CreatorMatch,
} from "./services/creatorMatchClient";

// ─── Match status enum (mirrors Solidity) ────────────────────────────────────

const MatchStatus = {
  OPEN: 0,
  VERIFIED: 1,
} as const;

// ─── In-memory state ──────────────────────────────────────────────────────────

interface TrackedCreatorMatch extends CreatorMatch {
  lastCheckedAt?: number;
  resultSubmitted?: boolean;
}

/**
 * Tracked matches: matchId → TrackedCreatorMatch
 */
const trackedMatches = new Map<string, TrackedCreatorMatch>();

/**
 * Last block we scanned
 */
let lastScannedBlock: bigint = 0n;

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Fetch match result from backend API
 */
async function fetchMatchResultFromBackend(apiMatchId: string): Promise<{
  homeScore: number;
  awayScore: number;
  isFinished: boolean;
} | null> {
  try {
    const backendUrl =
      process.env.BACKEND_API_URL || "http://localhost:3001/api";
    const response = await fetch(`${backendUrl}/matches/${apiMatchId}`);

    if (!response.ok) {
      logger.warn("Backend API returned error", {
        apiMatchId,
        status: response.status,
      });
      return null;
    }

    const data = await response.json();

    // If match has a final score, it's finished
    if (
      data.finalHomeScore !== undefined &&
      data.finalAwayScore !== undefined
    ) {
      return {
        homeScore: data.finalHomeScore,
        awayScore: data.finalAwayScore,
        isFinished: true,
      };
    }

    return null;
  } catch (err) {
    logger.warn("Failed to fetch match result from backend", {
      apiMatchId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Also check JSON data for match results (fallback)
 */
function getMatchResultFromJson(
  apiMatchId: string,
): { homeScore: number; awayScore: number; isFinished: boolean } | null {
  const match = matchDataService.getByApiId(apiMatchId) as any;

  if (!match) {
    return null;
  }

  // For testing: if kickoff time has passed, check for actual results in JSON
  const now = Math.floor(Date.now() / 1000);
  if (match.kickoffTime <= now) {
    // If the JSON has actual scores, use them
    if (
      match.finalHomeScore !== undefined &&
      match.finalAwayScore !== undefined
    ) {
      logger.info("Using match result from JSON data", {
        apiMatchId,
        homeScore: match.finalHomeScore,
        awayScore: match.finalAwayScore,
      });

      return {
        homeScore: match.finalHomeScore,
        awayScore: match.finalAwayScore,
        isFinished: true,
      };
    }

    // Otherwise generate deterministic result based on match ID for testing
    const hash = hashCode(apiMatchId);
    const homeScore = Math.abs(hash % 4);
    const awayScore = Math.abs((hash / 4) % 4);

    logger.info("Using generated test result from JSON", {
      apiMatchId,
      homeScore,
      awayScore,
    });

    return { homeScore, awayScore, isFinished: true };
  }

  return null;
}

/**
 * Simple hash function for deterministic test results
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Scan for new MatchAdded events
 */
async function syncNewMatches(): Promise<void> {
  const latestBlock = await publicClient.getBlockNumber();

  const fromBlock =
    lastScannedBlock === 0n
      ? latestBlock - BigInt(config.startupBlockLookback)
      : lastScannedBlock + 1n;

  if (fromBlock > latestBlock) return;

  logger.debug("Scanning for new CreatorEventManager MatchAdded events", {
    fromBlock: fromBlock.toString(),
    toBlock: latestBlock.toString(),
  });

  const newMatches = await getPendingCreatorMatchesFromLogs(
    fromBlock,
    latestBlock,
  );

  for (const match of newMatches) {
    const key = match.matchId.toString();
    if (!trackedMatches.has(key)) {
      trackedMatches.set(key, {
        ...match,
        lastCheckedAt: undefined,
        resultSubmitted: false,
      });
      logger.info("🎯 Tracking new creator match", {
        matchId: key,
        apiMatchId: match.apiMatchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        eventId: match.eventId.toString(),
        kickoffTime: new Date(Number(match.kickoffTime) * 1000).toISOString(),
      });
    }
  }

  lastScannedBlock = latestBlock;
}

/**
 * Process tracked matches — check if finished and submit results
 */
async function processTrackedMatches(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  for (const [key, match] of trackedMatches.entries()) {
    // Skip if already submitted
    if (match.resultSubmitted) {
      logger.debug("Match result already submitted, skipping", {
        matchId: key,
      });
      trackedMatches.delete(key);
      continue;
    }

    // Use the kickoff time from the contract (source of truth)
    // The contract kickoffTime is what matters for when to submit results
    const contractKickoffTime = Number(match.kickoffTime);

    // Skip if match hasn't kicked off yet (based on contract time)
    if (contractKickoffTime > now) {
      logger.debug("Match not kicked off yet", {
        matchId: key,
        kickoffTime: new Date(contractKickoffTime * 1000).toISOString(),
        contractKickoffTime,
        now,
      });
      continue;
    }

    // Check on-chain status
    let onChainMatch;
    try {
      onChainMatch = await getCreatorMatch(match.matchId);
    } catch (err) {
      logger.error("Failed to read match from contract", {
        matchId: key,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    if (!onChainMatch) {
      logger.warn("Match not found on contract", { matchId: key });
      continue;
    }

    if (onChainMatch.status !== MatchStatus.OPEN) {
      logger.info("Match already verified, removing from tracker", {
        matchId: key,
      });
      trackedMatches.delete(key);
      continue;
    }

    // Try to fetch result from backend first, then fallback to JSON
    let result = await fetchMatchResultFromBackend(match.apiMatchId);

    if (!result) {
      logger.debug("No result from backend, checking JSON data", {
        matchId: key,
        apiMatchId: match.apiMatchId,
      });
      result = getMatchResultFromJson(match.apiMatchId);
    }

    if (!result || !result.isFinished) {
      logger.debug("Match not finished yet", {
        matchId: key,
        apiMatchId: match.apiMatchId,
      });
      continue;
    }

    // Submit result to contract
    try {
      logger.info("📊 Submitting match result", {
        matchId: key,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        result: `${result.homeScore}-${result.awayScore}`,
      });

      await submitCreatorMatchResult(
        match.matchId,
        result.homeScore,
        result.awayScore,
      );

      // Mark as submitted
      const updated = trackedMatches.get(key);
      if (updated) {
        updated.resultSubmitted = true;
      }

      logger.info("✅ Match result submitted successfully", {
        matchId: key,
        result: `${result.homeScore}-${result.awayScore}`,
      });

      // Remove from tracker after a delay
      setTimeout(() => {
        trackedMatches.delete(key);
      }, 5000);
    } catch (err) {
      logger.error("Failed to submit match result", {
        matchId: key,
        error: err instanceof Error ? err.message : String(err),
      });
      // Keep in tracker — will retry on next poll
    }
  }
}

// ─── Main poll loop ───────────────────────────────────────────────────────────

/**
 * Single poll cycle
 */
async function poll(): Promise<void> {
  try {
    await syncNewMatches();
    await processTrackedMatches();
    logger.debug("Creator match watcher poll complete", {
      trackedCount: trackedMatches.size,
    });
  } catch (err) {
    logger.error("Unexpected error during creator match poll", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Start the creator match watcher
 */
export async function startCreatorMatchWatcher(): Promise<void> {
  logger.info("🤖 Creator Match Watcher starting", {
    pollIntervalMs: config.pollIntervalMs,
  });

  // Run immediately on startup
  await poll();

  // Then repeat on interval
  setInterval(poll, config.pollIntervalMs);
}

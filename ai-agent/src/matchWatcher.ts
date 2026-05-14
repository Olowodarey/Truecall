import { config } from "./config";
import { logger } from "./utils/logger";
import { footballApi } from "./services/footballApi";
import {
  publicClient,
  getPendingMatchesFromLogs,
  getMatchStatus,
  submitMatchResult,
  type PendingMatch,
} from "./services/contractClient";

// ─── Match status enum (mirrors Solidity MatchStatus) ────────────────────────
const MatchStatus = {
  OPEN: 0,
  LOCKED: 1,
  VERIFIED: 2,
  DISPUTED: 3,
} as const;

// ─── In-memory state ──────────────────────────────────────────────────────────

/**
 * Tracked matches: matchId → PendingMatch
 * Populated on startup from past logs, then updated as new MatchAdded events arrive.
 */
const trackedMatches = new Map<string, PendingMatch>();

/**
 * Last block we scanned up to — so we don't re-scan old blocks on every poll.
 */
let lastScannedBlock: bigint = 0n;

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Scan for new MatchAdded events and add them to our tracked set.
 */
async function syncNewMatches(): Promise<void> {
  const latestBlock = await publicClient.getBlockNumber();

  // On first run, look back STARTUP_BLOCK_LOOKBACK blocks
  const fromBlock =
    lastScannedBlock === 0n
      ? latestBlock - BigInt(config.startupBlockLookback)
      : lastScannedBlock + 1n;

  if (fromBlock > latestBlock) return;

  logger.debug("Scanning for new MatchAdded events", {
    fromBlock: fromBlock.toString(),
    toBlock: latestBlock.toString(),
  });

  const newMatches = await getPendingMatchesFromLogs(fromBlock, latestBlock);

  for (const match of newMatches) {
    const key = match.matchId.toString();
    if (!trackedMatches.has(key)) {
      trackedMatches.set(key, match);
      logger.info("Tracking new match", {
        matchId: key,
        apiMatchId: match.apiMatchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        kickoffTime: new Date(Number(match.kickoffTime) * 1000).toISOString(),
      });
    }
  }

  lastScannedBlock = latestBlock;
}

/**
 * For each tracked match, check if it's finished and submit the result if so.
 */
async function processTrackedMatches(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  for (const [key, match] of trackedMatches.entries()) {
    // Skip matches that haven't kicked off yet — no point calling the API
    if (Number(match.kickoffTime) > now) {
      logger.debug("Match not kicked off yet, skipping", {
        matchId: key,
        kickoffTime: new Date(Number(match.kickoffTime) * 1000).toISOString(),
      });
      continue;
    }

    // Check on-chain status — skip if already verified or disputed
    let onChainStatus: number;
    try {
      onChainStatus = await getMatchStatus(match.matchId);
    } catch (err) {
      logger.error("Failed to read match status from contract", {
        matchId: key,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    if (
      onChainStatus === MatchStatus.VERIFIED ||
      onChainStatus === MatchStatus.DISPUTED
    ) {
      logger.debug("Match already processed, removing from tracker", {
        matchId: key,
      });
      trackedMatches.delete(key);
      continue;
    }

    // Fetch result from API-Football
    const result = await footballApi.getMatchResult(match.apiMatchId);

    if (!result) {
      logger.warn("Could not fetch result from API-Football", {
        matchId: key,
        apiMatchId: match.apiMatchId,
      });
      continue;
    }

    if (!result.isFinished) {
      logger.debug("Match not finished yet", {
        matchId: key,
        apiMatchId: match.apiMatchId,
        status: result.status,
      });
      continue;
    }

    // Sanity check — scores must be present
    if (result.homeScore === null || result.awayScore === null) {
      logger.warn("Match finished but scores are null — will retry", {
        matchId: key,
        apiMatchId: match.apiMatchId,
      });
      continue;
    }

    // Submit result to contract
    try {
      await submitMatchResult(
        match.matchId,
        result.homeScore,
        result.awayScore,
      );
      // Remove from tracker after successful submission
      trackedMatches.delete(key);
    } catch (err) {
      logger.error("Failed to submit match result", {
        matchId: key,
        error: err instanceof Error ? err.message : String(err),
      });
      // Leave in tracker — will retry on next poll
    }
  }
}

// ─── Main poll loop ───────────────────────────────────────────────────────────

/**
 * Single poll cycle: sync new matches, then process all tracked matches.
 */
async function poll(): Promise<void> {
  try {
    await syncNewMatches();
    await processTrackedMatches();
    logger.debug("Poll complete", { trackedCount: trackedMatches.size });
  } catch (err) {
    logger.error("Unexpected error during poll", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Start the match watcher.
 * Runs an initial poll immediately, then repeats on POLL_INTERVAL_MS.
 */
export async function startMatchWatcher(): Promise<void> {
  logger.info("Match watcher starting", {
    pollIntervalMs: config.pollIntervalMs,
    eventManagerAddress: config.eventManagerAddress,
  });

  // Run immediately on startup
  await poll();

  // Then repeat on interval
  setInterval(poll, config.pollIntervalMs);
}

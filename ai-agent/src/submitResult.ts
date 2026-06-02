/**
 * Manual test script for submitting match results
 * Usage: npx ts-node src/submitResult.ts <matchId> <homeScore> <awayScore>
 * Example: npx ts-node src/submitResult.ts 0 2 1
 */

import "dotenv/config";
import { logger } from "./utils/logger";
import {
  submitCreatorMatchResult,
  getCreatorMatch,
} from "./services/creatorMatchClient";
import { matchDataService } from "./services/matchDataService";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    logger.error(
      "❌ Usage: npx ts-node src/submitResult.ts <matchId> <homeScore> <awayScore>",
    );
    logger.info("Example: npx ts-node src/submitResult.ts 0 2 1");
    process.exit(1);
  }

  const matchId = BigInt(args[0]);
  const homeScore = parseInt(args[1], 10);
  const awayScore = parseInt(args[2], 10);

  if (isNaN(homeScore) || isNaN(awayScore)) {
    logger.error("❌ Scores must be valid integers");
    process.exit(1);
  }

  if (homeScore < 0 || awayScore < 0 || homeScore > 20 || awayScore > 20) {
    logger.error("❌ Scores must be between 0 and 20");
    process.exit(1);
  }

  logger.info("─────────────────────────────────────────");
  logger.info("  Creator Match Result Submission");
  logger.info("─────────────────────────────────────────");

  try {
    // Fetch match from contract
    logger.info("Fetching match from contract...");
    const match = await getCreatorMatch(matchId);

    if (!match) {
      logger.error("❌ Match not found on contract");
      process.exit(1);
    }

    logger.info("✅ Match found", {
      matchId: match.matchId.toString(),
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      eventId: match.eventId.toString(),
      status:
        match.status === 0
          ? "OPEN"
          : match.status === 1
            ? "VERIFIED"
            : "UNKNOWN",
    });

    if (match.status !== 0) {
      logger.error("❌ Match is already verified or locked");
      process.exit(1);
    }

    logger.info("Submitting result...", {
      homeScore,
      awayScore,
    });

    // Submit result
    const txHash = await submitCreatorMatchResult(
      matchId,
      homeScore,
      awayScore,
    );

    logger.info("✅ Result submitted successfully!");
    logger.info(
      `Transaction: https://celo-sepolia.blockscout.com/tx/${txHash}`,
    );
    logger.info(
      `Match: ${match.homeTeam} ${homeScore} - ${awayScore} ${match.awayTeam}`,
    );
  } catch (err) {
    logger.error("❌ Failed to submit result", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error("Fatal error", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

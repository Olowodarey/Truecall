import "dotenv/config";
import { logger } from "./utils/logger";
import { startMatchWatcher } from "./matchWatcher";

/**
 * TrueCall AI Agent
 *
 * Responsibilities:
 *  1. Watch for MatchAdded events on the EventManager contract
 *  2. Poll API-Football until each match reaches "FT" (full time)
 *  3. Submit the verified score to EventManager.submitMatchResult()
 *
 * The contract then:
 *  - Calculates points for all predictors on-chain
 *  - Updates the leaderboard
 *  - Enables prize resolution once all matches in an event are verified
 */
async function main(): Promise<void> {
  logger.info("─────────────────────────────────────────");
  logger.info("  TrueCall AI Agent v1.0.0");
  logger.info("─────────────────────────────────────────");

  // Graceful shutdown
  process.on("SIGINT", () => {
    logger.info("Shutting down (SIGINT)");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    logger.info("Shutting down (SIGTERM)");
    process.exit(0);
  });

  // Unhandled rejections — log and keep running
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  await startMatchWatcher();
}

main().catch((err) => {
  logger.error("Fatal error during startup", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

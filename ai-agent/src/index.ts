import "dotenv/config";
import { logger } from "./utils/logger";
import { startMatchWatcher } from "./matchWatcher";
import { startCreatorMatchWatcher } from "./creatorMatchWatcher";

/**
 * TrueCall AI Agent
 *
 * Responsibilities:
 *  1. Watch EventManager for MatchAdded events (original events)
 *  2. Watch CreatorEventManager for MatchAdded events (creator events) ← NEW
 *  3. Poll API-Football until each match reaches "FT" (full time)
 *  4. Submit verified scores to both contracts
 *
 * For Creator Events (new):
 *  - Fetch results from backend API or JSON data
 *  - Automatically submit to contract
 *  - Contract calculates winners on-chain
 */
async function main(): Promise<void> {
  logger.info("─────────────────────────────────────────");
  logger.info("  TrueCall AI Agent v2.0.0");
  logger.info("  (Supporting Creator Events)");
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

  // Start both watchers
  await Promise.all([startMatchWatcher(), startCreatorMatchWatcher()]);
}

main().catch((err) => {
  logger.error("Fatal error during startup", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

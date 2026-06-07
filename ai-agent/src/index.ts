import "dotenv/config";
import { logger } from "./utils/logger";
import { startCreatorMatchWatcher } from "./creatorMatchWatcher";
import { startHealthServer } from "./healthCheck";

/**
 * TrueCall AI Agent
 *
 * Responsibilities:
 *  1. Watch CreatorEventManager for MatchAdded events
 *  2. Fetch results from backend API or JSON data
 *  3. Submit verified scores to contract
 *  4. Contract calculates winners on-chain automatically
 */
async function main(): Promise<void> {
  logger.info("─────────────────────────────────────────");
  logger.info("  TrueCall AI Agent v2.0.0");
  logger.info("  (Creator Events Only)");
  logger.info("─────────────────────────────────────────");

  // Start health check server for monitoring
  startHealthServer();

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

  // Start creator match watcher
  await startCreatorMatchWatcher();
}

main().catch((err) => {
  logger.error("Fatal error during startup", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

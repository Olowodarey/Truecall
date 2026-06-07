import express from "express";
import { logger } from "./utils/logger";

const app = express();
const PORT = process.env.PORT || 3000;

let startTime = Date.now();
let lastPollTime = Date.now();
let trackedMatchCount = 0;
let submittedCount = 0;

// Health check endpoint for Railway/UptimeRobot
app.get("/health", (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const lastPollAgo = Math.floor((Date.now() - lastPollTime) / 1000);

  res.status(200).json({
    status: "healthy",
    uptime: `${uptime} seconds`,
    lastPoll: `${lastPollAgo} seconds ago`,
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Status endpoint - shows agent activity
app.get("/status", (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    status: "running",
    uptime: `${uptime} seconds`,
    version: "2.0.0",
    trackedMatches: trackedMatchCount,
    totalSubmissions: submittedCount,
    lastPoll: new Date(lastPollTime).toISOString(),
    startedAt: new Date(startTime).toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    service: "TrueCall AI Agent",
    version: "2.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      status: "/status",
    },
  });
});

export function startHealthServer() {
  app.listen(PORT, () => {
    logger.info("Health check server started", { port: PORT });
  });
}

// Update these from the main watcher
export function updateHealthMetrics(metrics: {
  trackedCount?: number;
  lastPoll?: number;
  submitted?: boolean;
}) {
  if (metrics.trackedCount !== undefined) {
    trackedMatchCount = metrics.trackedCount;
  }
  if (metrics.lastPoll !== undefined) {
    lastPollTime = metrics.lastPoll;
  }
  if (metrics.submitted) {
    submittedCount++;
  }
}

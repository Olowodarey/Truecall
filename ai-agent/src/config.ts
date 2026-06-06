import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, defaultVal: string): string {
  return process.env[key] ?? defaultVal;
}

export const config = {
  // Celo
  celoRpcUrl: required("CELO_RPC_URL"),
  agentPrivateKey: required("AGENT_PRIVATE_KEY") as `0x${string}`,
  eventManagerAddress: optional(
    "EVENT_MANAGER_ADDRESS",
    "0x0000000000000000000000000000000000000000",
  ) as `0x${string}`,
  // Creator Event Manager
  creatorEventManagerAddress: optional(
    "CREATOR_EVENT_MANAGER_ADDRESS",
    "0xbA57166902064dE0EE16Df3A30839da7382F06E5",
  ) as `0x${string}`,

  // Backend API (for fetching match results)
  backendApiUrl: optional("BACKEND_API_URL", "http://localhost:3001/api"),

  // API-Football (optional for testing with JSON data)
  apiFootballKey: optional("API_FOOTBALL_KEY", "test-key"),
  apiFootballBaseUrl:
    process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",

  // Agent behaviour
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 60_000),
  startupBlockLookback: Number(process.env.STARTUP_BLOCK_LOOKBACK ?? 10_000),
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;

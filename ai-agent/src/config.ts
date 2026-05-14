import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  // Celo
  celoRpcUrl: required("CELO_RPC_URL"),
  agentPrivateKey: required("AGENT_PRIVATE_KEY") as `0x${string}`,
  eventManagerAddress: required("EVENT_MANAGER_ADDRESS") as `0x${string}`,

  // API-Football
  apiFootballKey: required("API_FOOTBALL_KEY"),
  apiFootballBaseUrl:
    process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",

  // Agent behaviour
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 60_000),
  startupBlockLookback: Number(process.env.STARTUP_BLOCK_LOOKBACK ?? 10_000),
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;

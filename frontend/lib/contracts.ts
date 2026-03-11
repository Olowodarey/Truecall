// ─── Deployed contract addresses (Stacks Testnet) ───────────────────────────
export const NETWORK = "testnet" as const;
export const DEPLOYER = "ST3TWY4THYR9PMMD72N7SA8SE1FJPSF219RNZQY5F";

export const CONTRACTS = {
  PREDICTION_MARKET: `${DEPLOYER}.truecall`,
} as const;

// Hiro API base for testnet read-only calls
export const HIRO_API = "https://api.testnet.hiro.so";

// Max markets per event (matches contract constant)
export const MAX_MARKETS_PER_EVENT = 10;

// Stacks testnet network config for @stacks/transactions
export const STACKS_NETWORK = {
  url: HIRO_API,
  chainId: 0x80000000, // testnet chain ID
} as const;

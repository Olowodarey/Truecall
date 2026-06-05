// Admin wallet address
export const ADMIN_ADDRESS = "0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b";

// Token addresses on Celo Mainnet
export const TOKENS = {
  CELO: {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "CELO",
    decimals: 18,
    name: "Celo Native Token",
  },
  cUSD: {
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    symbol: "cUSD",
    decimals: 18,
    name: "Celo Dollar",
  },
} as const;

// Contract addresses on Celo Mainnet
export const CONTRACTS = {
  EVENT_MANAGER: "0x8A18Da2A173b3951c797a438102345cF92838880",
  LEADERBOARD: "0xb4410D9CC489bc5b1AD45a4f6611B13aA4742B06",
} as const;

// Chain configuration
export const CHAIN_CONFIG = {
  id: 42220,
  name: "Celo Mainnet",
  rpcUrl: "https://forno.celo.org",
  blockExplorer: "https://celoscan.io",
} as const;

// Prediction points
export const PREDICTION_POINTS = {
  EXACT_SCORE: 5,
  OUTCOME: 3,
  MAX_PER_MATCH: 8,
} as const;

// Event status
export const EVENT_STATUS = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  CANCELLED: "CANCELLED",
} as const;

// Match status
export const MATCH_STATUS = {
  OPEN: "OPEN",
  LOCKED: "LOCKED",
  VERIFIED: "VERIFIED",
  DISPUTED: "DISPUTED",
} as const;

// Prediction outcomes
export const PREDICTION_OUTCOME = {
  HOME_WIN: "HOME_WIN",
  DRAW: "DRAW",
  AWAY_WIN: "AWAY_WIN",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  EVENTS: "/events",
  EVENT_DETAIL: (id: number) => `/events/${id}`,
  EVENT_MATCHES: (id: number) => `/events/${id}/matches`,
  EVENT_LEADERBOARD: (id: number) => `/events/${id}/leaderboard`,
  ADD_MATCH: (id: number) => `/events/${id}/addMatch`,
  JOIN_EVENT: (id: number) => `/events/${id}/join`,
  HAS_JOINED: (id: number, address: string) =>
    `/events/${id}/joined/${address}`,
  CLAIMABLE: (id: number, address: string) =>
    `/events/${id}/claimable/${address}`,
} as const;

// Validation rules
export const VALIDATION = {
  MIN_EVENT_NAME_LENGTH: 1,
  MAX_EVENT_NAME_LENGTH: 64,
  MIN_ENTRY_FEE: 0.1,
  MAX_ENTRY_FEE: 1000000,
  MIN_EVENT_DURATION: 60 * 60, // 1 hour in seconds
  MAX_EVENT_DURATION: 365 * 24 * 60 * 60, // 1 year in seconds
} as const;

// UI configuration
export const UI_CONFIG = {
  TOAST_DURATION: 5000,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
} as const;

// Leaderboard configuration
export const LEADERBOARD_CONFIG = {
  TOP_WINNERS: 5,
  ENTRIES_PER_PAGE: 10,
} as const;

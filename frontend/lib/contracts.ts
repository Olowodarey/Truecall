// ─── Deployed contract addresses (Celo Sepolia) ───────────────────────────────

export const CONTRACTS = {
  EVENT_MANAGER: (process.env.NEXT_PUBLIC_EVENT_MANAGER ??
    "0xc76C9f0Bb031245ce145c0b7B822E2d0A1267e89") as `0x${string}`,
  LEADERBOARD: (process.env.NEXT_PUBLIC_LEADERBOARD ??
    "0xa95a8c09A3873C4429E69Ba05fA74dF852f539e2") as `0x${string}`,
  CUSD: (process.env.NEXT_PUBLIC_CUSD ??
    "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1") as `0x${string}`,
} as const;

// ─── EventManager ABI (write functions only — reads go through backend) ───────

export const EVENT_MANAGER_ABI = [
  // Join public event (payable for native CELO, nonpayable for ERC-20)
  {
    type: "function",
    name: "joinEvent",
    stateMutability: "payable",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [],
  },
  // Join private event (payable for native CELO, nonpayable for ERC-20)
  {
    type: "function",
    name: "joinPrivateEvent",
    stateMutability: "payable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "inviteCode", type: "string" },
    ],
    outputs: [],
  },
  // Submit score prediction (5 pts)
  {
    type: "function",
    name: "submitScorePrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "uint256" },
      { name: "homeScore", type: "uint8" },
      { name: "awayScore", type: "uint8" },
    ],
    outputs: [],
  },
  // Submit outcome prediction (3 pts) — 0=HOME_WIN, 1=DRAW, 2=AWAY_WIN
  {
    type: "function",
    name: "submitOutcomePrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "uint256" },
      { name: "outcome", type: "uint8" },
    ],
    outputs: [],
  },
  // Claim prize after event resolves
  {
    type: "function",
    name: "claimPrize",
    stateMutability: "nonpayable",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [],
  },
  // Dispute a match result (within 2h window)
  {
    type: "function",
    name: "disputeMatchResult",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [],
  },
  // Resolve event (callable by anyone after endDate + all matches verified)
  {
    type: "function",
    name: "resolveEvent",
    stateMutability: "nonpayable",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [],
  },
] as const;

// ─── cUSD ERC-20 ABI (approve only — needed before joinEvent) ─────────────────

export const CUSD_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ─── Outcome enum mapping ──────────────────────────────────────────────────────

export const OUTCOME_MAP = {
  HOME_WIN: 0,
  DRAW: 1,
  AWAY_WIN: 2,
} as const;

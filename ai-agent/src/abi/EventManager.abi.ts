/**
 * EventManager ABI — only the events and functions the AI Agent needs.
 * Full ABI lives in contracts/EVM-contract/out/EventManager.sol/EventManager.json
 */
export const EVENT_MANAGER_ABI = [
  // ─── Events the agent watches ─────────────────────────────────────────────
  {
    type: "event",
    name: "MatchAdded",
    inputs: [
      { name: "matchId", type: "uint256", indexed: true },
      { name: "eventId", type: "uint256", indexed: true },
      { name: "homeTeam", type: "string", indexed: false },
      { name: "awayTeam", type: "string", indexed: false },
      { name: "apiMatchId", type: "string", indexed: false },
      { name: "kickoffTime", type: "uint256", indexed: false },
      { name: "allowScorePrediction", type: "bool", indexed: false },
      { name: "allowOutcomePrediction", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MatchResultVerified",
    inputs: [
      { name: "matchId", type: "uint256", indexed: true },
      { name: "eventId", type: "uint256", indexed: true },
      { name: "homeScore", type: "uint8", indexed: false },
      { name: "awayScore", type: "uint8", indexed: false },
      { name: "proof", type: "bytes32", indexed: false },
      { name: "agent", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MatchResultDisputed",
    inputs: [
      { name: "matchId", type: "uint256", indexed: true },
      { name: "disputer", type: "address", indexed: true },
    ],
  },

  // ─── Read functions ───────────────────────────────────────────────────────
  {
    type: "function",
    name: "getMatch",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "matchId", type: "uint256" },
          { name: "eventId", type: "uint256" },
          { name: "homeTeam", type: "string" },
          { name: "awayTeam", type: "string" },
          { name: "apiMatchId", type: "string" },
          { name: "kickoffTime", type: "uint256" },
          { name: "predictionDeadline", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "finalHomeScore", type: "uint8" },
          { name: "finalAwayScore", type: "uint8" },
          { name: "resultProof", type: "bytes32" },
          { name: "verifiedAt", type: "uint256" },
          { name: "allowScorePrediction", type: "bool" },
          { name: "allowOutcomePrediction", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "nextMatchId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },

  // ─── Write function the agent calls ───────────────────────────────────────
  {
    type: "function",
    name: "submitMatchResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "uint256" },
      { name: "homeScore", type: "uint8" },
      { name: "awayScore", type: "uint8" },
      { name: "resultProof", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

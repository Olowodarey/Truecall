// ABI for CreatorEventManager — Celo Sepolia
// Proxy: 0xD360E9eF6bF50A357c77fA17474a4838c2379B3f
// Fee:   native CELO only

export const CREATOR_EVENT_MANAGER_ABI = [
  {
    type: "function",
    name: "submitMatchResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "uint256" },
      { name: "homeScore", type: "uint8" },
      { name: "awayScore", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getMatch",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [
      {
        components: [
          { name: "matchId", type: "uint256" },
          { name: "eventId", type: "uint256" },
          { name: "homeTeam", type: "string" },
          { name: "awayTeam", type: "string" },
          { name: "apiMatchId", type: "string" },
          { name: "kickoffTime", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "finalHomeScore", type: "uint8" },
          { name: "finalAwayScore", type: "uint8" },
          { name: "verifiedAt", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
  },
  {
    type: "event",
    name: "MatchAdded",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
      { indexed: true, name: "eventId", type: "uint256" },
      { indexed: false, name: "homeTeam", type: "string" },
      { indexed: false, name: "awayTeam", type: "string" },
      { indexed: false, name: "apiMatchId", type: "string" },
      { indexed: false, name: "kickoffTime", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "MatchResultSubmitted",
    inputs: [
      { indexed: true, name: "matchId", type: "uint256" },
      { indexed: true, name: "eventId", type: "uint256" },
      { indexed: false, name: "homeScore", type: "uint8" },
      { indexed: false, name: "awayScore", type: "uint8" },
      { indexed: false, name: "winnersFound", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
] as const;

// CreatorEventManager — Celo Mainnet
// Proxy: 0xbA57166902064dE0EE16Df3A30839da7382F06E5
// Fee:   native CELO only (no ERC-20, no approval needed)

export const CREATOR_EVENT_MANAGER_ADDRESS = (process.env
  .NEXT_PUBLIC_CREATOR_EVENT_MANAGER ??
  "0xbA57166902064dE0EE16Df3A30839da7382F06E5") as `0x${string}`;

export const CREATOR_EVENT_MANAGER_ABI = [
  // ─── Write ────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "createEvent",
    stateMutability: "payable", // send CELO with this call
    inputs: [
      { name: "eventName", type: "string" },
      { name: "inviteCodeHash", type: "bytes32" },
      { name: "homeTeams", type: "string[]" },
      { name: "awayTeams", type: "string[]" },
      { name: "apiMatchIds", type: "string[]" },
      { name: "kickoffTimes", type: "uint256[]" },
    ],
    outputs: [{ name: "eventId", type: "uint256" }],
  },
  {
    type: "function",
    name: "addMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "homeTeam", type: "string" },
      { name: "awayTeam", type: "string" },
      { name: "apiMatchId", type: "string" },
      { name: "kickoffTime", type: "uint256" },
    ],
    outputs: [{ name: "matchId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinEvent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "inviteCode", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "completeEvent",
    stateMutability: "nonpayable",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "submitPrediction",
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
    name: "selfVerify",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "verifyAddress",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "verifyAddressBatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "users", type: "address[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "unverifyAddress",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },

  // ─── Read ─────────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "creationFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }], // wei amount of native CELO
  },
  {
    type: "function",
    name: "isVerified",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "hasJoined",
    stateMutability: "view",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  // ─── Admin writes ─────────────────────────────────────────────────────────
  {
    type: "function",
    name: "setCreationFee",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawFees",
    stateMutability: "nonpayable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "pendingFees",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "nextEventId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "nextMatchId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
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
] as const;

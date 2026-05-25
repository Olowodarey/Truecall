// CreatorEventManager — Celo Sepolia
// Proxy: 0x34ef9AebB8354cbc45ED67086F74B722aD959787

export const CREATOR_EVENT_MANAGER_ADDRESS = (process.env
  .NEXT_PUBLIC_CREATOR_EVENT_MANAGER ??
  "0x34ef9AebB8354cbc45ED67086F74B722aD959787") as `0x${string}`;

// Celo Sepolia testnet cUSD
export const CUSD_ADDRESS = (process.env.NEXT_PUBLIC_CUSD ??
  "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1") as `0x${string}`;

export const CREATOR_EVENT_MANAGER_ABI = [
  // createEvent — payable (native CELO fee) or nonpayable (ERC-20 fee)
  {
    type: "function",
    name: "createEvent",
    stateMutability: "payable",
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
    name: "creationFee",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
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
] as const;

// Minimal ERC-20 ABI for approve
export const ERC20_APPROVE_ABI = [
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
] as const;

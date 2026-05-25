// ABI for CreatorEventManager — Celo Sepolia
// Proxy: 0x34ef9AebB8354cbc45ED67086F74B722aD959787
// Impl:  0x2Eb442F39E6678fbA52053199bB009E4072DC5F3

export const CREATOR_EVENT_MANAGER_ABI = [
  // ─── Write ────────────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'createEvent',
    stateMutability: 'payable',
    inputs: [
      { name: 'eventName', type: 'string' },
      { name: 'inviteCodeHash', type: 'bytes32' },
      { name: 'homeTeams', type: 'string[]' },
      { name: 'awayTeams', type: 'string[]' },
      { name: 'apiMatchIds', type: 'string[]' },
      { name: 'kickoffTimes', type: 'uint256[]' },
    ],
    outputs: [{ name: 'eventId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'addMatch',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'eventId', type: 'uint256' },
      { name: 'homeTeam', type: 'string' },
      { name: 'awayTeam', type: 'string' },
      { name: 'apiMatchId', type: 'string' },
      { name: 'kickoffTime', type: 'uint256' },
    ],
    outputs: [{ name: 'matchId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'joinEvent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'eventId', type: 'uint256' },
      { name: 'inviteCode', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'submitPrediction',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'homeScore', type: 'uint8' },
      { name: 'awayScore', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'submitMatchResult',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'homeScore', type: 'uint8' },
      { name: 'awayScore', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelEvent',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'eventId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'verifyAddress',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'verifyAddressBatch',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'users', type: 'address[]' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'unverifyAddress',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdrawFees',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setCreationFee',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },

  // ─── Read ─────────────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'getEvent',
    stateMutability: 'view',
    inputs: [{ name: 'eventId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'eventId', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'eventName', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'inviteCodeHash', type: 'bytes32' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getMatch',
    stateMutability: 'view',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'matchId', type: 'uint256' },
          { name: 'eventId', type: 'uint256' },
          { name: 'homeTeam', type: 'string' },
          { name: 'awayTeam', type: 'string' },
          { name: 'apiMatchId', type: 'string' },
          { name: 'kickoffTime', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'finalHomeScore', type: 'uint8' },
          { name: 'finalAwayScore', type: 'uint8' },
          { name: 'verifiedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getEventMatches',
    stateMutability: 'view',
    inputs: [{ name: 'eventId', type: 'uint256' }],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getMatchWinners',
    stateMutability: 'view',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'user', type: 'address' },
          { name: 'submittedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'isMatchWinner',
    stateMutability: 'view',
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getParticipants',
    stateMutability: 'view',
    inputs: [{ name: 'eventId', type: 'uint256' }],
    outputs: [{ type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'getParticipantCount',
    stateMutability: 'view',
    inputs: [{ name: 'eventId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getPrediction',
    stateMutability: 'view',
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'homeScore', type: 'uint8' },
      { name: 'awayScore', type: 'uint8' },
      { name: 'submitted', type: 'bool' },
      { name: 'submittedAt', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'hasJoined',
    stateMutability: 'view',
    inputs: [
      { name: 'eventId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isVerified',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'nextEventId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'nextMatchId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'creationFee',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'pendingFees',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },

  // ─── Events ───────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'EventCreated',
    inputs: [
      { name: 'eventId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'eventName', type: 'string', indexed: false },
      { name: 'inviteCodeHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MatchAdded',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'eventId', type: 'uint256', indexed: true },
      { name: 'homeTeam', type: 'string', indexed: false },
      { name: 'awayTeam', type: 'string', indexed: false },
      { name: 'apiMatchId', type: 'string', indexed: false },
      { name: 'kickoffTime', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'UserJoined',
    inputs: [
      { name: 'eventId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PredictionSubmitted',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'eventId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'homeScore', type: 'uint8', indexed: false },
      { name: 'awayScore', type: 'uint8', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MatchResultSubmitted',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'eventId', type: 'uint256', indexed: true },
      { name: 'homeScore', type: 'uint8', indexed: false },
      { name: 'awayScore', type: 'uint8', indexed: false },
      { name: 'winnersFound', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FeesWithdrawn',
    inputs: [
      { name: 'token', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

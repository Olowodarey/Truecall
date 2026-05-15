export const LEADERBOARD_ABI = [
  {
    type: 'function',
    name: 'getTopN',
    stateMutability: 'view',
    inputs: [
      { name: 'eventId', type: 'uint256' },
      { name: 'n', type: 'uint256' },
    ],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'user', type: 'address' },
          { name: 'points', type: 'uint256' },
          { name: 'firstSubmission', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getUserEventRank',
    stateMutability: 'view',
    inputs: [
      { name: 'eventId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'rank', type: 'uint256' },
      { name: 'points', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'getGlobalPoints',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getGlobalTopN',
    stateMutability: 'view',
    inputs: [{ name: 'n', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'user', type: 'address' },
          { name: 'points', type: 'uint256' },
          { name: 'firstSubmission', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

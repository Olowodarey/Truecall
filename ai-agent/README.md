# TrueCall AI Agent

The AI Agent is an off-chain service that acts as the **score verifier** for the TrueCall prediction platform.

## What it does

```
API-Football ──► AI Agent ──► EventManager.submitMatchResult()
                                      │
                                      ▼
                            Contract calculates points:
                            - Exact score → 5 pts
                            - Correct outcome → 3 pts
                            - Updates leaderboard
```

1. **Watches** for `MatchAdded` events on the `EventManager` contract
2. **Polls** API-Football until each match reaches `FT` (full time)
3. **Submits** the verified score on-chain via `submitMatchResult()`

The contract handles all point calculation — the agent only submits the final score.

## Setup

```bash
cp .env.example .env
# Fill in your values in .env

npm install
```

## Running

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

## Environment Variables

| Variable                 | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `CELO_RPC_URL`           | Celo RPC endpoint (mainnet or Alfajores testnet)     |
| `AGENT_PRIVATE_KEY`      | Private key of the wallet set as `aiOracleAgent`     |
| `EVENT_MANAGER_ADDRESS`  | Deployed EventManager proxy address                  |
| `API_FOOTBALL_KEY`       | API-Football API key (https://www.api-football.com/) |
| `POLL_INTERVAL_MS`       | How often to poll (default: 60000 = 1 minute)        |
| `STARTUP_BLOCK_LOOKBACK` | Blocks to scan back on startup (default: 10000)      |
| `LOG_LEVEL`              | Log verbosity: error / warn / info / debug           |

## Architecture

```
src/
├── index.ts                  # Entry point — starts the agent
├── config.ts                 # Loads and validates env vars
├── matchWatcher.ts           # Core loop — syncs matches, polls API, submits results
├── abi/
│   └── EventManager.abi.ts   # Minimal ABI (only what the agent needs)
├── services/
│   ├── footballApi.ts        # API-Football client
│   └── contractClient.ts     # Viem client — reads/writes EventManager
└── utils/
    └── logger.ts             # Winston logger
```

## How the agent wallet is authorized

The agent wallet address must be set as `aiOracleAgent` in the `EventManager` contract:

```solidity
// Called by the contract owner (admin)
eventManager.setAIAgent(agentWalletAddress);
```

Only this address can call `submitMatchResult()`. Any other address will be rejected with `OnlyAIAgent`.

## Result Proof

Every submission includes a `resultProof`:

```
keccak256(matchId, homeScore, awayScore, timestamp, agentAddress)
```

This is stored on-chain as tamper-evident proof of who submitted what result and when. It can be used to verify the agent's submission in dispute resolution.

# TrueCall Development Guide

This guide covers setting up and developing the TrueCall football prediction platform.

## Project Structure

```
truecall/
├── frontend/          # Next.js React application
├── backend/           # NestJS API server
├── contracts/         # Solidity smart contracts
├── ai-agent/          # AI agent for match result submission
└── docs/              # Documentation
```

## Prerequisites

- Node.js 18+ and npm/pnpm
- Foundry (for contract development)
- Git
- A wallet with CELO on Celo Sepolia testnet

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Olowodarey/Truecall.git
cd Truecall

# Install dependencies for all packages
pnpm install
```

### 2. Environment Setup

Create `.env` files in each directory:

**backend/.env**

```
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
PRIVATE_KEY=your_admin_private_key
EVENT_MANAGER_ADDRESS=0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33
LEADERBOARD_ADDRESS=0xb4410D9CC489bc5b1AD45a4f6611B13aA4742B06
```

**frontend/.env.local**

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_CHAIN_ID=11142220
```

**ai-agent/.env**

```
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
PRIVATE_KEY=your_admin_private_key
EVENT_MANAGER_ADDRESS=0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33
```

### 3. Start Development Servers

**Terminal 1: Backend**

```bash
cd backend
pnpm start
# Runs on http://localhost:3001
```

**Terminal 2: Frontend**

```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 3: AI Agent (optional)**

```bash
cd ai-agent
pnpm start
# Watches for match events and submits results
```

## Development Workflow

### Creating an Event

1. Connect admin wallet to frontend
2. Go to `/create-event`
3. Fill in event details (name, dates, entry fee, token)
4. Click "Create Event On-Chain"
5. Wait for transaction confirmation

### Adding Matches

1. Navigate to event detail page
2. Wait for event start time to pass
3. Click "+ Add Match" button (admin only)
4. Fill in match details (teams, kickoff time, prediction deadline)
5. Click "Add Match"

### Testing Predictions

1. Join event with user wallet
2. Click on match card
3. Submit score prediction (5 pts if correct)
4. Submit outcome prediction (3 pts if correct)
5. Admin submits match result
6. Check leaderboard for points

## Contract Deployment

### Deploy to Celo Sepolia

```bash
cd contracts/EVM-contract

# Set environment variables
export PRIVATE_KEY=your_key
export CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org

# Deploy contracts
forge script script/Deploy.s.sol --rpc-url $CELO_RPC_URL --private-key $PRIVATE_KEY --broadcast

# Setup contracts (link EventManager to Leaderboard)
forge script script/SetupContracts.s.sol --rpc-url $CELO_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Testing

### Backend Tests

```bash
cd backend
pnpm test
pnpm test:e2e
```

### Contract Tests

```bash
cd contracts/EVM-contract
forge test
```

## Common Tasks

### View Contract State

```bash
# Get event details
cast call 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33 \
  "getEvent(uint256)" 1 \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org

# Get leaderboard
cast call 0xb4410D9CC489bc5b1AD45a4f6611B13aA4742B06 \
  "getLeaderboard(uint256,uint256)" 1 10 \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

### Debug Transactions

```bash
# Get transaction receipt
cast receipt 0xtx_hash \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org

# Decode transaction data
cast 4byte-decode 0xfunction_selector
```

## Troubleshooting

### "Event has started — joining is closed"

- This is expected behavior. Events can only be joined before the start date.
- Create a new event with a future start date for testing.

### "Cannot POST /api/events/:id/addMatch"

- Ensure backend is running on port 3001
- Check that you're logged in as admin wallet
- Verify event has started (current time >= startDate)

### Transaction fails with "Insufficient balance"

- Fund your wallet with CELO on Celo Sepolia
- Use faucet: https://faucet.celo-sepolia.celo-testnet.org

### Contract calls return empty data

- Verify contract addresses in .env files
- Check that contracts are deployed on Celo Sepolia
- Ensure RPC URL is correct

## Code Style

- **Frontend**: ESLint + Prettier (configured in package.json)
- **Backend**: ESLint + Prettier (configured in eslint.config.mjs)
- **Contracts**: Solidity style guide (4-space indentation)

Run formatters:

```bash
# Frontend
npm run lint:fix

# Backend
pnpm lint:fix

# Contracts
forge fmt
```

## Git Workflow

1. Create feature branch: `git checkout -b feat/feature-name`
2. Make changes and commit: `git commit -m "feat: description"`
3. Push to GitHub: `git push origin feat/feature-name`
4. Create pull request on GitHub

## Useful Links

- **Celo Docs**: https://docs.celo.org
- **Celo Sepolia Faucet**: https://faucet.celo-sepolia.celo-testnet.org
- **Celo Explorer**: https://sepolia-blockscout.celo-testnet.org
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts

## Support

For issues or questions:

1. Check TEST_FLOW.md for end-to-end testing guide
2. Check TROUBLESHOOTING.md for common issues
3. Review contract documentation in contracts/EVM-contract/
4. Open an issue on GitHub

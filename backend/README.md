# Football Prediction Oracle Backend

NestJS backend service that acts as an oracle for the football prediction smart contract on Stacks blockchain.

## Features

- 🏈 **Football API Integration** - Fetches match data from API-Football or TheSportsDB
- ⛓️ **Blockchain Oracle** - Submits match results to Stacks smart contract
- ⏰ **Automated Scheduling** - Cron jobs for match syncing and result submission
- 💾 **Database** - PostgreSQL for storing matches and events
- 🔐 **Secure** - Environment-based configuration

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Sports API key (API-Football or TheSportsDB)
- Stacks wallet with testnet STX

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Sports API
SPORTS_API_KEY=your_api_key_here
SPORTS_API_PROVIDER=api-football
SPORTS_API_BASE_URL=https://v3.football.api-sports.io

# Stacks Blockchain
STACKS_NETWORK=testnet
CONTRACT_ADDRESS=your_contract_address
CONTRACT_NAME=football-prediction
ORACLE_PRIVATE_KEY=your_private_key
ORACLE_ADDRESS=your_address

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=football_oracle

# Server
PORT=3001
NODE_ENV=development
```

### Database Setup

```bash
# Create database
createdb football_oracle

# Run migrations (auto-sync enabled in development)
pnpm run start:dev
```

## Running the Application

```bash
# Development
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

## API Endpoints

### Football Matches

- `GET /api/matches/upcoming` - Get upcoming matches
- `GET /api/matches/completed` - Get completed matches
- `GET /api/matches/all` - Get all matches
- `GET /api/matches/:id` - Get match by ID
- `POST /api/matches/sync` - Manually sync matches from API

### Oracle Operations

- `POST /api/oracle/create-event` - Create a new prediction event
- `POST /api/oracle/submit-result` - Submit match result to contract
- `POST /api/oracle/close-event/:id` - Close an event
- `GET /api/oracle/events` - Get all events
- `GET /api/oracle/events/:id` - Get event by ID

## Automated Tasks

The scheduler runs the following cron jobs:

- **Every 30 minutes**: Check for completed matches and submit results
- **Every hour**: Sync matches from sports API
- **Every 10 minutes**: Close events for matches starting soon

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Sports API     │─────▶│  Backend Oracle  │─────▶│ Stacks Contract │
│  (API-Football) │      │  (NestJS)        │      │  (Clarity)      │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │  PostgreSQL  │
                          │  (Database)  │
                          └──────────────┘
```

## Development

```bash
# Run tests
pnpm run test

# Run linter
pnpm run lint

# Format code
pnpm run format
```

## License

MIT

# Quick Start Guide

## Prerequisites

Before running the backend, you need:

1. **PostgreSQL Database**
2. **Sports API Key** (API-Football or TheSportsDB)
3. **Stacks Wallet** (for testnet)

## Setup Steps

### 1. Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Or use Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE football_oracle;

# Exit
\q
```

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
# Sports API (get free key from https://www.api-football.com/)
SPORTS_API_KEY=your_api_key_here
SPORTS_API_PROVIDER=api-football

# Stacks Blockchain
STACKS_NETWORK=testnet
CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
CONTRACT_NAME=football-prediction
ORACLE_PRIVATE_KEY=your_private_key_here
ORACLE_ADDRESS=your_address_here

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=football_oracle

# Server
PORT=3001
```

### 4. Run the Server

```bash
cd backend
pnpm install
pnpm run start:dev
```

You should see:

```
🚀 Backend oracle service running on http://localhost:3001
Oracle initialized for testnet network
```

## Test the API

```bash
# Get upcoming matches
curl http://localhost:3001/api/matches/upcoming

# Get all events
curl http://localhost:3001/api/oracle/events
```

## Troubleshooting

**Database connection error?**

- Make sure PostgreSQL is running: `sudo systemctl status postgresql`
- Check database exists: `psql -U postgres -l`
- Verify credentials in `.env`

**API key errors?**

- Get a free API key from https://www.api-football.com/
- Or use TheSportsDB: https://www.thesportsdb.com/api.php

**Stacks errors?**

- Make sure you have a testnet wallet
- Get testnet STX from faucet: https://explorer.hiro.so/sandbox/faucet

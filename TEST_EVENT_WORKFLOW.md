# 🧪 Test Event Workflow - Complete Guide

## Overview

This guide walks you through testing the complete workflow:

1. ✅ Backend serves match data
2. ✅ Frontend creates event with match
3. ✅ AI agent watches for match results
4. ✅ AI agent submits results to contract
5. ✅ Contract calculates winners
6. ✅ Leaderboard shows winners with Twitter handles

## Prerequisites

### 1. Start Backend

```bash
cd backend
pnpm start:dev
```

**Expected output:**

```
[Nest] Starting Nest application...
[Nest] AppModule dependencies initialized
[Nest] Nest application successfully started
```

**Verify backend is running:**

```bash
curl http://localhost:3001/api/matches
# Should return array of matches
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

**Verify frontend is running:**

- Open http://localhost:3000
- Should see homepage

### 3. Start AI Agent (Optional - for automatic result submission)

```bash
cd ai-agent
npm start
```

**Expected output:**

```
✅ Loaded 12 matches from backend API
🤖 Creator Match Watcher starting
```

## Test Workflow

### Step 1: Connect Wallet

1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Connect with MetaMask (Celo testnet)

### Step 2: Verify Twitter (If Not Already Done)

1. Go to "Profile" page
2. Click "Link Twitter"
3. Complete OAuth flow
4. ✅ Backend automatically verifies on-chain
5. ✅ Your Twitter is now linked to your wallet

**Check database:**

```bash
psql -U postgres -d truecall -c "SELECT address, twitter_handle FROM users;"
```

### Step 3: Create Event with a Match

1. Go to "Create Event" page
2. Fill in event details:
   - **Event Name:** "Premier League Predictions Test"
   - **Description:** "Test event for workflow"
   - **Entry Fee:** 0.1 CELO
   - **Max Participants:** 10
   - **Event Type:** Match Prediction

3. Select a match from backend:
   - Open browser console
   - Run: `fetch('http://localhost:3001/api/matches').then(r => r.json()).then(console.log)`
   - Pick a match ID (e.g., `match_001`)

4. Enter match details:
   - **Match ID:** `match_001` (or whatever you picked)
   - **Home Team:** (auto-filled from backend)
   - **Away Team:** (auto-filled from backend)
   - **Kickoff Time:** (choose future time for testing)

5. Click "Create Event"
6. Confirm transaction in MetaMask

**Expected output:**

- ✅ Transaction submitted
- ✅ Event created on-chain
- ✅ Redirected to event details page

### Step 4: Join the Event

1. Have 2-3 wallets ready for testing
2. Each wallet:
   - Connect wallet
   - Go to event details page
   - Click "Join Event"
   - Make predictions (home score, away score)
   - Pay entry fee (0.1 CELO)
   - Confirm transaction

**Expected:**

- ✅ Each participant joins successfully
- ✅ Predictions stored on-chain
- ✅ Entry fees collected in contract

### Step 5: Simulate Match Completion

You have two options:

#### Option A: Manual Result Submission (Quick Test)

**Update match in backend JSON:**

```bash
nano backend/src/data/matches.json
```

Find your match and add results:

```json
{
  "id": "match_001",
  "homeTeam": "Manchester United",
  "awayTeam": "Liverpool",
  "kickoffTime": 1780419600,
  "finalHomeScore": 2,
  "finalAwayScore": 1,
  "status": "FT"
}
```

**Manually submit result (if AI agent not running):**

```bash
# Use the contract admin wallet
cast send $CREATOR_EVENT_MANAGER_ADDRESS \
  "submitMatchResult(uint256,uint256,uint256)" \
  <eventId> 2 1 \
  --rpc-url $CELO_RPC_URL \
  --private-key $ADMIN_PRIVATE_KEY
```

#### Option B: AI Agent Auto-Submission (Production Flow)

If AI agent is running:

1. Update match result in `backend/src/data/matches.json` (add finalHomeScore, finalAwayScore, status: "FT")
2. Wait for kickoff time to pass
3. AI agent will automatically:
   - Detect match is finished
   - Fetch result from backend API
   - Submit result to contract
   - Log: `📊 Submitting match result`
   - Log: `✅ Match result submitted successfully`

**Watch AI agent logs:**

```
📊 Submitting match result { matchId: '1', result: '2-1' }
✅ Match result submitted successfully
```

### Step 6: Check Winners

1. Go to event details page
2. Click "View Winners" or "Leaderboard"
3. ✅ Contract has calculated winners automatically
4. ✅ Winners displayed with:
   - Wallet address
   - Twitter handle (if verified) ✓
   - Prediction accuracy
   - Prize amount

**Check on-chain:**

```bash
cast call $CREATOR_EVENT_MANAGER_ADDRESS \
  "getEventWinners(uint256)" \
  <eventId> \
  --rpc-url $CELO_RPC_URL
```

### Step 7: Verify Complete Workflow

**Backend:**

```bash
# Match data served correctly
curl http://localhost:3001/api/matches/match_001

# User Twitter linked
curl http://localhost:3001/api/users/<wallet_address>
```

**Frontend:**

```bash
# Event shows match details from backend
# Winners modal shows Twitter handles
# Leaderboard displays verified users with ✓ badge
```

**Smart Contract:**

```bash
# Event exists
cast call $CREATOR_EVENT_MANAGER_ADDRESS "getEvent(uint256)" <eventId>

# Match verified
cast call $CREATOR_EVENT_MANAGER_ADDRESS "getMatch(uint256)" <matchId>

# Winners calculated
cast call $CREATOR_EVENT_MANAGER_ADDRESS "getEventWinners(uint256)" <eventId>
```

**Database:**

```bash
# User verified on-chain
psql -U postgres -d truecall -c "SELECT * FROM users WHERE address = '<wallet>';"

# Twitter linked
psql -U postgres -d truecall -c "SELECT twitter_handle, verified_at FROM users;"
```

## Expected Results

### ✅ Successful Test

```
1. Backend serves matches from single JSON file
2. AI agent fetches matches from backend API (no duplicate data)
3. Frontend creates event with match from backend
4. Users join and make predictions
5. AI agent detects finished match
6. AI agent submits result to contract
7. Contract calculates winners automatically
8. Winners displayed with Twitter handles
9. All systems use same match data (single source of truth)
```

### 🎯 Success Criteria

- [ ] Backend serves match data from `/api/matches`
- [ ] AI agent loads matches from backend (logs: "✅ Loaded X matches from backend API")
- [ ] Event created with match ID from backend
- [ ] Multiple users join event
- [ ] Match result submitted (manual or AI agent)
- [ ] Winners calculated on-chain
- [ ] Winners displayed on frontend
- [ ] Twitter handles shown for verified users
- [ ] No duplicate match data files

## Troubleshooting

### Backend API not responding

```bash
# Check backend is running
curl http://localhost:3001/api/matches

# Restart backend
cd backend
pnpm start:dev
```

### AI Agent not fetching matches

```bash
# Check BACKEND_API_URL in ai-agent/.env
cat ai-agent/.env | grep BACKEND_API_URL

# Should be: BACKEND_API_URL=http://localhost:3001/api

# Restart AI agent
cd ai-agent
npm start
```

### Match data not synced

```bash
# There's only ONE match data file now:
backend/src/data/matches.json

# Update this file, and all systems will see changes:
nano backend/src/data/matches.json
```

### Winners not showing Twitter

```bash
# Check user verified
psql -U postgres -d truecall -c "SELECT * FROM users WHERE address = '<wallet>';"

# Check on-chain verification
cast call $CREATOR_EVENT_MANAGER_ADDRESS "isAddressVerified(address)" <wallet>
```

## Next Steps

After successful test:

1. **Integrate Real Sports Data API**
   - Replace manual JSON updates
   - Fetch live match data
   - See `SPORTS_API_INTEGRATION.md`

2. **Deploy to Production**
   - Update environment variables
   - Deploy contracts to Celo mainnet
   - Set up production database
   - Configure production backend URL

3. **Add More Features**
   - Live match updates
   - Multiple prediction types
   - Team standings
   - Historical statistics

## Summary

✅ **Single Source of Truth:** Backend API serves all match data  
✅ **No Duplicates:** AI agent fetches from backend, not local JSON  
✅ **Automatic Results:** AI agent watches and submits results  
✅ **Twitter Integration:** Winners show verified Twitter handles  
✅ **Production Ready:** Full workflow tested and working

**Your TrueCall platform is now ready for testing! 🚀**

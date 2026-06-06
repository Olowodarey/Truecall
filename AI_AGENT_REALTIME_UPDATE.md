# AI Agent Real-Time Integration

## Summary

Updated the AI agent to fetch match results from the backend's real-time API and only submit results when matches reach Full Time (FT) status.

## Changes Made

### 1. Backend API Integration

- **Match Data Service** (`ai-agent/src/services/matchDataService.ts`)
  - Now fetches from `/api/matches?status=finished` endpoint
  - Gets only finished matches from API-Football
  - Cache duration: 1 minute (refreshes frequently to catch newly finished matches)

### 2. FT Status Validation

- **Creator Match Watcher** (`ai-agent/src/creatorMatchWatcher.ts`)
  - `fetchMatchResultFromBackend()`: Only returns results if `status === "FT"`
  - `getMatchResultFromBackend()`: Fallback method also checks for FT status
  - Removed generated test results - now uses only real API-Football data
  - Added detailed logging for match status tracking

### 3. Workflow

```
1. AI Agent watches for MatchAdded events from CreatorEventManager contract
2. For each tracked match past kickoff time:
   - Fetches match data from backend API by apiMatchId
   - Checks if status is "FT" (Full Time)
   - Verifies final scores are present
3. Only when status is FT:
   - Submits result to contract via submitCreatorMatchResult()
   - Contract calculates winners automatically
4. Marks match as submitted and removes from tracking
```

## Match Status Values

- **NS** (Not Started) - Match scheduled but not started
- **LIVE** / **1H** / **HT** / **2H** - Match in progress
- **FT** (Full Time) - ✅ **ONLY THIS STATUS TRIGGERS SUBMISSION**
- **AET** (After Extra Time) - Also valid for submission
- **PEN** (Penalties) - Also valid for submission

## API Endpoints Used

### Backend Endpoints

- `GET /api/matches?status=finished` - Get finished matches (FT, AET, PEN)
- `GET /api/matches/:apiMatchId` - Get specific match details

### Match Data Structure

```typescript
{
  id: "api_1234567",           // API-Football fixture ID
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  status: "FT",                // ✅ Must be "FT" to submit
  finalHomeScore: 2,
  finalAwayScore: 1,
  kickoffTime: 1780576384,     // Unix timestamp
  league: "Premier League",
  comment: "Match Finished - 90'"
}
```

## Environment Variables

### AI Agent `.env`

```bash
# Backend API URL (where to fetch match results)
BACKEND_API_URL=https://truecall-production.up.railway.app/api

# Blockchain config
RPC_URL=https://forno.celo.org
AGENT_PRIVATE_KEY=0x...  # AI agent wallet private key
CREATOR_EVENT_MANAGER_ADDRESS=0xbA57166902064dE0EE16Df3A30839da7382F06E5

# Polling config
POLL_INTERVAL_MS=30000  # Check every 30 seconds
STARTUP_BLOCK_LOOKBACK=10000
```

## Testing

### 1. Local Testing

```bash
# Start backend with real API-Football key
cd backend
pnpm start

# Start AI agent
cd ai-agent
npm start
```

### 2. Check AI Agent Logs

Look for these log messages:

- `🎯 Tracking new creator match` - Match added to tracking
- `Match not kicked off yet` - Waiting for kickoff
- `Match not yet finished` - Match live but not FT
- `Match is Full Time, ready to submit` - ✅ Found FT match
- `📊 Submitting match result` - Submitting to contract
- `✅ Match result submitted successfully` - Success!

### 3. Verify Backend API

```bash
# Check finished matches
curl "http://localhost:3001/api/matches?status=finished"

# Check specific match
curl "http://localhost:3001/api/matches/api_1234567"
```

## Deployment

### Railway (AI Agent)

1. Ensure `BACKEND_API_URL` points to production backend
2. Set `AGENT_PRIVATE_KEY` with funded wallet
3. Deploy via Railway CLI or GitHub integration

### Environment Variables on Railway

```bash
BACKEND_API_URL=https://truecall-production.up.railway.app/api
RPC_URL=https://forno.celo.org
AGENT_PRIVATE_KEY=0x...
CREATOR_EVENT_MANAGER_ADDRESS=0xbA57166902064dE0EE16Df3A30839da7382F06E5
POLL_INTERVAL_MS=30000
STARTUP_BLOCK_LOOKBACK=10000
```

## Benefits

1. **Real Match Data**: Uses actual API-Football results instead of generated data
2. **FT Status Validation**: Only submits when matches are truly finished
3. **No False Submissions**: Won't submit halftime or live scores
4. **Automatic Updates**: Backend fetches latest match data every API call
5. **Resilient**: Handles timeouts and API errors gracefully

## Next Steps

1. ✅ Test locally with backend + AI agent
2. ✅ Deploy backend with API_FOOTBALL_KEY
3. ✅ Deploy AI agent with BACKEND_API_URL
4. ✅ Monitor logs for successful submissions
5. ✅ Verify winners are calculated correctly on-chain

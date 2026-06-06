# Quick Start - Local Testing

## Prerequisites

- Backend running on `localhost:3001`
- API_FOOTBALL_KEY configured in `backend/.env`
- PostgreSQL database running
- Frontend running on `localhost:3000` (optional)

## Start Backend

```bash
cd backend
pnpm start
```

**Expected output:**

```
✅ Real-time API configured - will fetch live data
TrueCall API running on http://localhost:3001/api
```

## Start AI Agent

```bash
cd ai-agent
npm start
```

**Expected output:**

```
🤖 Creator Match Watcher starting
🎯 Tracking new creator match (if any matches found)
```

## Test Endpoints

### Check Backend Status

```bash
curl http://localhost:3001/api/matches/realtime/status
# Should return: {"available":true,"provider":"API-Football",...}
```

### Check Upcoming Matches

```bash
curl "http://localhost:3001/api/matches?upcoming=true" | jq 'length'
# Should return number of upcoming matches
```

### Check Finished Matches (for AI agent)

```bash
curl "http://localhost:3001/api/matches?status=finished" | jq '.[0:3]'
# Should return finished matches with FT status
```

## Test Full Workflow

### 1. Create a Match Event (Frontend)

1. Go to `http://localhost:3000/creator-events/create`
2. Click "Load Matches"
3. Select an upcoming match
4. Set kickoff time (e.g., 5 minutes from now)
5. Create event

### 2. Watch AI Agent Logs

The AI agent will:

- Detect the MatchAdded event
- Track the match
- Wait for kickoff time
- Poll backend for match result
- When status = "FT", submit result to contract

### 3. Expected AI Agent Logs

```
🎯 Tracking new creator match
   matchId: 1
   apiMatchId: api_1234567
   homeTeam: Arsenal
   awayTeam: Chelsea

Match not kicked off yet
   kickoffTime: 2026-06-07T00:30:00Z

(after kickoff)
Match not yet finished
   status: 1H (First Half)

(when finished)
Match is Full Time, ready to submit
   status: FT
   homeScore: 2
   awayScore: 1

📊 Submitting match result
   matchId: 1
   result: 2-1

✅ Match result submitted successfully
```

## Troubleshooting

### Backend shows 0 upcoming matches

- Check if API_FOOTBALL_KEY is set correctly
- API might be rate-limited (free tier: 100 requests/day)
- Try checking finished matches instead: `/matches?status=finished`

### AI Agent not submitting results

- Ensure match has kicked off (check `kickoffTime`)
- Verify match status is "FT" in backend API
- Check AI agent has sufficient CELO for gas
- Review AI agent logs for errors

### Timeout errors from API-Football

- API might be slow - timeout increased to 30s
- Network connectivity issues
- Try again after a few minutes

## Run All Tests

```bash
# From project root
./test-ai-agent-integration.sh
```

This will check:

- Backend status
- Finished matches availability
- AI agent configuration
- Build status

## Environment Files

### `backend/.env`

```bash
API_FOOTBALL_KEY=17ee519e0840f0deb05a193b791290fe
PRIVATE_KEY=0x...
CREATOR_EVENT_MANAGER_ADDRESS=0xbA57166902064dE0EE16Df3A30839da7382F06E5
```

### `ai-agent/.env`

```bash
BACKEND_API_URL=http://localhost:3001/api
AGENT_PRIVATE_KEY=0x...
CREATOR_EVENT_MANAGER_ADDRESS=0xbA57166902064dE0EE16Df3A30839da7382F06E5
RPC_URL=https://forno.celo.org
```

### `frontend/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_CREATOR_EVENT_MANAGER=0xbA57166902064dE0EE16Df3A30839da7382F06E5
```

## Deploy to Production

Once local testing works:

1. **Deploy Backend to Railway**

   ```bash
   cd backend
   railway up
   ```

2. **Update AI Agent Backend URL**

   ```bash
   # In ai-agent/.env
   BACKEND_API_URL=https://truecall-production.up.railway.app/api
   ```

3. **Deploy AI Agent to Railway**

   ```bash
   cd ai-agent
   railway up
   ```

4. **Update Frontend to use Production**

   ```bash
   # In frontend/.env.local
   NEXT_PUBLIC_API_URL=https://truecall-production.up.railway.app/api
   ```

5. **Deploy Frontend to Netlify**
   ```bash
   cd frontend
   netlify deploy --prod
   ```

## Done! 🎉

Your TrueCall platform is now:

- ✅ Fetching real match data from API-Football
- ✅ AI agent submitting results only at Full Time
- ✅ Winners calculated automatically on-chain

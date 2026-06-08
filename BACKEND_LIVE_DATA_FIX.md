# Backend Live Match Data Fix

## Problem

The backend was not fetching live match results from API-Football. Matches that had finished (like Colombia vs Jordan) still showed as "NS" (Not Started) in the database even though they were "FT" (Full Time) in API-Football with final scores.

### Root Cause Analysis

1. **Database Cache Strategy**: The backend uses a database cache that syncs matches periodically via CRON jobs:
   - Every 2 hours: Sync World Cup + Friendlies matches
   - Every hour: Sync **finished** matches (last 2 days)

2. **GET /:id Endpoint Issue**: The `GET /api/matches/:id` endpoint only read from the database cache and never fetched live data from API-Football, even when matches were still in progress or recently finished.

3. **Sync Timing Gap**: When the backend was restarted, the CRON jobs hadn't run yet, so finished matches remained in the "NS" state until the next hourly sync.

4. **AI Agent Impact**: The AI agent polls the backend to check match status. It saw "NS" instead of "FT", so it didn't submit results to the blockchain.

## Solution Implemented

### Updated GET /matches/:id Endpoint

Modified `backend/src/matches/matches.controller.ts` to **fetch live data from API-Football** for matches with `api_` prefix:

**New Logic:**

1. Check if match ID starts with `api_` (API-Football match)
2. Look up cached match in database
3. If cached match is already "FT" (finished), return it immediately
4. Otherwise, **fetch live data from API-Football** to get latest status and scores
5. Return live data if available, fallback to cache if API call fails
6. For non-API matches, use old logic (cache → JSON fallback)

### Benefits

✅ **Real-time Data**: Finished matches are detected immediately, no waiting for CRON sync  
✅ **Reduced API Calls**: Only fetch live data when match is not finished in cache  
✅ **Fault Tolerant**: Falls back to cache if API-Football is unavailable  
✅ **AI Agent Compatible**: Agent now gets correct FT status and scores instantly

## Testing

### Before Fix

```bash
curl "https://truecall-production.up.railway.app/api/matches/api_1528288"
# Result: status "NS", scores null (even though match was FT 2-0)
```

### After Fix (Wait ~2-3 minutes for deployment)

```bash
curl "https://truecall-production.up.railway.app/api/matches/api_1528288"
# Expected Result: status "FT", finalHomeScore: 2, finalAwayScore: 0
```

### Manual Sync (Force Update Now)

```bash
curl "https://truecall-production.up.railway.app/api/matches/sync/trigger"
```

## How It Works Now

```
┌─────────────────────────────────────────────────────────┐
│  AI Agent / Frontend Requests Match Data                │
│  GET /api/matches/api_1528288                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Backend Controller: getMatchById()                      │
│                                                          │
│  1. Is it an api_* match? YES                           │
│  2. Check database cache                                │
│  3. Is cached status "FT"? NO (it's "NS")               │
│  4. ⚡ Fetch LIVE from API-Football                     │
│  5. Return live data: status "FT", scores 2-0           │
└─────────────────────────────────────────────────────────┘
```

## Related Files

- `backend/src/matches/matches.controller.ts` - Updated GET /:id endpoint
- `backend/src/matches/matches.service.ts` - Has getMatchByApiId() method
- `backend/src/matches/database-cache.service.ts` - CRON sync jobs
- `backend/src/matches/world-cup-api.service.ts` - API-Football integration
- `ai-agent/src/creatorMatchWatcher.ts` - Polls backend for match results

## Deployment

- **Pushed to GitHub**: Commit 28e283b
- **Railway Auto-Deploy**: ~2-3 minutes after push
- **Status**: Deploying now...

## Next Steps After Deployment

1. Wait 2-3 minutes for Railway to deploy
2. Test the endpoint: `curl "https://truecall-production.up.railway.app/api/matches/api_1528288"`
3. Verify status is "FT" and scores are correct (2-0)
4. AI agent will automatically detect the update on next polling cycle (60 seconds)
5. Agent will submit result to blockchain
6. Check AI agent logs on Railway to confirm submission

## Alternative: Manual Result Submission

If needed, you can manually submit the result using the AI agent:

```bash
cd ai-agent
npx ts-node src/submitResult.ts 8 2 0
# Match ID 8, Home Score 2, Away Score 0
```

But with this fix, the AI agent should pick it up automatically within 1 minute!

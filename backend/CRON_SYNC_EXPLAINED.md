# ⏰ Backend CRON Jobs - Automatic Match Syncing

## Overview

The backend automatically syncs match data from API-Football using CRON jobs. These jobs run in the background **without needing to restart the backend**.

## 🔄 Active CRON Jobs

### 1. Priority Matches Sync

**Schedule:** Every 2 hours  
**CRON:** `0 */2 * * *`  
**API Calls:** 2 per execution  
**Daily Total:** 12 syncs × 2 calls = 24 calls/day

**What it does:**

- Fetches upcoming World Cup and Friendlies matches for today and tomorrow
- Stores them in the database for quick access
- Updates match status and scores

### 2. Finished Matches Sync

**Schedule:** Every 45 minutes  
**CRON:** `*/45 * * * *`  
**API Calls:** 2 per execution  
**Daily Total:** 32 syncs × 2 calls = 64 calls/day

**What it does:**

- Fetches finished matches (FT status) from the last 2 days
- Updates scores for matches that have ended
- Ensures AI agent can detect newly finished matches quickly

### 3. Daily Counter Reset

**Schedule:** Midnight daily  
**CRON:** `0 0 * * *`  
**API Calls:** 0

**What it does:**

- Resets the API call counter at midnight
- Ensures you stay within API-Football's free tier limits (100 calls/day)

## 📊 API Usage Management

The backend tracks API calls to avoid exceeding the daily limit:

- **Daily Limit:** 100 API calls (free tier)
- **Priority Sync:** 24 calls/day (every 2 hours)
- **Finished Sync:** 64 calls/day (every 45 minutes)
- **Total Usage:** 88 calls/day (12 calls remaining buffer)
- **Current Usage:** Check at `/api/matches/stats/usage`
- **Auto-Protection:** CRON jobs skip execution if daily limit is reached

### Check API Usage

```bash
curl https://truecall-production.up.railway.app/api/matches/stats/usage
```

Example response:

```json
{
  "callsToday": 24,
  "limit": 100,
  "remaining": 76,
  "percentUsed": 24.0,
  "status": "healthy"
}
```

## 🚀 How CRON Jobs Are Enabled

### 1. Package Installation

The `@nestjs/schedule` package is required:

```json
"@nestjs/schedule": "^6.1.3"
```

### 2. Module Setup

In `src/app.module.ts`:

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // ✅ This enables CRON jobs
    // ... other modules
  ],
})
```

### 3. CRON Decorators

In `src/matches/database-cache.service.ts`:

```typescript
@Cron('*/15 * * * *') // Every 15 minutes
async syncFinishedMatches() {
  // Sync logic
}
```

## ⚡ Real-Time Match Updates

With the recent fix, the backend now provides **real-time match data** in two ways:

### 1. Automatic CRON Syncing (Passive)

- Finished matches sync every 15 minutes
- Updates database cache automatically
- No API call needed when reading from cache

### 2. Live API Fetch (Active)

- When AI agent requests a match (GET `/api/matches/api_123`)
- If match is not FT in cache, backend fetches live data from API-Football
- Ensures latest status even between CRON runs

## 🧪 Manual Sync Trigger

You can manually trigger a sync anytime without waiting for CRON:

```bash
curl -X GET https://truecall-production.up.railway.app/api/matches/sync/trigger
```

**Use cases:**

- Testing the sync mechanism
- Forcing an immediate update
- After backend deployment

## 📈 Monitoring CRON Jobs

### Check Database Stats

```bash
curl https://truecall-production.up.railway.app/api/matches/stats/database
```

Example response:

```json
{
  "total": 79,
  "upcoming": 58,
  "finished": 15,
  "byLeague": {
    "worldCup": 0,
    "friendlies": 55
  }
}
```

### View Railway Logs

1. Go to https://railway.app
2. Select your Backend project
3. Click "Deployments" → "View Logs"
4. Look for CRON job messages:
   - `🔄 Syncing finished priority matches...`
   - `✅ Synced X finished matches (2 API calls)`
   - `📊 API calls today: X/100`

## ⚠️ Important Notes

1. **No Restart Needed**: CRON jobs run automatically once backend is deployed
2. **API Limit Protection**: Jobs stop running if daily limit is reached
3. **Background Operation**: CRON jobs don't block API requests
4. **Railway Restarts**: CRON schedule persists across Railway restarts
5. **Time Zone**: All CRON times are in UTC (Railway default)

## 🐛 Troubleshooting

### CRON Jobs Not Running?

**Check 1: ScheduleModule is imported**

```bash
grep "ScheduleModule" backend/src/app.module.ts
```

Should show: `import { ScheduleModule } from '@nestjs/schedule';`

**Check 2: Backend is running**

```bash
curl https://truecall-production.up.railway.app/api/matches/stats/usage
```

If this fails, backend is down.

**Check 3: API limit not reached**
If `remaining: 0`, CRON jobs will skip until midnight.

**Check 4: Railway logs**
Look for error messages in Railway deployment logs.

## 🎯 Expected Behavior

After deploying these changes:

1. ✅ Backend starts up
2. ✅ CRON jobs register automatically
3. ✅ Every 15 minutes: Finished matches sync
4. ✅ Every 2 hours: Priority matches sync
5. ✅ Midnight daily: Counter resets
6. ✅ AI agent gets fresh data without backend restart

## 📝 Summary

**Before Fix:**

- ❌ CRON jobs defined but not running (ScheduleModule missing)
- ❌ Match data only updated on manual sync or restart
- ❌ AI agent saw stale data

**After Fix:**

- ✅ CRON jobs run automatically every 15 minutes
- ✅ Live API fetch for real-time updates
- ✅ AI agent gets latest match status and scores
- ✅ No manual intervention needed

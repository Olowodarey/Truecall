# 🔴 Real-Time Match Data Integration

## Overview

Your backend now supports **real-time football match data** from API-Football! This allows your application to fetch live match scores, upcoming fixtures, and finished match results automatically.

---

## 🚀 Features

✅ **Live Match Tracking** - Get currently playing matches with real-time scores  
✅ **Finished Matches** - Fetch completed match results for the last 7 days  
✅ **Upcoming Fixtures** - Get scheduled matches for the next 7 days  
✅ **Date-Based Queries** - Fetch matches for specific dates  
✅ **League Filtering** - Filter by popular leagues (Premier League, La Liga, etc.)  
✅ **Automatic Fallback** - Falls back to JSON data if API is not configured  
✅ **AI Agent Compatible** - Works seamlessly with your deployed AI agent

---

## 📋 Setup Instructions

### Step 1: Get API-Football API Key

1. Visit: https://www.api-football.com/
2. Click **"Sign Up"** (free tier available)
3. Verify your email
4. Go to **Dashboard** → **My Account** → **API Key**
5. Copy your API key

### Step 2: Configure Backend

Edit `/backend/.env` and add your API key:

```env
# API-Football Configuration (Real-time match data)
API_FOOTBALL_KEY=your_actual_api_key_here
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
```

### Step 3: Restart Backend

```bash
cd backend
pnpm install  # If needed
pnpm run start:dev
```

### Step 4: Verify Configuration

```bash
curl http://localhost:3001/api/matches/realtime/status
```

**Expected Response:**

```json
{
  "available": true,
  "provider": "API-Football",
  "endpoint": "https://v3.football.api-sports.io"
}
```

---

## 📡 API Endpoints

### 1. Check Real-Time Status

```bash
GET /api/matches/realtime/status
```

Returns whether real-time API is configured and available.

---

### 2. Get Live Matches

```bash
GET /api/matches?status=live
# OR
GET /api/matches/realtime/live
```

Returns all currently playing matches with live scores.

**Example Response:**

```json
[
  {
    "id": "api_12345",
    "homeTeam": "Manchester United",
    "awayTeam": "Liverpool",
    "league": "Premier League",
    "season": "2025/2026",
    "round": "Regular Season - 36",
    "venue": "Old Trafford",
    "kickoffTime": 1780773946,
    "finalHomeScore": 1,
    "finalAwayScore": 1,
    "status": "1H",
    "comment": "First Half - 32'"
  }
]
```

---

### 3. Get Finished Matches

```bash
GET /api/matches?status=finished
# OR
GET /api/matches/realtime/finished
```

Returns completed matches from the last 7 days (for AI agent result submission).

**Status Codes:**

- `FT` - Full Time
- `AET` - After Extra Time
- `PEN` - Penalties

---

### 4. Get Upcoming Matches

```bash
GET /api/matches?upcoming=true
# OR
GET /api/matches/realtime/upcoming
```

Returns scheduled matches for the next 7 days.

---

### 5. Get Matches by Date

```bash
GET /api/matches/realtime/date/2025-06-07
```

Returns all matches scheduled for a specific date (YYYY-MM-DD format).

---

### 6. Get Match by Fixture ID

```bash
GET /api/matches/realtime/fixture/12345
```

Returns detailed information for a specific API-Football fixture ID.

---

## 🎯 Integration with AI Agent

Your AI agent automatically works with real-time data:

### How It Works:

1. **AI Agent polls**: `GET /api/matches?status=finished`
2. **Backend fetches**: Real-time finished matches from API-Football
3. **AI Agent detects**: Matches with final scores
4. **AI Agent submits**: Results to blockchain via smart contract

### Configuration:

The AI agent already points to your backend:

```env
BACKEND_API_URL=https://truecall-production.up.railway.app/api
```

No changes needed - it will automatically use real-time data once API key is configured!

---

## 📊 API-Football Free Tier Limits

| Feature             | Limit       |
| ------------------- | ----------- |
| Requests per day    | 100         |
| Requests per minute | 10          |
| Live fixtures       | Yes         |
| Historical data     | Last 7 days |
| Future fixtures     | Next 7 days |

**Tip:** Cache responses when possible to stay within limits.

---

## 🔄 Data Flow

```
Frontend Request
      ↓
Backend Controller (/api/matches)
      ↓
Matches Service
      ↓
API-Football Service ← [Real-time API]
      ↓
Convert to Match Format
      ↓
Return to Frontend/AI Agent
```

---

## 🏆 Popular League IDs

Use these league IDs for filtering (future feature):

```typescript
PREMIER_LEAGUE: 39; // England
LA_LIGA: 140; // Spain
BUNDESLIGA: 78; // Germany
SERIE_A: 135; // Italy
LIGUE_1: 61; // France
CHAMPIONS_LEAGUE: 2; // UEFA CL
EUROPA_LEAGUE: 3; // UEFA EL
WORLD_CUP: 1; // FIFA WC
```

---

## 🧪 Testing

### Test 1: Check Status

```bash
curl http://localhost:3001/api/matches/realtime/status
```

### Test 2: Get Today's Matches

```bash
curl http://localhost:3001/api/matches/realtime/date/$(date +%Y-%m-%d)
```

### Test 3: Get Live Matches

```bash
curl http://localhost:3001/api/matches/realtime/live
```

### Test 4: Get Finished Matches (for AI agent)

```bash
curl http://localhost:3001/api/matches?status=finished
```

---

## 🚨 Troubleshooting

### Issue: "Real-time API not available"

**Solution:**

1. Check API key is set in `.env`
2. Restart backend: `pnpm run start:dev`
3. Verify key is correct: Check API-Football dashboard

---

### Issue: Empty arrays returned

**Possible Causes:**

- No live/finished matches at the moment
- API rate limit reached (100/day)
- Invalid date format (use YYYY-MM-DD)

**Solution:**

```bash
# Check status first
curl http://localhost:3001/api/matches/realtime/status

# Try different time ranges
curl http://localhost:3001/api/matches/realtime/date/2025-06-07
```

---

### Issue: API returns errors

**Solution:**

1. Check API key validity on API-Football dashboard
2. Verify you haven't exceeded rate limits
3. Check backend logs: `pnpm run start:dev`

---

## 📈 Monitoring

### Backend Logs

Watch for these log messages:

```
✅ Real-time API configured - will fetch live data
[MatchesService] Fetched 5 live matches
[MatchesService] Fetched 12 finished matches from 2025-06-01 to 2025-06-07
```

### AI Agent Logs

The AI agent will show:

```
[INFO] Polling for finished matches...
[INFO] Found finished match: api_12345
[INFO] Arsenal vs Manchester United - Result: 3-1
[INFO] Submitting creator match result...
```

---

## 🔒 Security Notes

1. **Never commit API keys** - Always use environment variables
2. **API key is server-side only** - Not exposed to frontend
3. **Rate limiting** - Backend handles all API calls (not frontend)
4. **Fallback mechanism** - JSON data used if API fails

---

## 🎨 Frontend Integration (Future)

When you want to display real-time data in your frontend:

```typescript
// In your frontend API client
export async function getLiveMatches() {
  const response = await fetch(`${BACKEND_URL}/api/matches?status=live`);
  return response.json();
}

export async function getUpcomingMatches() {
  const response = await fetch(`${BACKEND_URL}/api/matches?upcoming=true`);
  return response.json();
}
```

---

## ✅ Success Checklist

- [ ] API-Football account created
- [ ] API key added to backend `.env`
- [ ] Backend restarted
- [ ] Status endpoint returns `"available": true`
- [ ] Can fetch live matches
- [ ] Can fetch finished matches
- [ ] AI agent still working (uses same endpoint)
- [ ] Railway environment variables updated (if deployed)

---

## 🌐 Railway Deployment

When deploying to Railway, add the environment variable:

```bash
# Link to your Railway project
cd backend
railway link

# Set API key
railway variables set API_FOOTBALL_KEY="your_api_key_here"

# Deploy
railway up
```

Or set via Railway Dashboard:

1. Go to your backend service
2. Click **Variables**
3. Add: `API_FOOTBALL_KEY` = `your_api_key`
4. Redeploy

---

## 📞 Support

### API-Football Support

- Documentation: https://www.api-football.com/documentation-v3
- Status: https://status.api-football.com/
- Support: support@api-football.com

### Rate Limits

- Check usage: API-Football Dashboard → Statistics
- Upgrade plans: API-Football Dashboard → Subscription

---

## 🎉 What's Next?

1. **Configure API key** ← Start here
2. **Test endpoints** locally
3. **Deploy to Railway** with API key
4. **Let AI agent fetch real data** automatically
5. **Build frontend UI** to display live matches
6. **Add caching** to optimize API calls

Your backend is now ready for real-time football data! 🚀⚽

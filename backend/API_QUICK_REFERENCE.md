# 🔥 API Quick Reference - Real-Time Match Data

## 🎯 Setup (5 minutes)

```bash
# 1. Get API Key from https://www.api-football.com/
# 2. Add to backend/.env:
API_FOOTBALL_KEY=your_key_here

# 3. Restart backend
pnpm run start:dev

# 4. Verify
curl http://localhost:3001/api/matches/realtime/status
```

---

## 📡 Essential Endpoints

### Live Matches (In Progress)

```bash
curl "http://localhost:3001/api/matches?status=live"
```

### Finished Matches (Last 7 Days) - For AI Agent

```bash
curl "http://localhost:3001/api/matches?status=finished"
```

### Upcoming Matches (Next 7 Days)

```bash
curl "http://localhost:3001/api/matches?upcoming=true"
```

### Today's Matches

```bash
curl "http://localhost:3001/api/matches/realtime/date/$(date +%Y-%m-%d)"
```

### Check API Status

```bash
curl "http://localhost:3001/api/matches/realtime/status"
```

---

## 📊 Match Status Codes

| Code  | Meaning          | Use Case                    |
| ----- | ---------------- | --------------------------- |
| `NS`  | Not Started      | Upcoming matches            |
| `1H`  | First Half       | Live match                  |
| `HT`  | Halftime         | Live match                  |
| `2H`  | Second Half      | Live match                  |
| `FT`  | Full Time        | Finished (AI agent submits) |
| `AET` | After Extra Time | Finished                    |
| `PEN` | Penalties        | Finished                    |
| `PST` | Postponed        | Cancelled                   |

---

## 🤖 AI Agent Integration

**The AI agent automatically uses real-time data!**

```typescript
// AI Agent polls this endpoint every 60 seconds:
GET /api/matches?status=finished

// Returns matches with:
{
  "kickoffTime": 1780773946,
  "finalHomeScore": 3,
  "finalAwayScore": 1,
  "status": "FT"
}

// Agent submits to blockchain when:
// 1. Status is "FT", "AET", or "PEN"
// 2. Kickoff time is in the past
// 3. Not already submitted
```

---

## 🎨 Response Format

```json
{
  "id": "api_12345",
  "homeTeam": "Arsenal",
  "awayTeam": "Manchester United",
  "league": "Premier League",
  "season": "2025/2026",
  "round": "Regular Season - 36",
  "venue": "Emirates Stadium",
  "homeTeamId": "arsenal",
  "awayTeamId": "manchester_united",
  "kickoffTime": 1780773946,
  "finalHomeScore": 3,
  "finalAwayScore": 1,
  "status": "FT",
  "comment": "Match Finished"
}
```

---

## 🚀 Railway Production

```bash
# Add API key to Railway
railway variables set API_FOOTBALL_KEY="your_key"

# Test production
curl "https://truecall-production.up.railway.app/api/matches/realtime/status"
```

---

## 📊 Rate Limits (Free Tier)

- **100 requests/day**
- **10 requests/minute**
- Resets at midnight UTC

**Pro Tip:** Backend caches responses intelligently

---

## 🏆 Popular Leagues

```typescript
Premier League:    39
La Liga:          140
Bundesliga:        78
Serie A:          135
Ligue 1:           61
Champions League:   2
Europa League:      3
World Cup:          1
```

---

## ⚡ Common Use Cases

### 1. Display Live Matches on Homepage

```bash
GET /api/matches?status=live
```

### 2. Show Today's Schedule

```bash
GET /api/matches/realtime/date/2025-06-07
```

### 3. AI Agent Result Submission

```bash
GET /api/matches?status=finished
```

### 4. Check Specific Match

```bash
GET /api/matches/realtime/fixture/12345
```

---

## 🔧 Troubleshooting

### "available": false

→ API key not set in `.env`  
→ Restart backend after adding key

### Empty array `[]`

→ No matches at this time  
→ Try different date/status  
→ Check rate limit

### 401 Unauthorized

→ Invalid API key  
→ Check API-Football dashboard

---

## 📞 Quick Links

- **API-Football Dashboard**: https://dashboard.api-football.com/
- **Documentation**: https://www.api-football.com/documentation-v3
- **Get API Key**: https://www.api-football.com/pricing
- **Status Page**: https://status.api-football.com/

---

## ✅ Success Checklist

- [ ] API key obtained from API-Football
- [ ] Key added to `backend/.env`
- [ ] Backend restarted
- [ ] Status endpoint shows `"available": true`
- [ ] Can fetch live matches
- [ ] AI agent still working
- [ ] Production deployment updated

---

**You're all set! 🎉**

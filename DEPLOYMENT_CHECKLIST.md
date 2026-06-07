# 🚀 World Cup Launch - Deployment Checklist

## ⚡ Pre-Deployment

### 1. Database Migration

```bash
cd backend

# Run migration
npx typeorm migration:run -d src/config/ormconfig.ts

# Verify tables created
psql $DATABASE_URL -c "\dt"
# Should see: matches_cache, api_call_log
```

### 2. Environment Variables

```bash
# backend/.env - Add new API key
API_FOOTBALL_KEY=<your_new_100_call_free_tier_key>
```

### 3. Install Dependencies

```bash
cd backend
pnpm install @nestjs/schedule

# Build
pnpm run build
```

### 4. Test Locally

```bash
# Start backend
cd backend
pnpm start

# Test endpoints
curl http://localhost:3001/api/matches/stats/usage
curl http://localhost:3001/api/matches/priority
```

## 🔄 Deployment Steps

### Backend (Railway)

```bash
cd backend

# Commit changes
git add .
git commit -m "feat: World Cup database cache + cron jobs for 100 calls/day"

# Push to Railway
git push

# Run migration on Railway
railway run npx typeorm migration:run
```

### AI Agent (Railway)

```bash
cd ai-agent

# Rebuild
npm run build

# Commit
git add .
git commit -m "feat: Use database cache for match results"

# Push
git push
```

### Frontend (Netlify)

```bash
cd frontend

# No changes needed - already points to backend API
# Just redeploy if needed
netlify deploy --prod
```

## ✅ Post-Deployment Verification

### 1. Check Backend Health

```bash
# API usage stats
curl https://truecall-production.up.railway.app/api/matches/stats/usage

# Should return:
# {
#   "callsToday": 0,
#   "limit": 100,
#   "remaining": 100,
#   "percentUsed": 0,
#   "status": "healthy"
# }
```

### 2. Check Database

```bash
# Database stats
curl https://truecall-production.up.railway.app/api/matches/stats/database

# Should return:
# {
#   "total": 0,
#   "upcoming": 0,
#   "finished": 0,
#   "byLeague": {
#     "worldCup": 0,
#     "friendlies": 0
#   }
# }
```

### 3. Trigger First Sync (Manual)

```bash
# SSH into Railway backend
railway shell

# Manually trigger sync (or wait for cron)
# Check logs for sync messages
```

### 4. Check Cron Jobs Running

```bash
# Check Railway logs
railway logs

# Should see:
# "🏆 Syncing World Cup & Friendlies matches..."
# "✅ Synced X priority matches"
```

### 5. Test Frontend

1. Go to https://truecall.netlify.app/creator-events/create
2. Click "Load Matches"
3. Should see World Cup matches if synced

## 📊 Monitoring (First 24 Hours)

### Every 2 Hours - Check:

1. API usage: `/api/matches/stats/usage`
2. Database growth: `/api/matches/stats/database`
3. Cron job logs on Railway

### Expected Timeline:

- **T+0 (Deploy)**: 0 matches, 0 API calls
- **T+2h (First sync)**: ~20-50 matches, 2 API calls
- **T+4h**: 2-4 more API calls
- **T+24h**: ~28-40 API calls total
- **Buffer**: 60-72 calls remaining

## 🚨 Troubleshooting

### Problem: No matches in database

**Solution**: Check Railway logs for errors, verify API key is set

### Problem: API limit exceeded

**Solution**: Check `/stats/usage`, reduce sync frequency temporarily

### Problem: Cron jobs not running

**Solution**: Verify `@nestjs/schedule` is installed, check Railway logs

### Problem: Frontend shows no matches

**Solution**: Check backend `/api/matches/priority` returns data

## 🎯 Success Criteria

- [ ] Migration runs successfully
- [ ] Cron jobs scheduled (see in logs)
- [ ] First sync completes within 2 hours
- [ ] API usage stays under 50 calls/day
- [ ] Frontend loads matches from database
- [ ] AI agent can read finished matches
- [ ] No errors in Railway logs

## 📝 Post-Launch Tasks

### Day 1

- Monitor API usage every 2 hours
- Watch for any errors
- Test creating an event with World Cup match

### Day 2-4 (Before World Cup)

- Accumulate match data
- Test AI agent result submission
- Fine-tune if needed

### Day 5+ (World Cup starts!)

- Monitor closely during matches
- Watch for finished match updates
- Celebrate successful predictions! 🎉

## 🔄 Rollback Plan

If issues occur:

```bash
# Revert migration
npx typeorm migration:revert

# Revert code
git revert HEAD

# Push
git push
```

## 📞 Emergency Contacts

- Railway Dashboard: https://railway.app
- Netlify Dashboard: https://app.netlify.com
- API-Football Dashboard: https://dashboard.api-football.com

---

**Remember**: World Cup starts in 4 days! 🏆

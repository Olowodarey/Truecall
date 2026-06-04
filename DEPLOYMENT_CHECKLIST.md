# 🚀 TrueCall Production Deployment Checklist

Use this checklist to ensure everything is configured correctly before sharing with your friends.

---

## 📦 1. Railway Backend + Database

### Database Setup

- [ ] Create PostgreSQL database on Railway
- [ ] Note down database connection details (Railway provides these automatically)
- [ ] Database tables will be auto-created by TypeORM on first run

### Backend Deployment

- [ ] Create new Railway service for backend
- [ ] Connect to GitHub repository
- [ ] Set root directory to `backend`
- [ ] Add all environment variables (see below)
- [ ] Deploy and verify deployment succeeded
- [ ] Generate Railway domain for backend
- [ ] Copy backend URL (e.g., `https://truecall-backend.up.railway.app`)

### Backend Environment Variables on Railway

```bash
PORT=3001
NODE_ENV=production
CELO_RPC_URL=https://forno.celo.org
CREATOR_EVENT_MANAGER_ADDRESS=0x8A18Da2A173b3951c797a438102345cF92838880
PRIVATE_KEY=0x099ed87cfc479955af2c232113b8a6d5b081e0e20843647fc33aef38080c4b37
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_USERNAME=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
TWITTER_CLIENT_SECRET=ILJz43XueQPaASnDygRaHns5VmAV78FtbvVlwa_W7WkYkUsuj1
TWITTER_REDIRECT_URI=https://your-vercel-app.vercel.app/profile/twitter/callback
```

**Important**: Replace `your-vercel-app.vercel.app` with your actual Vercel URL!

---

## 🎨 2. Vercel Frontend

- [ ] Frontend already deployed to Vercel ✅
- [ ] Get production URL from Vercel dashboard
- [ ] Add environment variable on Vercel:
  ```
  NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
  ```
- [ ] Replace `your-railway-backend.up.railway.app` with actual Railway URL
- [ ] Redeploy frontend (Settings → Deployments → Redeploy)
- [ ] Visit frontend URL and verify it loads

---

## 🐦 3. Twitter OAuth Configuration (CRITICAL!)

- [ ] Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- [ ] Select your TrueCall app
- [ ] Navigate to App Settings → User authentication settings
- [ ] Click Edit
- [ ] Add callback URI: `https://your-vercel-app.vercel.app/profile/twitter/callback`
- [ ] Update website URL: `https://your-vercel-app.vercel.app`
- [ ] Save changes
- [ ] Go back to Railway and update `TWITTER_REDIRECT_URI` to match
- [ ] Redeploy backend if needed

**This is the most critical step! Without this, Twitter linking will fail!**

---

## 🤖 4. AI Agent (Optional for Testing)

You can run the AI agent locally for now:

```bash
cd ai-agent
npm install
npm run build
npm start
```

Or deploy to Railway later once you've tested the main flow.

---

## ✅ 5. Testing Checklist

Before sharing with friends, test these workflows:

### Basic Functionality

- [ ] Frontend loads at Vercel URL
- [ ] Backend is reachable (visit `https://your-railway.up.railway.app/api`)
- [ ] API documentation accessible at `/api/docs`

### Wallet Connection

- [ ] Can connect wallet (Celo Mainnet)
- [ ] Wallet shows correct network (Celo, not Sepolia)
- [ ] Balance shows correctly

### Twitter Linking

- [ ] Click "Link Twitter Account" on profile page
- [ ] Twitter OAuth flow works (redirects to Twitter)
- [ ] After authorization, redirects back to Vercel (not localhost)
- [ ] Backend receives callback and stores Twitter data
- [ ] Backend calls `verifyAddress()` on mainnet contract
- [ ] Verification status shows as verified

### Event Creation

- [ ] Can create new event (costs 1 CELO)
- [ ] Event appears in events list
- [ ] Only verified creators can create events
- [ ] Events show correct status (OPEN)

### Event Browsing

- [ ] Events page shows last 5 OPEN events by default
- [ ] Search functionality works
- [ ] Can filter by event name
- [ ] Creator Twitter username displays correctly

### Event Participation

- [ ] Can join an event
- [ ] Can make predictions on matches
- [ ] Predictions are stored correctly

### Match Results

- [ ] AI agent can submit results (if running)
- [ ] Results are verified by contract
- [ ] Winners are calculated correctly
- [ ] Event status changes to COMPLETED when all matches done

### Database

- [ ] Users table stores wallet addresses and Twitter data
- [ ] Data persists across backend restarts
- [ ] No localhost data interfering

---

## 🔍 6. Verification Commands

### Check Railway Backend Logs

```bash
# In Railway Dashboard
Click backend service → Logs tab
```

Look for:

- "TrueCall API running on..."
- "Connected to Celo Sepolia" (should say Celo Mainnet if updated)
- No database connection errors

### Check Database Connection

```bash
# In Railway PostgreSQL service
Click Connect → Get connection string
Use psql or any PostgreSQL client to verify tables exist
```

### Check Frontend API Connection

```bash
# In browser console on Vercel URL
console.log(process.env.NEXT_PUBLIC_API_URL)
# Should show your Railway backend URL
```

---

## 🐛 7. Common Issues & Solutions

### Issue: CORS Error in Browser

- **Symptom**: Frontend can't call backend API
- **Check**: Backend has `app.enableCors()` (already added ✅)
- **Solution**: Verify Railway backend URL is correct in Vercel env

### Issue: Twitter OAuth Redirect Fails

- **Symptom**: Error "Callback URL mismatch" or redirects to localhost
- **Check**: `TWITTER_REDIRECT_URI` in Railway matches Twitter Developer Portal
- **Solution**: Update both to use Vercel URL

### Issue: "Not Verified" on Contract

- **Symptom**: Twitter linked but verification shows false
- **Check**: Backend logs for `verifyAddress()` transaction
- **Solution**: Check if PRIVATE_KEY in Railway has CELO for gas fees

### Issue: Events Not Loading

- **Symptom**: Events page shows empty or loading forever
- **Check**: Browser console for API errors
- **Solution**: Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel

### Issue: Database Connection Failed

- **Symptom**: Backend logs show "Could not connect to database"
- **Check**: Database environment variables in Railway
- **Solution**: Use Railway's `${{Postgres.VARIABLE}}` syntax for auto-linking

### Issue: Wrong Network Showing

- **Symptom**: Frontend shows "Celo Sepolia" instead of "Celo Mainnet"
- **Check**: `frontend/lib/wagmi.ts` uses `celo` not `celoSepolia`
- **Solution**: Already fixed in previous updates ✅

---

## 📊 8. Share with Friends

Once everything is tested:

1. **Share the Vercel URL**: `https://your-app.vercel.app`
2. **Instructions for friends**:
   - Connect Celo Mainnet wallet (MetaMask, Valora, etc.)
   - Get some CELO tokens (needed for creating events)
   - Link Twitter account to get verified
   - Browse existing events or create new ones
   - Make predictions on matches

3. **What they can test**:
   - Creating events (1 CELO fee)
   - Joining events
   - Making predictions
   - Viewing match results (when AI agent submits)
   - Checking leaderboards

---

## 🎯 9. What to Monitor

### During Testing

- Railway backend logs for errors
- Database for user registrations
- Contract events on Celoscan
- Twitter linking success rate
- Event creation and participation

### Performance

- Railway backend response times
- Database query performance
- Frontend loading speed on Vercel

---

## 📝 10. URLs Quick Reference

Fill these in as you deploy:

```
Frontend (Vercel):     https://_____________________________.vercel.app
Backend (Railway):     https://_____________________________.up.railway.app
Backend API:           https://_____________________________.up.railway.app/api
Backend Docs:          https://_____________________________.up.railway.app/api/docs

Contract (Mainnet):    0x8A18Da2A173b3951c797a438102345cF92838880
Celoscan:              https://celoscan.io/address/0x8A18Da2A173b3951c797a438102345cF92838880

Database (Railway):    [Internal - no public URL needed]
```

---

## 🎉 Ready to Deploy!

Follow these steps in order:

1. ✅ Deploy PostgreSQL on Railway
2. ✅ Deploy backend on Railway with all env variables
3. ✅ Get Railway backend URL
4. ✅ Update Vercel frontend with `NEXT_PUBLIC_API_URL`
5. ✅ Update Twitter Developer Portal with Vercel callback URI
6. ✅ Test all workflows above
7. ✅ Share with friends!

---

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app/
- **Vercel Docs**: https://vercel.com/docs
- **Twitter OAuth Docs**: https://developer.twitter.com/en/docs/authentication/oauth-2-0
- **Railway Discord**: https://discord.gg/railway

---

**Good luck with your deployment! Your friends are going to love testing TrueCall! 🚀⚽**

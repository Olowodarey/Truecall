# 🚀 TrueCall Production Deployment - Quick Start

This is a streamlined guide to get your TrueCall app live for your friends to test.

---

## 🎯 Goal

Deploy TrueCall so friends can:

- Connect wallets on Celo Mainnet
- Link Twitter accounts (verified on-chain)
- Create events (1 CELO fee)
- Make predictions on matches (using your JSON test data)
- View results and winners

---

## 📚 What You Already Have

✅ **Frontend**: Deployed on Vercel  
✅ **Smart Contract**: Deployed to Celo Mainnet at `0x8A18Da2A173b3951c797a438102345cF92838880`  
✅ **Backend Code**: Ready to deploy with JSON match data  
✅ **Database**: PostgreSQL schema ready  
✅ **Railway Account**: Paid account ready

---

## 🏃 Quick Deployment Steps (30 minutes)

### 1️⃣ Deploy Database (5 min)

1. Go to [Railway.app](https://railway.app/dashboard)
2. Click **"New Project"** → **"Provision PostgreSQL"**
3. Done! Railway creates the database automatically
4. Copy the database connection details (you'll need them next)

---

### 2️⃣ Deploy Backend (10 min)

1. In Railway, click **"New"** → **"GitHub Repo"**
2. Select your **Truecall** repository
3. Set **Root Directory**: `backend`
4. Go to **Variables** tab and add:

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

5. **IMPORTANT**: Replace `your-vercel-app.vercel.app` with your actual Vercel URL
6. Go to **Settings** → **Networking** → **Generate Domain**
7. Copy the Railway backend URL (e.g., `https://truecall-backend.up.railway.app`)

---

### 3️⃣ Update Frontend (5 min)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your TrueCall project
3. Go to **Settings** → **Environment Variables**
4. Add:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
   ```
5. Replace with your actual Railway backend URL from step 2
6. Go to **Deployments** → Click **Redeploy** on latest deployment

---

### 4️⃣ Update Twitter OAuth (5 min) 🚨 CRITICAL!

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your TrueCall app
3. **App Settings** → **User authentication settings** → **Edit**
4. Add your Vercel URL to **Callback URI**:
   ```
   https://your-vercel-app.vercel.app/profile/twitter/callback
   ```
5. Update **Website URL**:
   ```
   https://your-vercel-app.vercel.app
   ```
6. **Save**

---

### 5️⃣ Test Everything (5 min)

Visit your Vercel URL and test:

- [ ] Frontend loads correctly
- [ ] Can connect Celo Mainnet wallet
- [ ] Can link Twitter account
- [ ] Twitter verification works (check profile shows "Verified")
- [ ] Can browse events (should see last 5 OPEN events)
- [ ] Can create event (costs 1 CELO)
- [ ] Can make predictions

---

## ✅ You're Done!

Share your Vercel URL with friends and let them test!

---

## 📖 Need More Details?

See the comprehensive guides:

- **[RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)** - Full Railway deployment walkthrough
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Complete testing checklist
- **[TWITTER_OAUTH_UPDATE.md](./TWITTER_OAUTH_UPDATE.md)** - Twitter OAuth configuration details

---

## 🐛 Something Not Working?

### Backend won't start on Railway

- Check Railway logs (click service → Logs tab)
- Verify all environment variables are set
- Ensure database is linked properly

### Twitter OAuth fails

- Did you update Twitter Developer Portal? (Step 4)
- Does `TWITTER_REDIRECT_URI` in Railway match Twitter Developer Portal?
- Check it redirects to Vercel, not localhost

### Frontend can't connect to backend

- Is `NEXT_PUBLIC_API_URL` set in Vercel?
- Did you redeploy after adding the env variable?
- Check browser console for CORS errors

### "Not Verified" on profile

- Check Railway backend logs for `verifyAddress()` transaction
- Ensure `PRIVATE_KEY` wallet has CELO for gas fees
- Verify contract address is correct in Railway

---

## 🎉 What's Next?

After testing with friends:

1. Replace JSON match data with real Football API
2. Deploy AI agent to automatically submit results
3. Add monitoring and alerts
4. Consider custom domain for backend

---

## 🔗 Important URLs

**Frontend (Vercel)**: `https://_______________.vercel.app`  
**Backend (Railway)**: `https://_______________.up.railway.app`  
**Contract (Mainnet)**: `0x8A18Da2A173b3951c797a438102345cF92838880`  
**Celoscan**: https://celoscan.io/address/0x8A18Da2A173b3951c797a438102345cF92838880

---

**Ready? Let's deploy! 🚀**

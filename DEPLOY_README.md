# 🚀 Deploy TrueCall to Production

**Goal**: Get your TrueCall app live for friends to test with JSON match data on Celo Mainnet.

---

## ⚡ Quick Start (Choose One)

### 🏃 I Want Step-by-Step (30 min)

👉 **Start here**: [QUICK_START.md](./QUICK_START.md)

### 📚 I Want Full Details

👉 **Read these**:

1. [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) - Complete Railway setup
2. [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Testing checklist
3. [TWITTER_OAUTH_UPDATE.md](./TWITTER_OAUTH_UPDATE.md) - Twitter config

### 🔧 Something Broke

👉 **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📋 What You Need

- [x] Railway account (paid) ✅ You have this
- [x] Vercel account with deployed frontend ✅ You have this
- [x] Mainnet contract deployed ✅ Done: `0x8A18Da2A173b3951c797a438102345cF92838880`
- [x] Twitter Developer account ✅ You have this
- [ ] 30 minutes to deploy

---

## 🎯 Deployment Order

```
1. Railway PostgreSQL     → 5 min
2. Railway Backend        → 10 min
3. Vercel Frontend Update → 5 min
4. Twitter OAuth Update   → 5 min (CRITICAL!)
5. Testing                → 5 min
```

**Total**: ~30 minutes

---

## 🔑 Critical Steps (Don't Skip!)

### 1️⃣ Railway Backend Environment Variables

Use this template: [`backend/.env.railway.example`](./backend/.env.railway.example)

**Most Important**:

```bash
CELO_RPC_URL=https://forno.celo.org
CREATOR_EVENT_MANAGER_ADDRESS=0x8A18Da2A173b3951c797a438102345cF92838880
TWITTER_REDIRECT_URI=https://your-vercel-app.vercel.app/profile/twitter/callback
DATABASE_HOST=${{Postgres.PGHOST}}
```

### 2️⃣ Vercel Frontend Environment

Add in Vercel Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
```

Then **REDEPLOY** frontend!

### 3️⃣ Twitter Developer Portal (CRITICAL!)

**Update callback URI**:

```
From: http://localhost:3000/profile/twitter/callback
To:   https://your-vercel-app.vercel.app/profile/twitter/callback
```

See: [TWITTER_OAUTH_UPDATE.md](./TWITTER_OAUTH_UPDATE.md)

---

## ✅ Success Checklist

Your deployment works when:

- [ ] Can access frontend at Vercel URL
- [ ] Can connect Celo Mainnet wallet
- [ ] Can link Twitter account
- [ ] Profile shows "Verified"
- [ ] Can browse events
- [ ] Can create event (costs 1 CELO)
- [ ] Can make predictions

---

## 🆘 Help

**Quick Fixes**:

| Problem                      | Solution                                         |
| ---------------------------- | ------------------------------------------------ |
| Twitter OAuth fails          | Update Twitter Developer Portal callback URL     |
| Backend not reachable        | Check Railway logs, verify env variables         |
| Frontend can't reach backend | Set `NEXT_PUBLIC_API_URL` in Vercel and redeploy |
| "Not Verified" on profile    | Check backend logs for transaction errors        |
| Database connection failed   | Use Railway `${{Postgres.VARIABLE}}` syntax      |

**Full troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📞 Need More Help?

- **Railway Help**: https://railway.app/help
- **Vercel Help**: https://vercel.com/help
- **Twitter OAuth Help**: https://developer.twitter.com/en/support

---

## 🎉 After Deployment

Share your Vercel URL with friends:

```
Hey! Check out TrueCall: https://your-app.vercel.app

1. Connect Celo Mainnet wallet
2. Link your Twitter account
3. Create events or join existing ones
4. Make predictions on matches!
```

---

## 📊 What's Next?

After friends test with JSON data:

1. Integrate real Football API
2. Deploy AI agent for auto result submission
3. Add custom domain
4. Monitor usage and optimize

---

**Ready? Go to [QUICK_START.md](./QUICK_START.md) and let's deploy! 🚀**

---

## 📁 Deployment Files Reference

- `QUICK_START.md` - Fast 30-min walkthrough ⚡
- `DEPLOYMENT_SUMMARY.md` - Quick reference sheet 📋
- `RAILWAY_DEPLOYMENT_GUIDE.md` - Full Railway guide 📚
- `DEPLOYMENT_CHECKLIST.md` - Complete testing list ✅
- `TWITTER_OAUTH_UPDATE.md` - Twitter setup 🐦
- `TROUBLESHOOTING.md` - Debug guide 🔧
- `backend/.env.railway.example` - Railway env template
- `frontend/.env.production.example` - Vercel env template
- `backend/railway.toml` - Railway config file
- `backend/Procfile` - Railway process config

# 📋 TrueCall Deployment - Quick Reference

## 🎯 Current Status

✅ **Contract**: Deployed to Celo Mainnet  
✅ **Frontend**: Deployed to Vercel  
🔄 **Backend**: Ready to deploy to Railway  
🔄 **Database**: Ready to provision on Railway

---

## 🔗 Important Addresses

**Mainnet Contract**: `0x8A18Da2A173b3951c797a438102345cF92838880`  
**Celoscan**: https://celoscan.io/address/0x8A18Da2A173b3951c797a438102345cF92838880  
**Creation Fee**: 1 CELO  
**Chain ID**: 42220 (Celo Mainnet)  
**RPC URL**: https://forno.celo.org

---

## 📄 Deployment Guides

| Guide                                                            | Purpose                             |
| ---------------------------------------------------------------- | ----------------------------------- |
| **[QUICK_START.md](./QUICK_START.md)**                           | ⚡ 30-minute deployment walkthrough |
| **[RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)** | 📚 Comprehensive Railway setup      |
| **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**         | ✅ Complete testing checklist       |
| **[TWITTER_OAUTH_UPDATE.md](./TWITTER_OAUTH_UPDATE.md)**         | 🐦 Twitter OAuth configuration      |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**                   | 🔧 Common issues & solutions        |

**Start here**: [QUICK_START.md](./QUICK_START.md)

---

## 🚀 Deployment Steps (TL;DR)

1. **Railway**: Provision PostgreSQL database
2. **Railway**: Deploy backend from GitHub (`backend` folder)
3. **Railway**: Add environment variables (use `.env.railway.example`)
4. **Railway**: Generate domain for backend
5. **Vercel**: Add `NEXT_PUBLIC_API_URL` with Railway backend URL
6. **Vercel**: Redeploy frontend
7. **Twitter**: Update callback URI to Vercel URL
8. **Test**: Verify all workflows

---

## ⚙️ Environment Variables

### Railway Backend

See: [`backend/.env.railway.example`](./backend/.env.railway.example)

Critical variables:

```bash
CELO_RPC_URL=https://forno.celo.org
CREATOR_EVENT_MANAGER_ADDRESS=0x8A18Da2A173b3951c797a438102345cF92838880
TWITTER_REDIRECT_URI=https://your-vercel-app.vercel.app/profile/twitter/callback
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_USERNAME=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
```

### Vercel Frontend

See: [`frontend/.env.production.example`](./frontend/.env.production.example)

Critical variable:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
```

---

## 🐦 Twitter OAuth (CRITICAL!)

**Current (Localhost)**:

```
http://localhost:3000/profile/twitter/callback
```

**Required (Production)**:

```
https://your-vercel-app.vercel.app/profile/twitter/callback
```

**Action Required**:

1. Update Twitter Developer Portal with Vercel URL
2. Update `TWITTER_REDIRECT_URI` in Railway backend

See: [TWITTER_OAUTH_UPDATE.md](./TWITTER_OAUTH_UPDATE.md)

---

## ✅ Pre-Flight Checklist

Before sharing with friends:

- [ ] Railway PostgreSQL provisioned
- [ ] Railway backend deployed and running
- [ ] Railway backend domain generated
- [ ] Vercel `NEXT_PUBLIC_API_URL` set to Railway backend
- [ ] Vercel frontend redeployed
- [ ] Twitter Developer Portal updated with Vercel URL
- [ ] Railway `TWITTER_REDIRECT_URI` updated to Vercel URL
- [ ] Tested wallet connection on mainnet
- [ ] Tested Twitter linking on production
- [ ] Verified Twitter account shows as verified on-chain
- [ ] Tested event creation (costs 1 CELO)
- [ ] Tested event browsing and filtering
- [ ] Tested predictions on matches

---

## 🧪 Test Workflow

Your friends should be able to:

1. **Connect Wallet** → Celo Mainnet
2. **Link Twitter** → Get verified on-chain
3. **Browse Events** → See last 5 OPEN events
4. **Search Events** → Find specific events by name
5. **Create Event** → Pay 1 CELO, select 5 matches from JSON data
6. **Join Event** → Make predictions
7. **View Results** → See winners after matches complete (AI agent submits)

---

## 📊 What's Using JSON Data

Currently using JSON file for match data:

- **File**: `backend/src/data/matches.json`
- **Contains**: 12 test matches with teams, leagues, dates
- **Used by**: Backend matches service
- **Future**: Will be replaced with real Football API

This lets your friends test the full workflow before integrating live data.

---

## 🤖 AI Agent

**Status**: Optional for initial testing

**Options**:

1. Run locally for now:
   ```bash
   cd ai-agent
   npm start
   ```
2. Deploy to Railway later

**Purpose**: Automatically submits match results when matches complete

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ Friends can access frontend at Vercel URL  
✅ Can connect Celo Mainnet wallets  
✅ Can link Twitter accounts  
✅ Twitter verification appears on-chain  
✅ Can create events (1 CELO fee)  
✅ Can browse and search events  
✅ Can join events and make predictions  
✅ Match results can be submitted  
✅ Winners are calculated correctly

---

## 🔍 Debugging Quick Tips

**Backend not starting?**
→ Check Railway logs

**Twitter OAuth failing?**
→ Verify Twitter Developer Portal callback URL matches Railway env

**Frontend can't reach backend?**
→ Verify `NEXT_PUBLIC_API_URL` in Vercel and redeploy

**"Not Verified" on profile?**
→ Check backend logs for `verifyAddress()` transaction

**Database connection failed?**
→ Use Railway's `${{Postgres.VARIABLE}}` syntax

See: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📞 Resources

**Railway**:

- Dashboard: https://railway.app/dashboard
- Docs: https://docs.railway.app/

**Vercel**:

- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs

**Twitter**:

- Developer Portal: https://developer.twitter.com/en/portal/dashboard
- OAuth 2.0 Docs: https://developer.twitter.com/en/docs/authentication/oauth-2-0

**Celo**:

- Celoscan: https://celoscan.io/
- Docs: https://docs.celo.org/
- Forno RPC: https://forno.celo.org

---

## 🚨 Important Notes

1. **Creation Fee**: Events cost 1 CELO to create on mainnet
2. **Gas Fees**: Admin wallet needs CELO for verification transactions
3. **Twitter OAuth**: Must update both Twitter Portal AND Railway env
4. **Database**: TypeORM auto-creates tables on first run
5. **JSON Data**: Using test data from `matches.json` for now
6. **Network**: Everything must use Celo Mainnet (Chain ID 42220)

---

## 🎯 Next Steps After Testing

Once your friends have tested and you're happy:

1. ✅ Integrate real Football API (replace JSON data)
2. ✅ Deploy AI agent for automatic result submission
3. ✅ Add monitoring and alerts
4. ✅ Consider custom domain for backend
5. ✅ Add rate limiting and security measures
6. ✅ Optimize database queries and caching
7. ✅ Add analytics and usage tracking

---

## 📝 Your URLs

Fill these in during deployment:

```
Vercel Frontend:    https://_________________________________.vercel.app
Railway Backend:    https://_________________________________.up.railway.app
Backend API:        https://_________________________________.up.railway.app/api
Backend Docs:       https://_________________________________.up.railway.app/api/docs
```

---

**Ready to deploy? Start with [QUICK_START.md](./QUICK_START.md)! 🚀**

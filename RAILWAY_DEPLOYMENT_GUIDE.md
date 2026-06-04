# Railway Deployment Guide

## 🚂 Backend + Database Deployment to Railway

This guide will help you deploy your TrueCall backend and PostgreSQL database to Railway so your friends can test the application.

---

## 📋 Prerequisites

- Railway account (paid) ✅ You have this
- GitHub repository with your code
- Vercel deployment URL for frontend

---

## 🗄️ Step 1: Deploy PostgreSQL Database on Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Provision PostgreSQL"**
4. Railway will automatically create a PostgreSQL database
5. Click on the PostgreSQL service to view connection details
6. **Copy these environment variables** (you'll need them later):
   - `DATABASE_URL` (Railway provides this automatically)
   - Or individual variables: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

---

## 🚀 Step 2: Deploy Backend to Railway

### Option A: Deploy from GitHub (Recommended)

1. In Railway Dashboard, click **"New"** → **"GitHub Repo"**
2. Connect your GitHub account if not already connected
3. Select your **Truecall** repository
4. Railway will detect it's a Node.js project
5. Set **Root Directory** to: `backend`
6. Railway will auto-detect `package.json` and use the correct build commands

### Option B: Deploy using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Navigate to backend folder
cd backend

# Link to Railway project
railway link

# Deploy
railway up
```

---

## ⚙️ Step 3: Configure Environment Variables in Railway

In your Railway backend service, go to **Variables** tab and add these:

### Required Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Celo Mainnet Configuration
CELO_RPC_URL=https://forno.celo.org
CREATOR_EVENT_MANAGER_ADDRESS=0x8A18Da2A173b3951c797a438102345cF92838880

# Private Key (Admin Wallet for Contract Verification)
PRIVATE_KEY=0x099ed87cfc479955af2c232113b8a6d5b081e0e20843647fc33aef38080c4b37

# Database Configuration (Use Railway's PostgreSQL connection details)
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_USERNAME=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
DATABASE_NAME=${{Postgres.PGDATABASE}}

# Twitter OAuth Configuration
TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
TWITTER_CLIENT_SECRET=ILJz43XueQPaASnDygRaHns5VmAV78FtbvVlwa_W7WkYkUsuj1
TWITTER_REDIRECT_URI=https://your-vercel-app.vercel.app/profile/twitter/callback

# Legacy addresses (if needed for other features)
TRUECALL_ADDRESS=0x2D69622798DC1F6B09339d4eaEEE0c342a98fa8D
EVENT_MANAGER_ADDRESS=0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33
LEADERBOARD_ADDRESS=0xb4410D9CC489bc5b1AD45a4f6611B13aA4742B06
```

### ⚠️ Important Notes:

- **Database variables**: Railway can auto-link database variables using `${{Postgres.VARIABLE_NAME}}` syntax
- **TWITTER_REDIRECT_URI**: Replace `your-vercel-app.vercel.app` with your actual Vercel URL
- **PORT**: Railway automatically sets this, but 3001 is a good default

---

## 🔗 Step 4: Link Database to Backend (Railway Magic)

Railway can automatically link services:

1. In Railway Dashboard, click on your **backend service**
2. Go to **Settings** → **Service Variables**
3. Click **"+ New Variable"** → **"Add Reference"**
4. Select your PostgreSQL database
5. Railway will automatically inject database connection variables

Alternatively, use the **`${{Postgres.VARIABLE}}`** syntax shown above.

---

## 🌐 Step 5: Get Your Backend URL

1. In Railway backend service, go to **Settings** tab
2. Scroll to **Networking** section
3. Click **"Generate Domain"**
4. Railway will give you a URL like: `https://truecall-backend-production.up.railway.app`
5. **Copy this URL** - you'll need it for frontend environment variables

---

## 🎨 Step 6: Update Frontend Environment Variables on Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your TrueCall frontend project
3. Go to **Settings** → **Environment Variables**
4. Add this variable:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
```

Replace `your-railway-backend.up.railway.app` with your actual Railway backend URL.

5. **Redeploy** your frontend:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a new commit to trigger automatic deployment

---

## 🐦 Step 7: Update Twitter OAuth Redirect URI (CRITICAL!)

Your Twitter app currently uses `http://localhost:3000/profile/twitter/callback`. You need to update this:

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your TrueCall app
3. Go to **App Settings** → **User authentication settings**
4. Click **Edit**
5. Update **Callback URI / Redirect URL**:
   - Add: `https://your-vercel-app.vercel.app/profile/twitter/callback`
   - You can keep localhost for local testing: `http://localhost:3000/profile/twitter/callback`
6. Add your Vercel domain to **Website URL** as well
7. Save changes

---

## 🧪 Step 8: Test Database Migration (Optional but Recommended)

If you need to set up the database schema, Railway can run scripts:

### Option A: Run migration from Railway CLI

```bash
# Connect to your Railway project
railway link

# Run database setup
railway run npm run db:setup

# Or run migration
railway run npm run db:migrate
```

### Option B: Connect to Railway PostgreSQL directly

```bash
# Get connection string from Railway dashboard
# Then connect using psql or any PostgreSQL client

psql "postgresql://postgres:password@host:port/railway"

# Run your schema setup SQL commands
```

The database schema should be created automatically when your NestJS app starts with TypeORM.

---

## 🤖 Step 9: AI Agent Deployment (Optional)

You have two options for the AI agent:

### Option A: Run Locally (Easiest for Testing)

```bash
cd ai-agent
npm install
npm run build
npm start
```

The AI agent will connect to your mainnet contract and submit match results.

### Option B: Deploy to Railway

1. Create another service in Railway
2. Deploy from the `ai-agent` folder
3. Set environment variables:
   - `CELO_RPC_URL=https://forno.celo.org`
   - `CREATOR_EVENT_MANAGER_ADDRESS=0x8A18Da2A173b3951c797a438102345cF92838880`
   - `PRIVATE_KEY=your_agent_private_key`

---

## ✅ Step 10: Verification Checklist

Before sharing with friends, verify:

- [ ] Railway backend is deployed and running
- [ ] PostgreSQL database is connected to backend
- [ ] Backend URL is accessible (visit `https://your-backend.up.railway.app/api`)
- [ ] Frontend on Vercel loads correctly
- [ ] Frontend can communicate with Railway backend
- [ ] Twitter OAuth redirects to Vercel URL (not localhost)
- [ ] Users can link Twitter accounts
- [ ] Contract verification works on mainnet
- [ ] Match data loads from JSON file
- [ ] AI agent can submit results (if running)

---

## 🔍 Debugging Tips

### Check Backend Logs on Railway

1. Go to Railway Dashboard
2. Click on backend service
3. View **Logs** tab in real-time

### Check Database Connection

Railway provides a PostgreSQL connection URL in this format:

```
postgresql://${{PGUSER}}:${{PGPASSWORD}}@${{PGHOST}}:${{PGPORT}}/${{PGDATABASE}}
```

### Common Issues

**Issue**: `CORS error` from frontend

- **Solution**: Backend already has `app.enableCors()` enabled ✅

**Issue**: Twitter OAuth callback fails

- **Solution**: Update Twitter Developer Portal with Vercel URL

**Issue**: Database tables don't exist

- **Solution**: TypeORM should auto-create tables. Check `synchronize: true` in TypeORM config

**Issue**: Backend can't connect to database

- **Solution**: Verify database variables are correctly set in Railway

---

## 📊 Monitoring

### Railway Dashboard

- **Metrics**: View CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Health Checks**: Railway monitors your service health

### Costs

- Railway paid plan includes:
  - $5 of usage per month
  - PostgreSQL database
  - Automatic SSL certificates
  - Custom domains

---

## 🎉 What Your Friends Will Experience

Once deployed, your friends can:

1. Visit your Vercel frontend URL
2. Connect their wallets (Celo Mainnet)
3. Link their Twitter accounts (verified by backend + mainnet contract)
4. Browse events (last 5 shown by default, search for more)
5. Create events (costs 1 CELO)
6. Join events and make predictions
7. See match results submitted by AI agent
8. View winners and leaderboard

---

## 🚀 Next Steps After Testing

Once your friends test and you're happy with the workflow:

1. Replace JSON match data with real Football API
2. Configure AI agent scheduling for automatic result submission
3. Set up monitoring/alerts
4. Add production security measures (rate limiting, etc.)
5. Consider custom domain for Railway backend

---

## 📝 Environment Variables Quick Reference

### Backend (Railway)

```
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

### Frontend (Vercel)

```
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
```

### AI Agent (Railway or Local)

```
CELO_RPC_URL=https://forno.celo.org
CREATOR_EVENT_MANAGER_ADDRESS=0x8A18Da2A173b3951c797a438102345cF92838880
PRIVATE_KEY=your_agent_private_key
```

---

## 📞 Support

If you encounter issues:

1. Check Railway logs for backend errors
2. Check Vercel deployment logs for frontend errors
3. Verify all environment variables are set correctly
4. Test Twitter OAuth flow with updated redirect URI
5. Confirm database connection in Railway

---

**Ready to deploy? Let's go! 🚀**

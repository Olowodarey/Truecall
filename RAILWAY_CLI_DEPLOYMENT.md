# 🚂 Railway CLI Deployment - Step by Step

The Railway CLI had an API error during `railway init`. Here's the alternative approach:

---

## ✅ Step 1: Create Project on Railway Dashboard (Do This First!)

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Click **"Empty Project"**
4. Name it: `truecall-backend`
5. Keep the project page open

---

## ✅ Step 2: Add PostgreSQL Database

In your Railway project:

1. Click **"+ New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Done! Railway provisions it automatically

---

## ✅ Step 3: Link Your Local Backend to Railway Project

Now we'll connect your local code to the Railway project:

```bash
# Navigate to backend folder
cd ~/Desktop/my\ projects/Truecall/backend

# Link to your Railway project (you'll select it from a list)
railway link
```

When prompted:

- Select workspace: **Darey Olowo's Projects**
- Select project: **truecall-backend** (the one you just created)

---

## ✅ Step 4: Add Environment Variables via CLI

Now let's add all the environment variables:

```bash
# Set each variable one by one
railway variables set PORT=3001
railway variables set NODE_ENV=production
railway variables set CELO_RPC_URL=https://forno.celo.org
railway variables set CREATOR_EVENT_MANAGER_ADDRESS=0x8A18Da2A173b3951c797a438102345cF92838880
railway variables set PRIVATE_KEY=0x099ed87cfc479955af2c232113b8a6d5b081e0e20843647fc33aef38080c4b37
railway variables set TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
railway variables set TWITTER_CLIENT_SECRET=ILJz43XueQPaASnDygRaHns5VmAV78FtbvVlwa_W7WkYkUsuj1
railway variables set TRUECALL_ADDRESS=0x2D69622798DC1F6B09339d4eaEEE0c342a98fa8D
railway variables set EVENT_MANAGER_ADDRESS=0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33
railway variables set LEADERBOARD_ADDRESS=0xb4410D9CC489bc5b1AD45a4f6611B13aA4742B06
```

**IMPORTANT**: For `TWITTER_REDIRECT_URI`, we'll set it after we deploy and get the Railway URL.

---

## ✅ Step 5: Link Database Variables

Railway can reference PostgreSQL variables. Let's set them:

```bash
# These reference the PostgreSQL service Railway created
railway variables set DATABASE_HOST='${{Postgres.PGHOST}}'
railway variables set DATABASE_PORT='${{Postgres.PGPORT}}'
railway variables set DATABASE_USERNAME='${{Postgres.PGUSER}}'
railway variables set DATABASE_PASSWORD='${{Postgres.PGPASSWORD}}'
railway variables set DATABASE_NAME='${{Postgres.PGDATABASE}}'
```

---

## ✅ Step 6: Deploy Backend

Now deploy your backend:

```bash
# Make sure you're in backend folder
cd ~/Desktop/my\ projects/Truecall/backend

# Build first (to check for errors)
pnpm install
pnpm run build

# Deploy to Railway
railway up
```

This will:

- Upload your code
- Railway detects it's a Node.js project
- Installs dependencies
- Builds the project
- Starts the service

---

## ✅ Step 7: Generate Public Domain

After deployment:

```bash
# Generate a public URL for your backend
railway domain
```

This will give you a URL like:

```
https://truecall-backend-production.up.railway.app
```

**Copy this URL** - you'll need it for:

1. Frontend environment variable
2. Twitter OAuth redirect URI

---

## ✅ Step 8: Update Twitter Redirect URI

Now that you have the Railway backend URL, update the Twitter redirect:

```bash
# Replace with your actual Vercel frontend URL
railway variables set TWITTER_REDIRECT_URI=https://your-vercel-app.vercel.app/profile/twitter/callback
```

Then redeploy:

```bash
railway up
```

---

## ✅ Step 9: Check Deployment Status

```bash
# View deployment logs
railway logs

# Check service status
railway status

# Open Railway dashboard for this project
railway open
```

---

## 📊 Verify Everything Works

1. **Check backend is running**:

   ```bash
   curl https://your-railway-backend.up.railway.app/api
   ```

2. **Check API docs**:
   Visit: `https://your-railway-backend.up.railway.app/api/docs`

3. **Check logs**:
   ```bash
   railway logs --follow
   ```

Look for:

- "TrueCall API running on..."
- "Connected to Celo Mainnet"
- No database connection errors

---

## 🔄 Update Frontend on Vercel

Now update your Vercel frontend with the Railway backend URL:

```bash
# In your frontend directory
cd ~/Desktop/my\ projects/Truecall/frontend

# If you have Vercel CLI installed
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://your-railway-backend.up.railway.app/api

# Then redeploy
vercel --prod
```

Or do it manually in Vercel Dashboard:

1. Go to your project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL` = `https://your-railway-backend.up.railway.app/api`
3. Redeploy

---

## 🐦 Update Twitter Developer Portal

**CRITICAL**: Update Twitter OAuth callback URL:

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your TrueCall app
3. App Settings → User authentication settings → Edit
4. Update Callback URI:
   ```
   https://your-vercel-app.vercel.app/profile/twitter/callback
   ```
5. Save

---

## 🛠️ Useful Railway CLI Commands

```bash
# View logs in real-time
railway logs --follow

# View environment variables
railway variables

# Check service status
railway status

# Open project in browser
railway open

# Redeploy
railway up

# Run commands in Railway environment
railway run npm run db:migrate

# Connect to PostgreSQL
railway connect Postgres

# Unlink project
railway unlink

# List all projects
railway list
```

---

## 🐛 Troubleshooting

### Can't link to project

```bash
# Make sure you're logged in
railway whoami

# If not logged in
railway login

# Try linking again
railway link
```

### Deployment fails

```bash
# Check logs for errors
railway logs

# Verify build works locally first
pnpm run build
```

### Database connection fails

```bash
# Check if Postgres service exists
railway status

# If not, add it through dashboard:
# Project → + New → Database → PostgreSQL
```

### Environment variables not working

```bash
# List all variables
railway variables

# Set variable again
railway variables set VARIABLE_NAME=value

# Redeploy
railway up
```

---

## ✅ Success Checklist

- [ ] Railway project created on dashboard
- [ ] PostgreSQL database added
- [ ] Local backend linked to Railway project
- [ ] All environment variables set
- [ ] Backend deployed successfully
- [ ] Public domain generated
- [ ] Twitter redirect URI updated (Railway + Twitter Portal)
- [ ] Frontend updated with Railway backend URL
- [ ] Logs show no errors
- [ ] API is accessible at public URL

---

## 🎉 You're Done!

Your backend is now live on Railway! Test the full workflow:

1. Visit your Vercel frontend
2. Connect wallet
3. Link Twitter account
4. Verify it works end-to-end

---

## 📞 Need Help?

- Railway CLI Docs: https://docs.railway.app/reference/cli-api
- Railway Status: https://status.railway.app/
- Railway Discord: https://discord.gg/railway

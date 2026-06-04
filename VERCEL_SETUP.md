# Vercel Frontend Setup Guide

## Problem Solved

Your frontend was getting 404 errors because it didn't have API routes to proxy requests to the Railway backend. I've added all the necessary Next.js API routes that will forward requests from `/api/*` to your Railway backend.

## 🚨 CRITICAL: Add Environment Variables to Vercel

Your Vercel deployment needs these environment variables to connect to the Railway backend:

### Step 1: Go to Vercel Dashboard

1. Open https://vercel.com/dashboard
2. Click on your `truecall` project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add These Variables

#### Variable 1: NEXT_PUBLIC_API_URL

- **Key:** `NEXT_PUBLIC_API_URL`
- **Value:** `https://truecall-production.up.railway.app/api`
- **Environments:** Production, Preview, Development (check all)

#### Variable 2: NEXT_PUBLIC_TWITTER_CLIENT_ID

- **Key:** `NEXT_PUBLIC_TWITTER_CLIENT_ID`
- **Value:** `ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ`
- **Environments:** Production, Preview, Development (check all)

### Step 3: Redeploy

After adding the variables:

1. Go to **Deployments** tab
2. Click the 3 dots menu on the latest deployment
3. Click **Redeploy**
4. Select **Use existing Build Cache** (faster)
5. Click **Redeploy**

**OR** just wait for the automatic deployment from the GitHub push I just made!

## What I Fixed

### Created API Proxy Routes

I created Next.js API route handlers in `frontend/app/api/` that proxy all requests to your Railway backend:

**Creator Events Routes:**

- `/api/creator-events` → Get all events
- `/api/creator-events/[id]` → Get single event
- `/api/creator-events/[id]/matches` → Get event matches
- `/api/creator-events/[id]/participants` → Get participants
- `/api/creator-events/[id]/joined/[address]` → Check if user joined
- `/api/creator-events/match/[matchId]` → Get match details
- `/api/creator-events/match/[matchId]/winners` → Get match winners
- `/api/creator-events/match/[matchId]/prediction/[address]` → Get user prediction
- `/api/creator-events/verify/status/[address]` → Get verification status
- `/api/creator-events/fee` → Get creation fee

**User Profile Routes:**

- `/api/users/profile/[address]` → Get user profile
- `/api/users/twitter/callback` → Twitter OAuth callback (POST)
- `/api/users/twitter/link` → Manual Twitter link (POST)
- `/api/users/twitter/unlink` → Unlink Twitter (POST)
- `/api/users/twitter/verify-status/[address]` → Get Twitter verification status

**Matches Routes:**

- `/api/matches/upcoming` → Get upcoming matches

### How It Works

```
Frontend Page → /api/creator-events → Next.js API Route → Railway Backend → Database
                                      (reads NEXT_PUBLIC_API_URL)
```

All API routes read `NEXT_PUBLIC_API_URL` from environment variables and proxy requests to your Railway backend at `https://truecall-production.up.railway.app/api`.

## Testing After Deployment

### 1. Check Frontend Loads Events

Open: https://truecall.vercel.app/creator-events

Should show your event (no more "API error 404")

### 2. Check Profile Page

Open: https://truecall.vercel.app/profile

Connect wallet and try linking Twitter

### 3. Check API Routes Directly

Open: https://truecall.vercel.app/api/creator-events

Should return JSON with your events

## Troubleshooting

### Still Getting 404 Errors?

1. Verify environment variables are set correctly in Vercel
2. Make sure you redeployed after adding the variables
3. Check Vercel function logs: Dashboard → Project → Logs

### Twitter OAuth Not Working?

1. Make sure `NEXT_PUBLIC_TWITTER_CLIENT_ID` is set in Vercel
2. Update Twitter Developer Portal callback URL to: `https://truecall.vercel.app/profile/twitter/callback`
3. Update Railway backend `TWITTER_REDIRECT_URI` to match

### Backend Not Responding?

1. Check Railway backend is running: https://truecall-production.up.railway.app/api/docs
2. Verify DATABASE environment variables are set in Railway
3. Check Railway logs for errors

## Next Steps

1. ✅ Add environment variables to Vercel (see above)
2. ✅ Wait for automatic Vercel deployment (or trigger manual redeploy)
3. ✅ Test frontend loads events correctly
4. ✅ Update Twitter Developer Portal with Vercel URLs
5. ✅ Test Twitter OAuth flow end-to-end

## Files Changed

- Created 17 new API route files in `frontend/app/api/`
- Updated `frontend/.env.production.example` with correct backend URL
- Committed and pushed to GitHub (triggers auto-deploy on Vercel)

## Environment Variables Reference

**In Vercel Dashboard:**

```
NEXT_PUBLIC_API_URL=https://truecall-production.up.railway.app/api
NEXT_PUBLIC_TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
```

**In Railway Dashboard (already set):**

```
TWITTER_REDIRECT_URI=https://truecall.vercel.app/profile/twitter/callback
```

---

🎉 Once you add the environment variables and redeploy, your frontend will be able to fetch data from your Railway backend!

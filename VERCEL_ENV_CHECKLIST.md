# Vercel Environment Variables Checklist

## 🚨 ACTION REQUIRED: Add These to Vercel Dashboard

Go to: **https://vercel.com/dashboard** → Your Project → **Settings** → **Environment Variables**

### ✅ Variable 1: Backend API URL

```
Key:   NEXT_PUBLIC_API_URL
Value: https://truecall-production.up.railway.app/api
Envs:  ✓ Production  ✓ Preview  ✓ Development
```

### ✅ Variable 2: Twitter Client ID

```
Key:   NEXT_PUBLIC_TWITTER_CLIENT_ID
Value: ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
Envs:  ✓ Production  ✓ Preview  ✓ Development
```

## After Adding Variables

### Option 1: Manual Redeploy (Fast)

1. Go to **Deployments** tab
2. Click ⋯ on latest deployment
3. Click **Redeploy**
4. Click **Redeploy** again

### Option 2: Wait for Auto-Deploy

The GitHub push I just made will trigger automatic deployment in a few minutes.

## Verify It Works

After deployment completes, test:

1. **Events Page:** https://truecall.vercel.app/creator-events
   - Should show your event (no more 404 error)

2. **Profile Page:** https://truecall.vercel.app/profile
   - Connect wallet
   - Try Twitter linking

3. **API Route:** https://truecall.vercel.app/api/creator-events
   - Should return JSON with events

## Summary

**What was wrong:** Frontend had no way to reach Railway backend

**What I fixed:** Created Next.js API proxy routes in `frontend/app/api/`

**What you need to do:** Add 2 environment variables to Vercel (see above)

---

📋 Print this checklist and cross off each step as you complete it!

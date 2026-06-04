# Vercel Deployment Debug Guide

## Current Issue

The `/api/users/*` routes return 404 on Vercel but work locally.

## Quick Tests

### Test 1: Check if API routes exist

Open these URLs in your browser:

1. ✅ https://truecall.vercel.app/api/creator-events
   - Should return JSON with events
   - **Status**: WORKING

2. ❌ https://truecall.vercel.app/api/users/profile/0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b
   - Should return JSON with profile
   - **Status**: 404 NOT FOUND

3. ❌ https://truecall.vercel.app/api/users/twitter/verify-status/0xc232b9Fa329255078A8Cc13e585215e69c44f4D3
   - Should return `{"verified":true,...}`
   - **Status**: 404 NOT FOUND

## Root Cause

Vercel hasn't deployed the `/api/users/*` routes even though they exist in git.

## Solutions to Try

### Solution 1: Check Vercel Deployment Status

1. Go to: https://vercel.com/dashboard
2. Click your **truecall** project
3. Click **Deployments** tab
4. Check the latest deployment:
   - Is it "Ready" or "Building" or "Error"?
   - Click on it to see build logs
   - Look for any errors

### Solution 2: Manually Trigger Redeploy

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋯** (3 dots) button
4. Click **Redeploy**
5. Select "Use existing Build Cache"
6. Click **Redeploy**
7. Wait 2-3 minutes
8. Test the URLs above again

### Solution 3: Force Fresh Build

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋯** (3 dots) button
4. Click **Redeploy**
5. **UNCHECK** "Use existing Build Cache" ← Important!
6. Click **Redeploy**
7. Wait 2-3 minutes for fresh build
8. Test the URLs above again

### Solution 4: Check Environment Variables (Again)

Sometimes Vercel needs variables set BEFORE deploying routes that use them.

1. Go to **Settings** → **Environment Variables**
2. Verify these exist:
   ```
   NEXT_PUBLIC_API_URL = https://truecall-production.up.railway.app/api
   NEXT_PUBLIC_TWITTER_CLIENT_ID = ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
   ```
3. If they're there, good!
4. If not, add them and redeploy

### Solution 5: Check Build Logs for Errors

1. Go to latest deployment
2. Click **Building** or **View Function Logs**
3. Look for errors like:
   - "Route not found"
   - "File not found"
   - TypeScript errors
   - Build failures

## Expected Behavior

After successful deployment, this should work:

```bash
curl https://truecall.vercel.app/api/users/twitter/verify-status/YOUR_ADDRESS
```

Should return:

```json
{
  "verified": true,
  "twitterHandle": "YourHandle",
  "twitterAvatar": "https://..."
}
```

Or for unverified:

```json
{
  "verified": false,
  "twitterHandle": null,
  "twitterAvatar": null
}
```

## Why It Works Locally But Not on Vercel

### Locally (Working ✅):

- `pnpm run dev` serves all routes from `frontend/app/api/`
- `.env.local` has the environment variables
- Next.js dev server builds routes on-demand

### Vercel (Not Working ❌):

- Vercel builds routes at deploy time
- If build fails, routes won't exist
- Environment variables must be set in Vercel dashboard
- Vercel may cache old builds

## Debugging Steps

### Step 1: Check Vercel Dashboard

- Project → Deployments → Latest deployment
- Status should be "Ready" not "Error"

### Step 2: View Deployment Details

- Click on the deployment
- Check "Build Logs" for errors
- Check "Function Logs" for runtime errors

### Step 3: Compare Working vs Not Working

- `/api/creator-events` works (200 OK)
- `/api/users/profile/[address]` doesn't work (404)
- **Why?** Something different about users routes

### Step 4: Check File Structure

The files exist in git:

```
frontend/app/api/users/
├── profile/[address]/route.ts
├── twitter/
│   ├── callback/route.ts
│   ├── link/route.ts
│   ├── unlink/route.ts
│   └── verify-status/[address]/route.ts
```

So Vercel should have them!

## Most Likely Causes

1. **Vercel is caching old build** → Force fresh build (Solution 3)
2. **Environment variables missing when build ran** → Add vars then redeploy
3. **Build error that's being hidden** → Check build logs
4. **Vercel hasn't picked up latest git push** → Manually trigger deploy

## Quick Fix Command

If you have Vercel CLI installed:

```bash
vercel --prod --force
```

This forces a fresh production deployment.

## Test After Each Solution

After trying each solution, test with:

```bash
curl https://truecall.vercel.app/api/users/profile/0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b
```

Should return JSON, not 404.

---

## Current Status

- ✅ Local development: ALL routes work
- ✅ Railway backend: API working correctly
- ✅ Vercel: `/api/creator-events/*` working
- ❌ Vercel: `/api/users/*` returning 404
- ❌ Vercel: `/api/matches/*` unknown status

**Next Action**: Check Vercel deployment logs and redeploy

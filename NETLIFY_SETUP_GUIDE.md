# Netlify Deployment Guide for TrueCall

## Current Status

- ✅ Backend: https://truecall-production.up.railway.app
- ✅ Frontend: https://truecall.netlify.app
- ⚠️ Issue: Twitter verification status not displaying correctly

## Required Environment Variables in Netlify

Go to: **Netlify Dashboard → Site Settings → Environment Variables**

Add these variables:

### 1. Backend API URL

```
NEXT_PUBLIC_API_URL=https://truecall-production.up.railway.app/api
```

⚠️ **CRITICAL**: Must include `/api` at the end!

### 2. Twitter OAuth Client ID

```
NEXT_PUBLIC_TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
```

### 3. Twitter Redirect URI

```
NEXT_PUBLIC_TWITTER_REDIRECT_URI=https://truecall.netlify.app/profile/twitter/callback
```

⚠️ **IMPORTANT**: Must be the Netlify domain, NOT localhost!

## Twitter Developer Portal Configuration

Go to: **Twitter Developer Portal → Your App → Authentication settings**

Update the **Callback URI / Redirect URL** to:

```
https://truecall.netlify.app/profile/twitter/callback
```

⚠️ If you're using a custom domain in Netlify, update this to match your custom domain instead.

## Deployment Steps

### Step 1: Set Environment Variables

1. Go to Netlify Dashboard
2. Navigate to: **Site settings → Environment variables**
3. Click **Add a variable**
4. Add all three variables listed above
5. Make sure to select **All scopes** for each variable

### Step 2: Trigger Redeploy

After setting environment variables:

1. Go to **Deploys** tab
2. Click **Trigger deploy → Clear cache and deploy site**
3. Wait for deployment to complete

### Step 3: Update Twitter Developer Settings

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your app
3. Go to **User authentication settings**
4. Update **Callback URI** to: `https://truecall.netlify.app/profile/twitter/callback`
5. Save changes

### Step 4: Test the Deployment

#### Test 1: Check API Connection

Open browser console and visit:

```
https://truecall.netlify.app/api/creator-events
```

Expected: Should return JSON with events data

#### Test 2: Check Twitter Verification API

Visit:

```
https://truecall.netlify.app/api/users/twitter/verify-status/0xc232b9Fa329255078A8Cc13e585215e69c44f4D3
```

Expected: Should return `{"verified": true, "twitterHandle": "kryptkage"}`

#### Test 3: Link Twitter Account

1. Connect wallet at https://truecall.netlify.app
2. Go to Profile page
3. Click "Link with Twitter OAuth"
4. Complete OAuth flow
5. Verify status shows as "Verified" with your Twitter handle

## Troubleshooting

### Issue: "Verify Twitter to Join Events" still showing after linking

**Cause**: Frontend not fetching verification status correctly

**Solution**:

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Visit https://truecall.netlify.app/creator-events
4. Look for request to `/api/users/twitter/verify-status/[YOUR_ADDRESS]`
5. Check the response - should show `verified: true`

If response shows `verified: false` but you've linked Twitter:

- Check backend logs in Railway
- Verify user exists in database
- Test direct backend API: `https://truecall-production.up.railway.app/api/users/twitter/verify-status/[YOUR_ADDRESS]`

### Issue: Twitter OAuth redirect fails

**Cause**: Redirect URI mismatch

**Solution**:

1. Verify `NEXT_PUBLIC_TWITTER_REDIRECT_URI` in Netlify matches Twitter Developer Portal exactly
2. Both must be: `https://truecall.netlify.app/profile/twitter/callback`
3. Clear browser cache and try again

### Issue: API routes return 404

**Cause**: Environment variables not set or build cache issue

**Solution**:

1. Verify all 3 environment variables are set in Netlify
2. Trigger a **Clear cache and deploy** in Netlify
3. Wait for build to complete
4. Test API routes directly in browser

### Issue: Events not loading

**Cause**: Backend API URL incorrect or missing

**Solution**:

1. Check `NEXT_PUBLIC_API_URL` ends with `/api`
2. Test backend directly: `https://truecall-production.up.railway.app/api/creator-events`
3. Check browser console for CORS errors
4. Verify Railway backend is running (check Railway dashboard)

## Verification Checklist

- [ ] All 3 environment variables set in Netlify
- [ ] Environment variables include `/api` suffix for backend URL
- [ ] Twitter redirect URI matches Netlify domain (not localhost)
- [ ] Twitter Developer Portal callback URI updated
- [ ] Site redeployed after setting variables
- [ ] API routes return valid JSON (test in browser)
- [ ] Twitter OAuth completes successfully
- [ ] Verification status displays correctly on creator-events page
- [ ] Backend Railway service is running

## Quick Test Commands

Test backend directly:

```bash
curl https://truecall-production.up.railway.app/api/creator-events
```

Test Netlify API proxy:

```bash
curl https://truecall.netlify.app/api/creator-events
```

Test verification status (replace address):

```bash
curl https://truecall.netlify.app/api/users/twitter/verify-status/0xYOUR_ADDRESS
```

## Contact & Support

If issues persist after following this guide:

1. Check Railway logs for backend errors
2. Check Netlify function logs for frontend API errors
3. Check browser console for JavaScript errors
4. Verify wallet address is correct and linked in database

---

**Last Updated**: Context transfer session
**Backend**: Railway (PostgreSQL + NestJS)
**Frontend**: Netlify (Next.js 15)
**Database**: TypeORM with auto-sync enabled

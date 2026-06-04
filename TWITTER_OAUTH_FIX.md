# Fix Twitter OAuth "Something went wrong" Error

## Error Description

You're seeing: "Something went wrong - You weren't able to give access to the App"

This typically means Twitter is rejecting the OAuth authorization request.

## Root Causes & Solutions

### 1. ✅ Check Redirect URI in Twitter Developer Portal

**Problem:** Redirect URI mismatch is the #1 cause of this error.

**Fix:**

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Navigate to your app → **App settings** → **User authentication settings**
3. Click **Edit** on User authentication settings
4. Under **OAuth 2.0 settings**, verify these exact values:

```
Redirect URI: http://localhost:3000/profile/twitter/callback
```

**Important:**

- NO trailing slash
- Must be EXACTLY the same (case-sensitive)
- Check for extra spaces or characters
- For localhost development, use `http://` not `https://`

### 2. ✅ Verify App Type

**Problem:** Your app needs to support OAuth 2.0 with PKCE.

**Fix:**

1. In Twitter Developer Portal → Your App → **User authentication settings**
2. Ensure **OAuth 2.0** is enabled
3. App permissions should be: **Read**
4. Type of App: **Web App, Automated App or Bot**

### 3. ✅ Check OAuth 2.0 Settings

**Required Settings:**

```
Type of App: Web App, Automated App or Bot
App permissions: Read
Callback URI / Redirect URL: http://localhost:3000/profile/twitter/callback
Website URL: http://localhost:3000 (or your actual domain)
```

### 4. ✅ Regenerate Client Secret (if needed)

If you've made changes to your app settings:

1. Go to **Keys and tokens** tab
2. Regenerate **Client Secret** (OAuth 2.0)
3. Update your backend `.env` file with the new secret:

```bash
TWITTER_CLIENT_SECRET=<new_secret_here>
```

### 5. ✅ Verify Environment Variables Match

**Backend** (`backend/.env`):

```env
TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
TWITTER_CLIENT_SECRET=ILJz43XueQPaASnDygRaHns5VmAV78FtbvVlwa_W7WkYkUsuj1
TWITTER_REDIRECT_URI=http://localhost:3000/profile/twitter/callback
```

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/profile/twitter/callback
```

### 6. ✅ Common Twitter Developer Portal Mistakes

❌ **Wrong:**

- `http://localhost:3000/profile/twitter/callback/` (trailing slash)
- `https://localhost:3000/profile/twitter/callback` (using https for localhost)
- `http://127.0.0.1:3000/profile/twitter/callback` (using 127.0.0.1 instead of localhost)

✅ **Correct:**

- `http://localhost:3000/profile/twitter/callback`

### 7. ✅ Test with Debug Logging

Your code already has debug logging. Check the browser console when clicking "Link with Twitter OAuth":

```
🐦 Twitter auth URL: https://twitter.com/i/oauth2/authorize?...
🔑 Client ID: ZGFtYj...
🔗 Redirect URI: http://localhost:3000/profile/twitter/callback
```

Compare the `redirect_uri` parameter in the auth URL with what's in Twitter Developer Portal.

## Step-by-Step Verification

### Step 1: Double-check Twitter Developer Portal

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your app
3. Click **Settings** → **User authentication settings** → **Edit**
4. Verify OAuth 2.0 is enabled
5. Verify Redirect URI is **exactly**: `http://localhost:3000/profile/twitter/callback`
6. Save changes (if any)

### Step 2: Restart Backend Server

```bash
cd backend
# Kill existing process and restart
pnpm start:dev
```

### Step 3: Restart Frontend Server

```bash
cd frontend
# Kill existing process and restart
pnpm dev
```

### Step 4: Clear Browser Data

1. Open DevTools (F12)
2. Go to **Application** tab
3. Clear **Session Storage** and **Local Storage**
4. Close and reopen the browser

### Step 5: Test Again

1. Navigate to http://localhost:3000/profile
2. Connect wallet
3. Click "Link with Twitter OAuth"
4. Check browser console for debug output
5. Verify redirect URI matches Twitter Developer Portal

## Still Not Working?

### Check Twitter API Access Level

Your app needs **Elevated** access for OAuth 2.0:

1. In Twitter Developer Portal → Your Project → **Settings**
2. Check your **Access Level**
3. If it's "Essential", you need to apply for **Elevated** access

### Verify OAuth 2.0 Client Type

In **User authentication settings**:

- OAuth 2.0 should be **enabled**
- Client type: **Public client** (for PKCE flow)

### Check Browser Console for Errors

Look for:

- Network errors when calling `/api/users/twitter/callback`
- CORS errors
- Redirect URI mismatches in the auth URL

### Test with Production URL

If you're deploying to production, update BOTH:

**Backend `.env`:**

```env
TWITTER_REDIRECT_URI=https://yourdomain.com/profile/twitter/callback
```

**Frontend `.env.local`:**

```env
NEXT_PUBLIC_TWITTER_REDIRECT_URI=https://yourdomain.com/profile/twitter/callback
```

**Twitter Developer Portal:**
Add the production callback URL:

```
https://yourdomain.com/profile/twitter/callback
```

## Quick Checklist

- [ ] Redirect URI in Twitter Portal matches exactly (no trailing slash)
- [ ] OAuth 2.0 is enabled in Twitter app settings
- [ ] Client ID and Secret are correct in backend `.env`
- [ ] Client ID matches in frontend `.env.local`
- [ ] Backend server restarted after env changes
- [ ] Frontend server restarted after env changes
- [ ] Browser session/local storage cleared
- [ ] No typos in environment variables
- [ ] App has "Read" permissions minimum
- [ ] Using `http://localhost:3000` not `https://` or `127.0.0.1`

## Most Common Fix

**90% of the time**, this is fixed by:

1. Going to Twitter Developer Portal
2. Editing User authentication settings
3. Ensuring Redirect URI is EXACTLY: `http://localhost:3000/profile/twitter/callback`
4. Saving the settings
5. Restarting both backend and frontend servers

The redirect URI must match **character-for-character** with what's sent in the OAuth request.

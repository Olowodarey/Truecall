# Twitter OAuth Setup for Multiple Domains

## Overview

The app now automatically detects its current domain and uses it for Twitter OAuth redirect. This allows it to work seamlessly on:

- ✅ Netlify (https://truecall.netlify.app)
- ✅ Vercel (https://truecall.vercel.app or your custom domain)
- ✅ Localhost (http://localhost:3000)

---

## Step 1: Add All Callback URLs to Twitter Developer Portal

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your app
3. Click **Settings** → **User authentication settings** (or **Edit** if already configured)
4. Scroll to **Callback URI / Redirect URL**
5. Add ALL of these URLs (click "+ Add another" for each):

```
https://truecall.netlify.app/profile/twitter/callback
https://truecall.vercel.app/profile/twitter/callback
http://localhost:3000/profile/twitter/callback
```

**Important Notes**:

- Add each URL on a NEW LINE by clicking the "+ Add another" button
- Do NOT include trailing slashes
- Do NOT include query parameters
- Twitter allows multiple callback URLs per app
- The app will automatically use the correct one based on where it's deployed

6. Scroll down and click **Save**

---

## Step 2: Verify Your Twitter App Settings

Make sure your Twitter app has these settings:

### App Type

- ✅ Type: **Web App, Automated App or Bot**

### OAuth 2.0 Settings

- ✅ OAuth 2.0 is enabled
- ✅ Type of App: **Web App**

### Callback URLs (as listed above)

```
✅ https://truecall.netlify.app/profile/twitter/callback
✅ https://truecall.vercel.app/profile/twitter/callback
✅ http://localhost:3000/profile/twitter/callback
```

### Website URL

```
https://truecall.netlify.app
```

### App Permissions

- ✅ Read permissions enabled (minimum required)

---

## Step 3: No Environment Variable Needed!

**The app now works without setting `NEXT_PUBLIC_TWITTER_REDIRECT_URI`!**

The code automatically uses `window.location.origin + '/profile/twitter/callback'`, so:

- On Netlify → Uses `https://truecall.netlify.app/profile/twitter/callback`
- On Vercel → Uses `https://truecall.vercel.app/profile/twitter/callback`
- On localhost → Uses `http://localhost:3000/profile/twitter/callback`

If you want to OVERRIDE this behavior, you can still set:

```
NEXT_PUBLIC_TWITTER_REDIRECT_URI=https://your-custom-domain.com/profile/twitter/callback
```

But it's **NOT required** anymore!

---

## Step 4: Deploy to Vercel (Optional)

If you want to deploy to Vercel:

### Option A: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Set **Root Directory**: `frontend`
5. Set **Build Command**: `pnpm run build`
6. Set **Install Command**: `pnpm install`
7. Add these environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://truecall-production.up.railway.app/api
   NEXT_PUBLIC_TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
   ```
8. Click **Deploy**

### Option B: Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

---

## Step 5: Testing

### Test on Netlify

1. Visit https://truecall.netlify.app/profile
2. Connect wallet
3. Click "Link with Twitter OAuth"
4. Authorize → Should redirect back successfully

### Test on Vercel

1. Visit https://truecall.vercel.app/profile (or your Vercel domain)
2. Connect wallet
3. Click "Link with Twitter OAuth"
4. Authorize → Should redirect back successfully

### Test Locally

1. Run `pnpm run dev` in the frontend folder
2. Visit http://localhost:3000/profile
3. Connect wallet
4. Click "Link with Twitter OAuth"
5. Authorize → Should redirect back successfully

---

## How It Works

### Automatic Domain Detection

```typescript
// In frontend/app/profile/page.tsx
const redirectUri =
  process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI || // Use env var if set
  `${window.location.origin}/profile/twitter/callback`; // Otherwise auto-detect
```

### Message Origin Validation

```typescript
// Accepts messages from any of our trusted domains
const isAllowedOrigin =
  event.origin === window.location.origin ||
  event.origin.includes("netlify.app") ||
  event.origin.includes("vercel.app") ||
  event.origin.includes("localhost");
```

---

## Troubleshooting

### Error: "redirect_uri did not match"

**Solution**: Make sure you added ALL three callback URLs in Twitter Developer Portal (Netlify, Vercel, localhost)

### Error: "App is not authorized"

**Solution**:

1. Check OAuth 2.0 is enabled in Twitter app settings
2. Verify app type is "Web App, Automated App or Bot"
3. Make sure callback URLs don't have trailing slashes

### Works locally but not on Netlify/Vercel

**Solution**:

1. Verify the production domain is added to Twitter callback URLs
2. Clear browser cache
3. Try in incognito mode
4. Check browser console for the actual redirect URI being used

### Popup gets blocked

**Solution**:

1. Allow popups for your domain in browser settings
2. Try clicking the button again (browser usually allows on second click)
3. Use manual Twitter link option (type @username) instead

---

## Environment Variables Summary

### Required (Both Netlify and Vercel)

```
NEXT_PUBLIC_API_URL=https://truecall-production.up.railway.app/api
NEXT_PUBLIC_TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
```

### Optional (Only if you want to override auto-detection)

```
NEXT_PUBLIC_TWITTER_REDIRECT_URI=https://your-custom-domain.com/profile/twitter/callback
```

---

## Checklist

- [ ] Added all 3 callback URLs in Twitter Developer Portal
- [ ] Verified OAuth 2.0 is enabled
- [ ] Deployed to Netlify (already done)
- [ ] (Optional) Deployed to Vercel
- [ ] Tested Twitter OAuth on production domain
- [ ] Verified users can link Twitter successfully
- [ ] Confirmed verification badge shows on creator-events page

---

Last Updated: After adding multi-domain support

# 🐦 CRITICAL: Twitter OAuth Configuration Update

## ⚠️ This MUST be done before your friends can test!

Your Twitter OAuth is currently configured for localhost. Once you deploy to Vercel, you need to update the redirect URI in Twitter Developer Portal.

---

## Current Configuration (Localhost)

```
Callback URI: http://localhost:3000/profile/twitter/callback
```

## New Configuration (Production)

```
Callback URI: https://your-vercel-app.vercel.app/profile/twitter/callback
```

---

## 📝 Step-by-Step Instructions

### Step 1: Get Your Vercel Frontend URL

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your TrueCall project
3. Copy the production URL (e.g., `truecall-abc123.vercel.app`)

### Step 2: Update Twitter Developer Portal

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your **TrueCall** application
3. Click on **App Settings** (gear icon)
4. Scroll down to **User authentication settings**
5. Click **Edit**

### Step 3: Update Callback URLs

In the **Callback URI / Redirect URL** section:

**Add your Vercel URL:**

```
https://your-vercel-app.vercel.app/profile/twitter/callback
```

**Keep localhost for local testing (optional):**

```
http://localhost:3000/profile/twitter/callback
```

You can have multiple callback URIs - one for production and one for local development.

### Step 4: Update Website URL

In the **Website URL** field, add your Vercel URL:

```
https://your-vercel-app.vercel.app
```

### Step 5: Save Changes

Click **Save** at the bottom of the page.

---

## 🔄 Update Railway Backend Environment Variable

After updating Twitter Developer Portal:

1. Go to your Railway backend service
2. Navigate to **Variables** tab
3. Update `TWITTER_REDIRECT_URI`:
   ```
   TWITTER_REDIRECT_URI=https://your-vercel-app.vercel.app/profile/twitter/callback
   ```
4. Save and redeploy if necessary

---

## ✅ Verification

Test the Twitter linking flow:

1. Visit your Vercel frontend
2. Connect wallet
3. Go to Profile page
4. Click "Link Twitter Account"
5. Complete Twitter OAuth flow
6. Should redirect back to your Vercel URL
7. Check if wallet is verified on the contract

---

## 🐛 Troubleshooting

### Error: "Callback URL mismatch"

- **Cause**: Twitter Developer Portal callback URI doesn't match the redirect URI in your backend
- **Solution**: Ensure both URLs are exactly the same (including https://)

### Error: "Invalid redirect_uri"

- **Cause**: The redirect URI in backend env doesn't match any approved URI in Twitter Developer Portal
- **Solution**: Double-check the `TWITTER_REDIRECT_URI` in Railway matches an approved URI

### Twitter OAuth works locally but not on Vercel

- **Cause**: Forgot to update Twitter Developer Portal
- **Solution**: Add Vercel callback URI to Twitter Developer Portal

---

## 📋 Quick Checklist

- [ ] Get Vercel production URL
- [ ] Update Twitter Developer Portal callback URI
- [ ] Update Twitter Developer Portal website URL
- [ ] Update Railway `TWITTER_REDIRECT_URI` environment variable
- [ ] Redeploy backend on Railway (if needed)
- [ ] Test Twitter linking on production

---

## Example Configuration

### Twitter Developer Portal

```
App name: TrueCall
Callback URIs:
  - https://truecall-frontend.vercel.app/profile/twitter/callback
  - http://localhost:3000/profile/twitter/callback (optional)

Website URL: https://truecall-frontend.vercel.app
```

### Railway Backend Environment

```
TWITTER_REDIRECT_URI=https://truecall-frontend.vercel.app/profile/twitter/callback
```

### Vercel Frontend (automatically uses the same URL)

Your frontend dynamically constructs the redirect URI based on the current domain.

---

**Don't skip this step! Without updating Twitter OAuth, your friends won't be able to link their accounts! 🚨**

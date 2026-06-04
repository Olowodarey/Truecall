# Fix: Twitter "Something went wrong" Error

## The Real Problem

The "Something went wrong. Please try again." error is NOT about being logged in. It's about **incorrect Twitter App configuration** in your Twitter Developer Portal.

## Solution: Fix Your Twitter App Settings

### Step 1: Go to Twitter Developer Portal

1. Visit: https://developer.twitter.com/en/portal/dashboard
2. Click on your app "TrueCall"
3. Click "Settings"

### Step 2: Check "App Type"

**CRITICAL**: Your app type MUST be set to:

- ✅ **"Web App, Automated App or Bot"**
- ❌ NOT "Native App"

If it says "Native App":

1. You may need to recreate the app as a "Web App"
2. Or contact Twitter support to change the type

### Step 3: Enable OAuth 2.0

1. In your app settings, find **"OAuth 2.0 settings"**
2. Make sure **"OAuth 2.0" is ENABLED** (toggle should be ON)
3. Set **"Type of App"** to **"Web App, Automated App or Bot"**

### Step 4: Check App Permissions

1. Go to **"User authentication settings"**
2. Click **"Set up"** or **"Edit"**
3. Select **"OAuth 2.0"**
4. Permissions: **"Read"** (you can add Write later if needed)
5. Type: **"Web App, Automated App or Bot"**

### Step 5: Verify Callback URLs

Make sure these are set correctly:

**Callback URLs:**

```
http://127.0.0.1:3000/profile/twitter/callback
```

**Website URL:**

```
http://127.0.0.1:3000
```

**Terms of Service:**

```
http://127.0.0.1:3000/terms
```

**Privacy Policy:**

```
http://127.0.0.1:3000/privacy
```

### Step 6: Save and Wait

1. Click **"Save"**
2. Wait 2-3 minutes for Twitter to update
3. Try the OAuth flow again

## Common Causes of "Something went wrong"

| Issue                     | Fix                                                                    |
| ------------------------- | ---------------------------------------------------------------------- |
| App type is "Native App"  | Change to "Web App" type                                               |
| OAuth 2.0 not enabled     | Enable in settings                                                     |
| Callback URL mismatch     | Must match exactly with http://127.0.0.1:3000/profile/twitter/callback |
| App not approved          | Some apps need Twitter review                                          |
| Client ID/Secret wrong    | Regenerate and update .env                                             |
| Using wrong OAuth version | Must use OAuth 2.0 (not 1.0a)                                          |

## Alternative: Manual Twitter Linking (For Testing)

While you fix the OAuth settings, use the manual API endpoint:

### Test with curl:

```bash
curl -X POST http://localhost:3001/users/twitter/link \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xc232b9Fa...9c44f4D3",
    "twitterHandle": "Dareyolowo",
    "twitterId": "test_123"
  }'
```

Replace:

- `address` with your wallet address
- `twitterHandle` with your Twitter username (without @)
- `twitterId` with any unique ID

### Test in browser console:

1. Open http://127.0.0.1:3000/profile
2. Press F12 (open developer console)
3. Paste this:

```javascript
fetch("http://localhost:3001/users/twitter/link", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    address: "0xc232b9Fa...your_address",
    twitterHandle: "Dareyolowo",
    twitterId: "manual_" + Date.now(),
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

4. Refresh the page
5. Your Twitter should now be linked!

## Regenerate Twitter App Credentials

If nothing works, try regenerating:

1. Go to Twitter Developer Portal
2. Find your app "TrueCall"
3. Go to **"Keys and tokens"**
4. Click **"Regenerate"** for Client ID and Client Secret
5. Copy the NEW credentials
6. Update `/backend/.env`:

```env
TWITTER_CLIENT_ID=new_client_id_here
TWITTER_CLIENT_SECRET=new_client_secret_here
```

7. Restart backend: `npm run start:dev`

## Debug Steps

### 1. Check Backend Logs

When you try to link Twitter, watch your backend terminal. You should see:

- OAuth request being made
- Twitter API response
- Any error messages from Twitter

### 2. Check Browser Console

Press F12 in the popup window and look for:

- Network errors
- JavaScript errors
- Failed requests

### 3. Test OAuth URL Directly

Copy this URL (replace CLIENT_ID with yours):

```
https://twitter.com/i/oauth2/authorize?response_type=code&client_id=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ&redirect_uri=http://127.0.0.1:3000/profile/twitter/callback&scope=tweet.read%20users.read%20offline.access&state=test123&code_challenge=test_challenge&code_challenge_method=plain
```

Paste it in your browser. If you see an error immediately (before login), the app configuration is wrong.

## Expected Behavior (When Working)

1. Click "Link Twitter Account"
2. Popup opens
3. Twitter login page (if not logged in)
4. **Authorization page** asking "Authorize TrueCall?"
5. Click "Authorize app"
6. Redirect to callback
7. Success!

If you're stuck at step 3-4 with "Something went wrong", it's the app configuration.

## Need Help?

Check your Twitter app settings match these:

- ✅ OAuth 2.0 enabled
- ✅ Type: Web App, Automated App or Bot
- ✅ Callback URL: http://127.0.0.1:3000/profile/twitter/callback
- ✅ Permissions: Read
- ✅ Client ID and Secret copied correctly to .env

---

**For now, use the manual linking method above to test the rest of your app!**

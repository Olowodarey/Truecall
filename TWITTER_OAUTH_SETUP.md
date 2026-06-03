# Twitter OAuth 2.0 Setup Guide

This guide will help you get Twitter OAuth credentials to enable real Twitter verification in production.

---

## Step 1: Create a Twitter Developer Account

### 1.1 Sign Up for Twitter Developer Account

1. **Go to Twitter Developer Portal**
   - Visit: https://developer.twitter.com/en/portal/dashboard
2. **Sign in with your Twitter account**
   - Use your main Twitter account (recommended to use your business/project account)
3. **Apply for Developer Access**
   - Click "Sign up for Free Account"
   - Choose **"Hobbyist"** → **"Exploring the API"** (or choose based on your use case)
4. **Fill in the Application Form**
   - **What country do you live in?** Select your country
   - **What's your use case?** Explain your prediction platform

   Example description:

   ```
   I'm building a blockchain-based sports prediction platform called TrueCall
   where users can make predictions on match outcomes. We need Twitter OAuth
   to verify user identities and display their Twitter handles when they win
   predictions. This helps creators verify that winners are real people and
   builds trust in our community. We will only access public profile information
   (username, ID, and profile picture) with user consent.
   ```

5. **Review and Accept Terms**
   - Read the Developer Agreement
   - Accept Terms of Service
   - Click "Submit"

6. **Verify Your Email**
   - Check your email inbox
   - Click the verification link
   - Your developer account is now active! ✅

---

## Step 2: Create a Twitter App

### 2.1 Create New Project & App

1. **Go to Projects & Apps**
   - URL: https://developer.twitter.com/en/portal/projects-and-apps
   - Click "**+ Create App**" or "**+ Create Project**"

2. **Create Project** (if required)
   - **Project Name**: `TrueCall` or your app name
   - **Use Case**: Select "**Making a bot**" or "**Student**" (depending on your tier)
   - Click "Next"

3. **Create App**
   - **App Name**: `TrueCall` (must be unique across Twitter)
   - If taken, try: `TrueCall-Predictions`, `TrueCall-Platform`, etc.
   - Click "Next" → "Complete"

4. **Save API Keys (Optional - not needed for OAuth 2.0)**
   - You'll see API Key and API Secret
   - You can skip these for now (we only need OAuth 2.0 credentials)
   - Click "Dashboard" or "App settings"

---

## Step 3: Enable OAuth 2.0

### 3.1 Configure OAuth 2.0 Settings

1. **Go to Your App Settings**
   - Click on your app name in the dashboard
   - Navigate to the "**Settings**" tab

2. **Scroll to "User authentication settings"**
   - Click "**Set up**" button

3. **Enable OAuth 2.0**
   - Turn ON "**OAuth 2.0**"
   - **Type of App**: Select "**Web App, Automated App or Bot**"

4. **Configure App Info**

   **App permissions:**
   - ✅ **Read** (we only need to read public profile)
   - ❌ Write (not needed)
   - ❌ Direct Messages (not needed)

   **Callback URI / Redirect URL:**

   For **local development**:

   ```
   http://localhost:3000/profile/twitter/callback
   ```

   For **production** (replace with your domain):

   ```
   https://yourdomain.com/profile/twitter/callback
   https://www.yourdomain.com/profile/twitter/callback
   ```

   💡 **Tip**: You can add multiple callback URLs (one per line). Add both localhost and production URLs.

   **Website URL:**

   ```
   https://yourdomain.com
   ```

   Or for testing:

   ```
   http://localhost:3000
   ```

5. **Fill in Additional Information**

   **Organization name**: `TrueCall` (or your company name)

   **Organization website**:

   ```
   https://yourdomain.com
   ```

   **Terms of Service URL**:

   ```
   https://yourdomain.com/terms
   ```

   **Privacy Policy URL**:

   ```
   https://yourdomain.com/privacy
   ```

   💡 **Note**: For development, you can use placeholder URLs. For production, you MUST have real terms and privacy policy pages.

6. **Save Configuration**
   - Click "**Save**" at the bottom
   - Twitter will show you the OAuth 2.0 credentials

---

## Step 4: Get Your OAuth 2.0 Credentials

### 4.1 Copy Client ID and Client Secret

After saving, Twitter will display:

```
✅ OAuth 2.0 is enabled

Client ID:
RXhhbXBsZUNsaWVudElE...

Client Secret:
eW91cl9jbGllbnRfc2VjcmV0X2hlcmU...
```

### 4.2 Copy These Values

**IMPORTANT**:

- ⚠️ Copy the **Client Secret** immediately - you can only see it once!
- If you lose it, you'll need to regenerate a new one
- The **Client ID** can always be viewed later

---

## Step 5: Add Credentials to Your Backend

### 5.1 Update Backend .env File

Open `/backend/.env` and add:

```env
# Twitter OAuth 2.0
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
TWITTER_REDIRECT_URI=http://localhost:3000/profile/twitter/callback
```

**Example** (with real-looking values):

```env
TWITTER_CLIENT_ID=RXhhbXBsZUNsaWVudElEMTIzNDU2Nzg5MA
TWITTER_CLIENT_SECRET=eW91cl9jbGllbnRfc2VjcmV0X2hlcmVfZG9udF9zaGFyZQ
TWITTER_REDIRECT_URI=http://localhost:3000/profile/twitter/callback
```

### 5.2 For Production Deployment

When deploying to production, update:

```env
TWITTER_REDIRECT_URI=https://yourdomain.com/profile/twitter/callback
```

Make sure this EXACTLY matches one of the URLs you added in Twitter's callback settings!

---

## Step 6: Update Frontend for OAuth Flow

### 6.1 Create Twitter OAuth Button Component

You need to implement the OAuth flow in the frontend. The backend is already ready!

**What needs to be updated:**

In `/frontend/app/profile/page.tsx`, replace the manual test function with real OAuth:

```typescript
const handleLinkTwitter = () => {
  // Generate PKCE challenge (for security)
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store verifier in session
  sessionStorage.setItem("twitter_verifier", codeVerifier);

  // Redirect to Twitter OAuth
  const params = new URLSearchParams({
    response_type: "code",
    client_id: "YOUR_CLIENT_ID", // Get from env
    redirect_uri: "http://localhost:3000/profile/twitter/callback",
    scope: "tweet.read users.read",
    state: "random_state_string",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  window.location.href = `https://twitter.com/i/oauth2/authorize?${params}`;
};
```

### 6.2 Create Callback Page

Create `/frontend/app/profile/twitter/callback/page.tsx` to handle the OAuth response:

```typescript
// When Twitter redirects back, extract the code and send to backend
const code = searchParams.get("code");
const response = await fetch("http://localhost:3001/users/twitter/callback", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ address, code }),
});
```

**Note**: I can implement this for you if needed! For now, the manual testing method works perfectly.

---

## Step 7: Test the Integration

### 7.1 Test Locally

1. **Start your backend**:

   ```bash
   cd backend
   pnpm start
   ```

2. **For now, use manual linking** (no Twitter app needed yet):

   ```bash
   ./LINK_TWITTER_TEST.sh 0xYourAddress YourTwitterHandle
   ```

3. **When ready for OAuth**, users will:
   - Click "Link Twitter"
   - Get redirected to Twitter
   - Authorize your app
   - Get redirected back
   - Twitter automatically linked!

### 7.2 Test the Winners Display

1. Create an event
2. Add a match (next 10 mins)
3. Join with Twitter-linked account
4. Make prediction
5. Wait for result
6. View winners → See Twitter handle! 🎉

---

## Step 8: Production Deployment Checklist

Before going live, ensure:

- [ ] Twitter app has production callback URL added
- [ ] Backend .env has production TWITTER_REDIRECT_URI
- [ ] You have Terms of Service page at `/terms`
- [ ] You have Privacy Policy page at `/privacy`
- [ ] Privacy policy mentions Twitter data usage
- [ ] Frontend implements full OAuth flow (not manual entry)

---

## Troubleshooting

### Issue: "Callback URL not approved for this client"

**Solution**: Make sure the redirect_uri in your code EXACTLY matches one in Twitter app settings (including http:// or https://).

### Issue: "Invalid client credentials"

**Solution**: Double-check TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in .env file.

### Issue: "App is suspended"

**Solution**: Contact Twitter developer support. Usually happens if Terms/Privacy pages are missing.

### Issue: "User denied authorization"

**Solution**: This is normal - user chose not to link Twitter. Handle gracefully in UI.

---

## Important Notes

### Data Privacy & Compliance

When using Twitter OAuth, you MUST:

1. **Have a Privacy Policy** explaining:
   - You collect Twitter username, ID, and profile picture
   - Data is only displayed when user wins predictions
   - Data is stored securely
   - User can unlink anytime

2. **Have Terms of Service** explaining:
   - How Twitter verification is used
   - User rights and responsibilities

3. **Comply with Twitter's Developer Policy**:
   - Don't misuse user data
   - Don't store tweets or DMs
   - Respect user privacy

### Twitter API Tiers

**Free Tier** (Sufficient for your use case):

- ✅ OAuth 2.0 authentication
- ✅ Read user profile
- ✅ Up to 10,000 requests/month
- ✅ Perfect for user verification

---

## Summary of URLs You Need

Replace `yourdomain.com` with your actual domain:

| Purpose             | URL                                               |
| ------------------- | ------------------------------------------------- |
| Callback URL (dev)  | `http://localhost:3000/profile/twitter/callback`  |
| Callback URL (prod) | `https://yourdomain.com/profile/twitter/callback` |
| Website URL         | `https://yourdomain.com`                          |
| Terms of Service    | `https://yourdomain.com/terms`                    |
| Privacy Policy      | `https://yourdomain.com/privacy`                  |

---

## Next Steps

1. **For Testing Now**: Use the manual linking (already working!)

   ```bash
   ./LINK_TWITTER_TEST.sh 0xAddress TwitterHandle
   ```

2. **For Production Later**:
   - Get Twitter OAuth credentials (follow steps above)
   - Add to backend .env
   - I can implement the full OAuth flow in frontend

**Current Status**: ✅ Backend is 100% OAuth-ready, just needs credentials!

---

Need help with any step? Let me know! 🚀

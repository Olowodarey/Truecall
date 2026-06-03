# Quick Start: Twitter OAuth (5 Minutes)

## For Testing RIGHT NOW (No Twitter App Needed)

You can test the Twitter verification feature immediately without OAuth credentials:

```bash
# Start backend
cd backend && pnpm start

# In another terminal, link Twitter accounts
./LINK_TWITTER_TEST.sh 0xYourWalletAddress YourTwitterHandle

# Example:
./LINK_TWITTER_TEST.sh 0xDE802A020DA18B561e5203a3585DCb66d313e7b3 john_crypto
```

That's it! Now when this wallet wins, it will show `@john_crypto` instead of `0xDE80...e7b3` ✨

---

## For Production (Get Twitter OAuth Credentials)

### Step 1: Go to Twitter Developer Portal

👉 **https://developer.twitter.com/en/portal/dashboard**

### Step 2: Create Account & App

1. Sign up for free developer account
2. Create a new app (name it "TrueCall" or similar)
3. Go to app Settings → User authentication settings

### Step 3: Enable OAuth 2.0

- Type: **Web App**
- Permissions: **Read only**
- Callback URL: `http://localhost:3000/profile/twitter/callback`
- Website: `http://localhost:3000`

### Step 4: Copy Credentials

You'll see:

```
Client ID: RXhhbXBsZUNsaWVudElE...
Client Secret: eW91cl9jbGllbnRfc2Vj...  [⚠️ SAVE THIS NOW!]
```

### Step 5: Add to Backend

Edit `/backend/.env`:

```env
TWITTER_CLIENT_ID=paste_client_id_here
TWITTER_CLIENT_SECRET=paste_client_secret_here
TWITTER_REDIRECT_URI=http://localhost:3000/profile/twitter/callback
```

### Step 6: Restart Backend

```bash
cd backend
pnpm start
```

---

## What Happens When Users Link Twitter

### Current (Manual Testing):

1. User goes to `/profile`
2. Clicks "Link Twitter Account"
3. Enters Twitter handle
4. Done! ✅

### With OAuth (Production):

1. User goes to `/profile`
2. Clicks "Link Twitter Account"
3. Redirected to Twitter.com
4. Authorizes your app
5. Redirected back
6. Done! ✅

---

## Where Twitter Handles Appear

### Winners Modal

When a match is verified:

- Click "🏆 View Winners"
- Winners with Twitter show:
  ```
  🥇 [avatar] @john_crypto ✓
     Predicted 2 hours ago
  ```
- Winners without Twitter show:
  ```
  🥈 0x1234...5678
     Predicted 3 hours ago
  ```

### Benefits

- **Creators** can verify winners are real people
- **Winners** build reputation in the community
- **Everyone** sees a more authentic platform

---

## Testing the Full Flow

```bash
# Terminal 1: Backend
cd backend && pnpm start

# Terminal 2: Frontend
cd frontend && pnpm run dev

# Terminal 3: Link Twitter
./LINK_TWITTER_TEST.sh 0xYourAddress YourTwitter
```

Then:

1. Go to http://localhost:3000
2. Create event
3. Add match (next 10 mins)
4. Join with linked wallet
5. Make prediction
6. Wait for AI agent to submit result
7. View winners → See your Twitter! 🎉

---

## Quick Commands Reference

```bash
# Link Twitter (manual testing)
./LINK_TWITTER_TEST.sh <address> <twitter_handle>

# Check if linked
curl http://localhost:3001/users/profile/<address>

# Unlink Twitter
curl -X POST http://localhost:3001/users/twitter/unlink \
  -H "Content-Type: application/json" \
  -d '{"address":"<address>"}'

# View all profiles
cat backend/src/data/users.json
```

---

## Need the Full Guide?

See **TWITTER_OAUTH_SETUP.md** for:

- Detailed Twitter Developer Portal walkthrough
- Production deployment checklist
- Privacy policy requirements
- Troubleshooting guide
- OAuth 2.0 implementation details

---

## Current Status

✅ Backend API ready  
✅ Frontend UI complete  
✅ Manual testing working  
✅ Winner display implemented  
✅ OAuth code ready (just needs credentials)  
⏳ Twitter OAuth credentials (optional for testing)

**You can test everything RIGHT NOW using manual linking!** 🚀

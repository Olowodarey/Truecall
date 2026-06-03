# Twitter Verification Feature

## Overview

Winners are now displayed with their **Twitter handles** instead of just wallet addresses. This makes the platform more authentic and helps creators verify participants are real people.

## How It Works

### 1. **User Profile Page** (`/profile`)

- Users connect their wallet
- Click "Link Twitter Account"
- For testing: Enter Twitter handle manually
- For production: Full OAuth 2.0 integration ready

### 2. **Backend Storage** (`/backend/src/users/`)

- User profiles stored in `data/users.json`
- Tracks: wallet address, Twitter handle, Twitter ID, avatar, verification timestamp
- UsersService manages profile data
- UsersController handles API endpoints

### 3. **Winner Display** (Event Details Page)

- When match is verified, winners are enriched with Twitter data
- Shows Twitter avatar + handle for verified users
- Shows wallet address for non-verified users
- Green checkmark (✓) indicates Twitter verification

## API Endpoints

### Get User Profile

```
GET /users/profile/:address
```

Returns Twitter handle and avatar for a wallet address.

### Get Multiple Profiles

```
GET /users/profiles?addresses=0x123,0x456
```

Batch endpoint to enrich winner lists.

### Link Twitter (Manual - for testing)

```
POST /users/twitter/link
Body: { address, twitterHandle, twitterId? }
```

### Link Twitter (OAuth - production)

```
POST /users/twitter/callback
Body: { address, code }
```

Exchanges OAuth code for access token, fetches Twitter profile, links to wallet.

### Unlink Twitter

```
POST /users/twitter/unlink
Body: { address }
```

## Frontend Components

### Profile Page (`/app/profile/page.tsx`)

- Shows current Twitter verification status
- Link/unlink Twitter functionality
- Avatar display (Twitter avatar or generated)
- Explanation of why linking Twitter is beneficial

### Event Details - Winners Modal

- Displays Twitter avatar (8x8 rounded)
- Shows `@twitterHandle` in blue with green checkmark
- Falls back to wallet address if no Twitter linked
- Sorts by submission time (earliest first)
- Medal icons for top 3 positions

### Header

- Profile icon links to `/profile`
- Easy access to verify Twitter account

## Setup Instructions

### Backend Environment Variables

Add to `/backend/.env`:

```env
# Twitter OAuth (for production)
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_REDIRECT_URI=http://localhost:3000/profile/twitter/callback
```

To get Twitter OAuth credentials:

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new app
3. Enable OAuth 2.0
4. Set callback URL to `http://localhost:3000/profile/twitter/callback`
5. Copy Client ID and Client Secret

### Testing (No Twitter OAuth Needed)

For now, use the manual link endpoint:

```bash
curl -X POST http://localhost:3001/users/twitter/link \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xYourWalletAddress",
    "twitterHandle": "YourTwitterHandle"
  }'
```

Or use the Profile page UI which calls this endpoint.

## User Flow

### First Time Setup

1. User visits `/profile`
2. Connects wallet
3. Sees "Not Verified" status
4. Clicks "Link Twitter Account"
5. **(Testing)** Enters Twitter handle in prompt
6. **(Production)** Redirected to Twitter OAuth
7. Twitter linked - shows "Verified" with green checkmark

### Making Predictions

- User joins an event
- Makes predictions on matches
- If they win, their Twitter handle is displayed to everyone

### Viewing Winners

- Creator or any participant views winners
- Winners with Twitter show: avatar + @handle ✓
- Winners without Twitter show: 0x1234…5678
- Creator can verify legitimacy by checking Twitter profiles

## Benefits

### For Creators

✅ Verify winners are real people  
✅ Check Twitter profiles for legitimacy  
✅ Build trust with authentic participants  
✅ Reduce fraud and fake accounts

### For Participants

✅ Build reputation in the community  
✅ Show authenticity when winning  
✅ One-time setup, permanent verification  
✅ Optional - can still play without Twitter

## Data Storage

### File Location

`/backend/data/users.json`

### Example Entry

```json
{
  "address": "0xDE802A020DA18B561e5203a3585DCb66d313e7b3",
  "twitterHandle": "john_crypto",
  "twitterId": "123456789",
  "twitterAvatar": "https://pbs.twimg.com/profile_images/...",
  "verifiedAt": 1738502400000
}
```

### Data Privacy

- Twitter data only shown when user wins
- Not publicly accessible otherwise
- User can unlink anytime
- No sensitive Twitter data stored (only public profile info)

## Production OAuth Implementation

The backend is **ready for production Twitter OAuth**. Just add credentials and it will:

1. Generate OAuth URL with PKCE challenge
2. Redirect user to Twitter authorization
3. Exchange authorization code for access token
4. Fetch user profile from Twitter API v2
5. Store Twitter handle + avatar + ID
6. Link to wallet address

### Current Implementation Status

✅ Backend API ready  
✅ Database storage ready  
✅ Winner enrichment working  
✅ Frontend UI complete  
✅ Manual testing endpoint working  
⏳ Twitter OAuth credentials needed (production only)

## Testing the Feature

### Step 1: Link Twitter

```bash
# Terminal 1: Start backend
cd backend
pnpm start

# Terminal 2: Link a test account
curl -X POST http://localhost:3001/users/twitter/link \
  -H "Content-Type: application/json" \
  -d '{"address":"0xYourAddress","twitterHandle":"testuser"}'
```

### Step 2: Make Predictions & Win

1. Create an event
2. Add a match (next 10 minutes)
3. Join event with linked address
4. Make prediction
5. Wait for AI agent to submit result
6. View winners - see Twitter handle!

### Step 3: View Winners Modal

- Click "🏆 View Winners" on verified match
- See Twitter handle with blue styling + checkmark
- Compare with non-verified addresses (shows 0x...)

## Future Enhancements

- [ ] Twitter profile links (click handle to open Twitter)
- [ ] Show follower count for trust indication
- [ ] Cache Twitter avatars locally
- [ ] Support other social platforms (Discord, Telegram)
- [ ] Leaderboard with Twitter handles
- [ ] Social sharing of wins

---

**Ready to test!** Link your Twitter in `/profile` and start winning with credibility 🏆

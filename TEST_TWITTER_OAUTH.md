# Testing Twitter OAuth - Step by Step

## What I Fixed

The error "Something went wrong. Please try again" on Twitter's login page was happening because:

1. **Problem**: We were using a hardcoded `code_challenge=challenge` which Twitter rejected
2. **Solution**: Now we generate a proper random code verifier (64 characters) and send it through the full OAuth flow

## Changes Made

### Frontend (`/frontend/app/profile/page.tsx`)

- Generate a random 64-character code verifier
- Store it in sessionStorage
- Send it as the code_challenge to Twitter

### Callback Page (`/frontend/app/profile/twitter/callback/page.tsx`)

- Retrieve the code verifier from sessionStorage
- Send it to backend along with the authorization code

### Backend (`/backend/src/users/users.controller.ts`)

- Accept codeVerifier from frontend
- Use it when exchanging code for access token with Twitter

## How to Test (Fresh Start)

### Step 1: Restart Backend

```bash
cd backend
npm run start:dev
```

Backend should be running on http://localhost:3001

### Step 2: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend should be running on http://127.0.0.1:3000

### Step 3: Test the Flow

1. **Open your browser** → http://127.0.0.1:3000/profile
2. **Connect your wallet** (if not already connected)
3. **Click "Link Twitter Account"** button
4. **You'll be redirected to Twitter**
   - This time it should work properly!
   - Twitter will ask you to authorize the "TrueCall" app
   - You should see a screen saying "Authorize app to access your account?"
5. **Click "Authorize app"**
6. **You'll be redirected back** to http://127.0.0.1:3000/profile/twitter/callback
7. **Success message** should appear with your Twitter handle
8. **Automatically redirected** back to your profile page
9. **Your profile now shows** your Twitter handle with a verification checkmark ✓

## What You Should See at Each Step

### On Twitter Authorization Page:

```
Authorize TrueCall to access your account?
☑ Read Tweets from your timeline
☑ See accounts you follow and that follow you

[Authorize app] [Cancel]
```

### After Authorization:

```
✅ Success!
Successfully linked @YourTwitterHandle!
Redirecting to your profile...
```

### On Profile Page:

- Your Twitter avatar
- @YourTwitterHandle with a green checkmark
- "Verified" status in green box

## Common Issues

### If Twitter still shows error:

1. Clear your browser cache and sessionStorage
2. Try in an incognito/private window
3. Make sure you're logged into Twitter/X

### If callback fails:

Check browser console (F12) for errors - there will be detailed error messages

### If backend returns error:

Check backend terminal - it logs all Twitter API responses

## Testing Winner Display

After linking Twitter:

1. Go to any match: http://127.0.0.1:3000/creator-events/[matchId]
2. View winners
3. Your Twitter handle and avatar should show up if you're a winner

## Next Steps

Once this works:

- Test with multiple wallet addresses
- Verify unlinking works
- Test winner display with Twitter avatars
- Make sure it works after page refresh

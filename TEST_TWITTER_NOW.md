# Test Twitter OAuth Now - Quick Guide 🚀

## ✅ Fix Applied

Changed from `sessionStorage` → `localStorage` to fix popup window state sharing.

## Quick Test Steps

### 1. Restart Frontend (Important!)

```bash
# Kill the current frontend process (Ctrl+C)
cd frontend
pnpm dev
```

### 2. Clear Browser Storage

1. Open http://localhost:3000/profile
2. Press **F12** to open DevTools
3. Go to **Application** tab
4. Under **Storage**:
   - **Local Storage** → Right-click → Clear
   - **Session Storage** → Right-click → Clear
5. Close DevTools or keep open to watch logs

### 3. Test the Flow

1. **Connect Wallet** on the profile page
2. Click **"Link with Twitter OAuth"** button
3. **Check Console** - you should see:
   ```
   🐦 Twitter OAuth Flow Starting:
      Auth URL: https://twitter.com/i/oauth2/authorize?...
      State: <random-string>
      Stored in localStorage: { state: "...", address: "0x...", ... }
   ```
4. **Popup opens** → Twitter authorization page
5. Click **"Authorize app"**
6. **Callback page** should load and show:
   - "Linking your Twitter account..." (brief loading)
   - "Successfully linked @YourHandle!" (success)
   - Window closes automatically

### 4. Verify Success

Back on the profile page, you should see:

- ✅ Your Twitter avatar
- ✅ Twitter handle displayed
- ✅ "Verified" badge
- ✅ Option to "Unlink Twitter"

## Debugging

### If you still see "Security validation failed"

**Check the callback console:**

1. When popup opens, right-click in popup → Inspect
2. Look for this log:

   ```
   🔍 State validation: {
     receivedState: "abc123...",
     storedState: "abc123...",
     match: true  // ← Should be true!
   }
   ```

3. If `match: false`:
   - Clear localStorage again
   - Make sure frontend was restarted
   - Try in incognito mode

### Check Backend Logs

In your backend terminal, watch for:

```
[UsersController] Debugging Twitter OAuth: ClientID=ZGFtY..., RedirectURI=http://localhost:3000/profile/twitter/callback
[UsersController] Exchanging code for tokens...
[UsersController] Tokens received successfully: { access_token: "...", ... }
[UsersController] Fetching user info from X...
[UsersController] Twitter linked via XDK: @YourHandle → 0x...
```

## Common Issues

### 🔴 Popup Blocked

**Fix:** Allow popups for localhost in browser settings

### 🔴 "Missing code verifier"

**Fix:** Clear localStorage and try again

### 🔴 Twitter shows old error page

**Fix:** Verify Twitter Developer Portal redirect URI is correct

### 🔴 Backend error "Failed to fetch Twitter profile"

**Fix:** Check Twitter API credentials in `backend/.env`

## Expected Console Output

### Parent Window (Profile Page):

```
🐦 Twitter OAuth Flow Starting:
   Auth URL: https://twitter.com/i/oauth2/authorize?response_type=code&client_id=...
   Client ID: ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ
   Redirect URI: http://localhost:3000/profile/twitter/callback
   State: xK9mP2nL... (32 chars)
   Code Verifier: v-S3kX8N... (43 chars)
   Code Challenge: E4j7mL2q... (43 chars)
   Stored in localStorage: {
     state: "xK9mP2nL...",
     address: "0x1234...",
     codeVerifier: "v-S3kX8N..."
   }
```

### Popup Window (Callback Page):

```
🔍 State validation: {
  receivedState: "xK9mP2nL...",
  storedState: "xK9mP2nL...",
  match: true
}
```

## Success! 🎉

Once it works:

- Your Twitter handle appears on your profile
- Creators can see your Twitter when you win predictions
- You can unlink and relink anytime

## Still Having Issues?

Run the verification script:

```bash
./VERIFY_TWITTER_CONFIG.sh
```

And check:

- Browser console (F12) for errors
- Backend logs for API errors
- Network tab for failed requests
- localStorage contents: `localStorage.getItem("twitter_auth_state")`

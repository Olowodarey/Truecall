# Quick Test Steps for Twitter OAuth (Popup Version)

## Start Servers

**Terminal 1:**

```bash
cd backend && npm run start:dev
```

**Terminal 2:**

```bash
cd frontend && npm run dev
```

## Test in Browser

1. Go to: **http://127.0.0.1:3000/profile**
2. Connect your wallet
3. Click **"Link Twitter Account"**
4. **A popup window opens** (600x700, centered) with Twitter auth
5. On Twitter page in popup, click **"Authorize app"**
6. **Popup closes automatically** showing success
7. **Profile updates instantly** - no page refresh needed!
8. You should see your Twitter handle with ✓ on the main page

## What Was Fixed

The error you saw ("Something went wrong" on Twitter) was because of incorrect OAuth PKCE implementation.

**Now fixed:**

- Proper random code verifier generation (64 characters)
- Code verifier passed through entire OAuth flow
- Backend uses correct verifier for token exchange
- **PLUS: Professional popup modal** instead of full-page redirect!

## If Popup is Blocked

If you see an alert "Please allow popups for this site":

1. Look for popup blocker icon in browser address bar (usually right side)
2. Click it and select "Always allow popups from 127.0.0.1"
3. Click "Link Twitter Account" again

## If It Still Fails

1. **Clear browser cache** and try in **incognito mode**
2. Make sure you're **logged into Twitter/X**
3. Check **browser console (F12)** for errors
4. Check **backend terminal** for Twitter API errors

## Success Looks Like

✅ **Popup opens** centered on screen with Twitter auth  
✅ Twitter shows: "Authorize TrueCall to access your account?"  
✅ After clicking authorize: **Popup shows success and closes**  
✅ Main profile page: **Instantly updates** with Twitter avatar + @handle + green checkmark ✓  
✅ Winners display: Shows Twitter info when you win matches

## Benefits of Popup Flow

✨ No full-page redirect - stays on your site  
✨ Professional look (like Facebook, Google, Gmail)  
✨ Instant updates - profile refreshes automatically  
✨ Clear feedback - success message in popup  
✨ Smooth user experience

---

**Ready to test? Just start the servers and follow the 8 steps above!** 🚀

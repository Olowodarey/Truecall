# Twitter Popup Authentication Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │          Main Window (Profile Page)                 │      │
│  │         http://127.0.0.1:3000/profile              │      │
│  │                                                     │      │
│  │  👤 Profile                                        │      │
│  │  ┌───────────────────────────────────┐           │      │
│  │  │ Wallet: 0x1234...5678             │           │      │
│  │  │                                    │           │      │
│  │  │ Twitter: Not Verified ❌          │           │      │
│  │  │                                    │           │      │
│  │  │  [Link Twitter Account] ◄──┐      │           │      │
│  │  │                             │      │           │      │
│  │  └───────────────────────────────────┘           │      │
│  │                                │                   │      │
│  └────────────────────────────────┼───────────────────┘      │
│                                   │                           │
│                                   │ 1. User clicks button     │
│                                   ▼                           │
│  ┌─────────────────────────────────────────────────────┐      │
│  │       Popup Window (600x700, centered)              │      │
│  │    http://127.0.0.1:3000/profile/twitter/callback  │◄─┐   │
│  │                                                     │  │   │
│  │  ╔═══════════════════════════════════════════╗    │  │   │
│  │  ║        Twitter Authorization              ║    │  │   │
│  │  ╠═══════════════════════════════════════════╣    │  │   │
│  │  ║                                           ║    │  │   │
│  │  ║  Authorize TrueCall to access            ║    │  │   │
│  │  ║  your account?                            ║    │  │   │
│  │  ║                                           ║    │  │   │
│  │  ║  ☑ Read Tweets                           ║    │  │   │
│  │  ║  ☑ See accounts you follow               ║    │  │   │
│  │  ║                                           ║    │  │   │
│  │  ║  [Authorize app] [Cancel] ◄──────────────┼────┼──┘   │
│  │  ║                           2. User clicks  ║    │  3. Twitter redirects
│  │  ╚═══════════════════════════════════════════╝    │      │
│  │                                                     │      │
│  └─────────────────────────────────────────────────────┘      │
│                                   │                           │
│                                   │ 4. Callback processes     │
│                                   ▼                           │
│  ┌─────────────────────────────────────────────────────┐      │
│  │         Popup Window (Success State)                │      │
│  │                                                     │      │
│  │               ✅                                   │      │
│  │           Success!                                 │      │
│  │  Successfully linked @username!                   │      │
│  │       Closing window...                            │      │
│  │                                                     │      │
│  └─────────────────────────────────────────────────────┘      │
│                                   │                           │
│                                   │ 5. Sends message          │
│                                   ▼                           │
│  ┌─────────────────────────────────────────────────────┐      │
│  │      Main Window (Updated Automatically)            │      │
│  │                                                     │      │
│  │  👤 Profile                                        │      │
│  │  ┌───────────────────────────────────┐           │      │
│  │  │ Wallet: 0x1234...5678             │           │      │
│  │  │                                    │           │      │
│  │  │ 🐦 @username ✓                   │           │      │
│  │  │ [Profile Picture]                 │           │      │
│  │  │                                    │           │      │
│  │  │ Status: Verified ✅              │           │      │
│  │  │                                    │           │      │
│  │  │  [Unlink Twitter]                 │           │      │
│  │  └───────────────────────────────────┘           │      │
│  │                                                     │      │
│  └─────────────────────────────────────────────────────┘      │
│                                   │                           │
│                                   │ 6. Popup closes          │
│                                   ▼                           │
│                               (closed)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Communication Flow

```
Frontend                    Backend                     Twitter API
   │                           │                            │
   │ 1. Generate codeVerifier  │                            │
   │    (64 random chars)      │                            │
   │                           │                            │
   │ 2. Open popup with        │                            │
   │    OAuth URL ────────────────────────────────────────> │
   │                           │                            │
   │                           │                            │ 3. User authorizes
   │                           │                            │
   │ 4. Twitter redirects ◄────────────────────────────────┤
   │    with code              │                            │
   │                           │                            │
   │ 5. POST /users/twitter/   │                            │
   │    callback ──────────────>                            │
   │    { code, codeVerifier,  │                            │
   │      address }            │                            │
   │                           │                            │
   │                           │ 6. Exchange code for token │
   │                           │ ───────────────────────────>
   │                           │                            │
   │                           │ 7. Return access_token     │
   │                           │ <───────────────────────────
   │                           │                            │
   │                           │ 8. Get user info           │
   │                           │ ───────────────────────────>
   │                           │                            │
   │                           │ 9. Return username, avatar │
   │                           │ <───────────────────────────
   │                           │                            │
   │                           │ 10. Save to users.json     │
   │                           │    (address → twitter)     │
   │                           │                            │
   │ 11. Return success ◄──────┤                            │
   │     { profile: {...} }    │                            │
   │                           │                            │
   │ 12. postMessage to parent │                            │
   │     window                │                            │
   │                           │                            │
   │ 13. Parent reloads profile│                            │
   │     from GET /users/      │                            │
   │     profile/:address ─────>                            │
   │                           │                            │
   │ 14. Return profile ◄──────┤                            │
   │     with Twitter data     │                            │
   │                           │                            │
   │ 15. Update UI instantly   │                            │
   │     (no page refresh!)    │                            │
   │                           │                            │
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  SECURITY MEASURES                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. PKCE (Code Verifier)                                   │
│     ├─ Random 64-char string generated                     │
│     ├─ Stored in sessionStorage                            │
│     ├─ Sent to Twitter as code_challenge                   │
│     └─ Used by backend for token exchange                  │
│                                                             │
│  2. State Parameter (CSRF Protection)                       │
│     ├─ Random 32-char string generated                     │
│     ├─ Stored in sessionStorage                            │
│     ├─ Sent to Twitter with OAuth request                  │
│     └─ Verified in callback (must match)                   │
│                                                             │
│  3. Origin Verification                                     │
│     ├─ window.postMessage checks event.origin              │
│     ├─ Only accepts messages from same origin              │
│     └─ Prevents malicious sites from sending messages      │
│                                                             │
│  4. Window Relationship                                     │
│     ├─ Checks window.opener exists                         │
│     ├─ Verifies popup → parent relationship                │
│     └─ Fallback to redirect if not popup                   │
│                                                             │
│  5. Temporary Storage                                       │
│     ├─ sessionStorage (cleared after auth)                 │
│     ├─ Not localStorage (persists too long)                │
│     └─ Cleaned up on success/error                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## User Experience Timeline

```
Time    Main Window                 Popup Window
──────────────────────────────────────────────────────────────
0s      [Link Twitter Account]      (doesn't exist)
        Button enabled
        ↓
0.1s    Button: "Linking..."        Popup opens (600x700)
        Button disabled             Loading Twitter...
        ↓                           ↓
0.5s    Still showing button        Twitter auth page loaded
        User sees dimmed popup      User sees auth form
        overlay behind popup
        ↓                           ↓
2s      Waiting...                  User reading permissions
        (popup visible in front)
        ↓                           ↓
5s      Still waiting...            User clicks "Authorize"
        ↓                           ↓
6s      Still waiting...            Redirecting...
        ↓                           ↓
7s      Still waiting...            Processing callback...
        ↓                           ↓
8s      Still waiting...            ✅ Success message
        ↓                           ↓
9s      Loading profile...          Still showing success
        (received message)          ↓
        ↓
9.5s    ✓ Profile updated!          Closing...
        Shows @username             ↓
        Shows avatar
        Shows checkmark             (closed)
        ↓
10s     Complete! 🎉               (closed)
        Button: "Unlink Twitter"
```

## Code Flow Sequence

```javascript
// 1. User clicks "Link Twitter Account"
handleLinkTwitter() {
  ├─ Generate state (32 chars)
  ├─ Generate codeVerifier (64 chars)
  ├─ Store in sessionStorage
  ├─ Build OAuth URL
  ├─ Open popup (600x700, centered)
  ├─ Setup message listener
  └─ Setup popup-closed checker
}

// 2. Twitter redirects to callback
handleCallback() {
  ├─ Get code from URL
  ├─ Get state from URL
  ├─ Verify state matches sessionStorage
  ├─ Get codeVerifier from sessionStorage
  ├─ POST to backend /users/twitter/callback
  │   └─ Send: { address, code, codeVerifier }
  ├─ Backend exchanges with Twitter
  ├─ Receive: { success, profile }
  ├─ Show success message in popup
  └─ Send postMessage to parent
}

// 3. Parent window receives message
messageListener(event) {
  ├─ Verify event.origin
  ├─ Check event.data.type
  ├─ If SUCCESS:
  │   ├─ Reload profile from API
  │   ├─ Update UI with Twitter info
  │   └─ Show verification checkmark
  └─ If ERROR:
      └─ Show error alert
}

// 4. Popup auto-closes
setTimeout(() => {
  window.close(); // After 1.5-2 seconds
}, 1500);
```

---

**This is the complete flow of your professional Twitter popup authentication!** 🚀

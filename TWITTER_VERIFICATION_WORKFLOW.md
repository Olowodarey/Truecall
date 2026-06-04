# Twitter Verification Workflow - Complete Guide

## Overview

The Twitter verification system links a user's wallet address to their Twitter account, both **off-chain** (backend database) and **on-chain** (smart contract). This allows users to join creator events and have their identity verified.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Verification Flow                       │
└─────────────────────────────────────────────────────────────────────┘

1. User connects wallet → Goes to /profile
2. Clicks "Link with Twitter OAuth"
3. Twitter OAuth flow completes
4. Backend receives Twitter data
5. Backend saves to users.json (off-chain)
6. Backend calls contract.verifyAddress() (on-chain) ✨
7. User can now join creator events!

┌──────────────┐    ┌───────────────┐    ┌─────────────────────┐
│   Frontend   │───▶│    Backend    │───▶│  Smart Contract     │
│  (Next.js)   │    │   (NestJS)    │    │ (CreatorEventMgr)   │
└──────────────┘    └───────────────┘    └─────────────────────┘
      │                    │                       │
      │ Twitter OAuth      │                       │
      └───────────────────▶│                       │
                           │                       │
                           │ Save to users.json    │
                           │ (off-chain storage)   │
                           │                       │
                           │ verifyAddress(addr) ──▶
                           │                       │
                           │◀─── isVerified[addr] = true
                           │                       │
```

## Components

### 1. Backend - Off-Chain Storage

**File:** `backend/data/users.json`

Stores user profiles:

```json
[
  {
    "address": "0x...",
    "twitterHandle": "username",
    "twitterId": "1234567890",
    "twitterAvatar": "https://...",
    "verifiedAt": 1780564481457
  }
]
```

**Purpose:**

- Display Twitter handle on profile
- Show Twitter avatar
- Show verification status in UI
- Timestamp when verification happened

### 2. Backend - API Endpoints

**`POST /api/users/twitter/callback`**

- Handles Twitter OAuth callback
- Exchanges code for access token
- Fetches Twitter user info
- Saves to `users.json`
- **Calls `verifyAddress()` on smart contract** ✨
- Returns success + profile

**`GET /api/users/twitter/verify-status/:address`**

- Checks if address has Twitter verified (off-chain)
- Returns: `{ verified: boolean, twitterHandle: string, twitterAvatar: string }`
- Used by frontend to show verification badge

**`POST /api/users/twitter/link`** (manual, for testing)

- Manually link Twitter handle without OAuth
- Saves to `users.json`
- **Calls `verifyAddress()` on smart contract** ✨

**`POST /api/users/twitter/unlink`**

- Removes Twitter link from user profile
- Does NOT call contract (user stays verified on-chain)

### 3. Smart Contract - On-Chain Verification

**Contract:** `CreatorEventManager.sol`

**State Variable:**

```solidity
mapping(address => bool) public isVerified;
```

**Functions:**

```solidity
// Admin (backend) marks address as verified
function verifyAddress(address user) external onlyOwner {
    isVerified[user] = true;
    emit AddressVerified(user);
}

// Batch verify multiple addresses
function verifyAddressBatch(address[] calldata users) external onlyOwner {
    for (uint256 i = 0; i < users.length; i++) {
        isVerified[users[i]] = true;
        emit AddressVerified(users[i]);
    }
}

// Revoke verification
function unverifyAddress(address user) external onlyOwner {
    isVerified[user] = false;
    emit AddressUnverified(user);
}
```

**Used in `joinEvent()`:**

```solidity
function joinEvent(uint256 eventId, string calldata inviteCode) external {
    // ...
    if (!isVerified[msg.sender]) revert NotVerified();
    // ...
}
```

### 4. Frontend - User Interface

**`/profile` page:**

- Shows verification status
- Twitter OAuth button
- Displays linked Twitter handle + avatar
- Shows "Verified" badge when verified

**`/creator-events` page:**

- Shows verification status at top
- "Verify Twitter to Join Events" button if not verified
- "✓ Verified @username" badge if verified

**`/creator-events/[id]` page:**

- Shows "Twitter Verification Required" if not verified
- Button to go verify
- Shows user's Twitter handle if verified and joined

## Complete User Flow

### Step 1: User Goes to Profile

```
User → Connect Wallet → Navigate to /profile
```

Frontend checks:

```typescript
const response = await fetch(`/api/users/twitter/verify-status/${address}`);
const { verified, twitterHandle, twitterAvatar } = await response.json();
```

### Step 2: User Clicks "Link with Twitter OAuth"

```
Frontend generates:
- Random state (security)
- PKCE code verifier
- PKCE code challenge

Stores in localStorage:
- twitter_auth_state
- twitter_auth_address
- twitter_code_verifier

Opens Twitter popup with OAuth URL
```

### Step 3: User Authorizes on Twitter

```
Twitter → Redirects to /profile/twitter/callback?code=...&state=...
```

### Step 4: Callback Page Processes

```typescript
// Validate state
const storedState = localStorage.getItem("twitter_auth_state");
if (state !== storedState) {
  // Security check failed
  return;
}

// Call backend
const response = await fetch("/api/users/twitter/callback", {
  method: "POST",
  body: JSON.stringify({ address, code, codeVerifier }),
});
```

### Step 5: Backend Processes OAuth

```typescript
// backend/src/users/users.controller.ts

// 1. Exchange code for Twitter access token
const oauth2 = new OAuth2({ clientId, clientSecret, redirectUri });
const tokens = await oauth2.exchangeCode(code, codeVerifier);

// 2. Fetch Twitter user info
const client = new Client({ accessToken: tokens.access_token });
const userResponse = await client.users.getMe({
  "user.fields": ["profile_image_url"],
});

// 3. Save to database (off-chain)
const profile = this.usersService.linkTwitter(
  address,
  twitterUser.username,
  twitterUser.id,
  twitterUser.profileImageUrl,
);

// 4. Verify on blockchain (on-chain) ✨
await this.creatorEventsService.verifyAddress(address);

return { success: true, profile };
```

### Step 6: Backend Verifies On-Chain

```typescript
// backend/src/creator-events/creator-events.service.ts

async verifyAddress(user: string) {
  const hash = await this.walletClient.writeContract({
    address: this.contractAddress,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: 'verifyAddress',
    args: [user as `0x${string}`],
  });

  const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

  return { success: true, transactionHash: receipt.transactionHash };
}
```

### Step 7: User Can Join Events!

```
User → Navigate to /creator-events/[id]
      → Has "Join with Invite Code" section (no verification warning)
      → Enters invite code
      → Joins event (contract checks isVerified[user])
```

## Data Storage Locations

### Off-Chain (Backend)

**`backend/data/users.json`**

```json
{
  "address": "0xc232b9Fa329255078A8Cc13e585215e69c44f4D3",
  "twitterHandle": "Dareyolowo",
  "twitterId": "1588250449584570370",
  "twitterAvatar": "https://pbs.twimg.com/profile_images/...",
  "verifiedAt": 1780564481457
}
```

**Purpose:** Display in UI, show badges, avatars

### On-Chain (Smart Contract)

**`CreatorEventManager` state:**

```solidity
isVerified[0xc232b9Fa329255078A8Cc13e585215e69c44f4D3] = true
```

**Purpose:** Enforce verification requirement when joining events

## Verification Check Workflow

When user tries to join an event:

```mermaid
graph TD
    A[User clicks "Join Event"] --> B{Wallet connected?}
    B -->|No| C[Show "Connect Wallet"]
    B -->|Yes| D{Check off-chain verification}
    D --> E[GET /api/users/twitter/verify-status/address]
    E --> F{verified === true?}
    F -->|No| G[Show "Twitter Verification Required"]
    G --> H[Button: "Verify Twitter"]
    F -->|Yes| I[Show "Join with Invite Code" form]
    I --> J[User enters code]
    J --> K[User signs transaction]
    K --> L{Contract checks isVerified}
    L -->|false| M[Transaction reverts: NotVerified]
    L -->|true| N[User joins event ✅]
```

## Troubleshooting

### Issue: User verified on profile but can't join event

**Cause:** Off-chain verification (users.json) saved but on-chain verification failed

**Check:**

1. Look at backend logs when user verified
2. Look for: `✅ Address verified on-chain: 0x...`
3. If you see error, on-chain verification failed

**Fix:**

```bash
# Call contract directly to verify
curl -X POST http://localhost:3001/api/creator-events/verify \
  -H "Content-Type: application/json" \
  -d '{"address": "0x..."}'
```

Or use the admin panel to batch verify.

### Issue: On-chain verification transaction fails

**Possible causes:**

1. Backend wallet has no CELO for gas
2. Backend wallet is not contract owner
3. Network issues

**Check backend .env:**

```env
PRIVATE_KEY=0x...  # Must be contract owner
CREATOR_EVENT_MANAGER_ADDRESS=0x...  # Must be correct
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
```

**Check contract owner:**

```bash
cast call $CREATOR_EVENT_MANAGER_ADDRESS "owner()(address)" \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

Must match the address derived from `PRIVATE_KEY`.

### Issue: User shows as verified but contract says not verified

**Cause:** Database and contract are out of sync

**Fix:** Re-verify on-chain:

```typescript
// Backend endpoint
POST /api/creator-events/verify
{
  "address": "0x..."
}
```

## Testing the Complete Flow

### 1. Test Twitter OAuth Verification

```bash
# 1. Start backend
cd backend
pnpm start:dev

# 2. Start frontend
cd frontend
pnpm dev

# 3. Open browser
open http://localhost:3000/profile

# 4. Connect wallet

# 5. Click "Link with Twitter OAuth"

# 6. Check backend logs for:
#    - "Twitter linked via XDK: @username → 0x..."
#    - "Verifying address on-chain: 0x..."
#    - "✅ Address verified on-chain: 0x..."

# 7. Check contract verification:
cast call $CREATOR_EVENT_MANAGER_ADDRESS \
  "isVerified(address)(bool)" \
  $YOUR_ADDRESS \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
# Should return: true
```

### 2. Test Joining Event

```bash
# 1. Go to event page
open http://localhost:3000/creator-events/0

# 2. Should see "Join with Invite Code" (not verification warning)

# 3. Enter invite code and join

# 4. Transaction should succeed ✅
```

## Security Considerations

### Why Both Off-Chain and On-Chain?

**Off-Chain (users.json):**

- Fast reads for UI
- Display Twitter handle/avatar
- No gas costs
- Easy to update

**On-Chain (contract):**

- Trustless verification
- Immutable record
- Enforced by smart contract
- Cannot be bypassed

### State Synchronization

The backend automatically syncs both:

1. User verifies Twitter → Saved to `users.json`
2. Backend immediately calls `contract.verifyAddress()`
3. Both states are now in sync

If on-chain call fails:

- User still has Twitter linked (UI shows verified badge)
- User cannot join events (contract enforces on-chain check)
- Admin can manually verify later

## Admin Tools

### Batch Verify Multiple Users

```bash
curl -X POST http://localhost:3001/api/creator-events/verify-batch \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "0x...",
      "0x...",
      "0x..."
    ]
  }'
```

### Check Verification Status

```bash
# Off-chain
curl http://localhost:3001/api/users/twitter/verify-status/0x...

# On-chain
cast call $CREATOR_EVENT_MANAGER_ADDRESS \
  "isVerified(address)(bool)" \
  0x... \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

### Unverify Address

```bash
# Off-chain (remove Twitter link)
curl -X POST http://localhost:3001/api/users/twitter/unlink \
  -H "Content-Type: application/json" \
  -d '{"address": "0x..."}'

# On-chain (revoke contract verification)
curl -X POST http://localhost:3001/api/creator-events/unverify \
  -H "Content-Type: application/json" \
  -d '{"address": "0x..."}'
```

## Summary

✅ **What's Working:**

- Twitter OAuth flow (fixed localStorage issue)
- Off-chain storage in users.json
- On-chain verification via contract
- **Automatic sync**: Twitter verification → on-chain verification
- Frontend displays verification status
- Contract enforces verification requirement

✅ **User Experience:**

1. Verify Twitter once on /profile
2. Go to any creator event
3. Join immediately (no re-verification needed)
4. Twitter handle shows as verified everywhere

✅ **Admin Control:**

- Can manually verify addresses
- Can batch verify
- Can revoke verification
- All actions logged on-chain

The complete workflow is now implemented and tested! 🎉

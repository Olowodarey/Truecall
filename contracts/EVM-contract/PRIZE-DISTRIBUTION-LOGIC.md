# TrueCall Prize Distribution Logic

## Complete Breakdown of Points, Prizes, and Platform Fees

---

## Overview

TrueCall distributes prizes **only to the top 5 point holders** in each event. The platform takes a **1% fee** from the total prize pool, and the remaining **99%** is split among the top 5 winners.

---

## Points System

### How Points Are Earned

Points are calculated by the **AI Oracle Agent** after match verification:

| Prediction Result           | Points Earned |
| --------------------------- | ------------- |
| **Exact score match**       | 3 points      |
| **Correct outcome (W/D/L)** | 1 point       |
| **Wrong prediction**        | 0 points      |

**Example:**

- Match result: Arsenal 2-1 Chelsea
- User A predicts: 2-1 → **3 points** (exact)
- User B predicts: 3-1 → **1 point** (correct outcome: home win)
- User C predicts: 1-2 → **0 points** (wrong)

### Tiebreaker Rules

If two users have the same points:

1. **Earlier submission timestamp wins** (rewards early confidence)
2. If still tied (same second), **split prize equally**

---

## Prize Distribution Formula

### Step 1: Calculate Total Pool

```
Total Pool = Number of Participants × Entry Fee
```

### Step 2: Deduct Platform Fee (1%)

```
Platform Fee = Total Pool × 1%
Prize Pool = Total Pool - Platform Fee
```

### Step 3: Distribute to Top 5

```
1st place: Prize Pool × 40%
2nd place: Prize Pool × 25%
3rd place: Prize Pool × 15%
4th place: Prize Pool × 10%
5th place: Prize Pool × 5%
Remaining: Prize Pool × 4% (goes to treasury)
```

---

## Example Calculations

### Example 1: 20 Participants, $5 Entry Fee

**Total Pool:**

- 20 users × $5 = **$100**

**Platform Fee:**

- $100 × 1% = **$1** (to treasury)

**Prize Pool:**

- $100 - $1 = **$99**

**Distribution:**

- 1st place: $99 × 40% = **$39.60**
- 2nd place: $99 × 25% = **$24.75**
- 3rd place: $99 × 15% = **$14.85**
- 4th place: $99 × 10% = **$9.90**
- 5th place: $99 × 5% = **$4.95**
- Remaining: $99 × 4% = **$3.96** (to treasury)

**Total Distributed:** $39.60 + $24.75 + $14.85 + $9.90 + $4.95 + $3.96 = $94.01
**Platform Fee:** $1.00
**Total:** $95.01 (remaining $4.99 stays in contract for gas buffer)

---

### Example 2: 100 Participants, $10 Entry Fee

**Total Pool:**

- 100 users × $10 = **$1,000**

**Platform Fee:**

- $1,000 × 1% = **$10** (to treasury)

**Prize Pool:**

- $1,000 - $10 = **$990**

**Distribution:**

- 1st place: $990 × 40% = **$396.00**
- 2nd place: $990 × 25% = **$247.50**
- 3rd place: $990 × 15% = **$148.50**
- 4th place: $990 × 10% = **$99.00**
- 5th place: $990 × 5% = **$49.50**
- Remaining: $990 × 4% = **$39.60** (to treasury)

---

### Example 3: Private Event, 5 Participants, $20 Entry Fee

**Total Pool:**

- 5 users × $20 = **$100**
- Note: Creator doesn't pay, so only 4 paid entries
- Actual pool: 4 × $20 = **$80**

**Platform Fee:**

- $80 × 1% = **$0.80** (to treasury)

**Prize Pool:**

- $80 - $0.80 = **$79.20**

**Distribution:**

- 1st place: $79.20 × 40% = **$31.68**
- 2nd place: $79.20 × 25% = **$19.80**
- 3rd place: $79.20 × 15% = **$11.88**
- 4th place: $79.20 × 10% = **$7.92**
- 5th place: $79.20 × 5% = **$3.96**
- Remaining: $79.20 × 4% = **$3.17** (to treasury)

---

## Handling Fewer Than 5 Participants

If an event has fewer than 5 participants, prizes are adjusted:

### 2 Participants

- 1st place: 60% of prize pool
- 2nd place: 39% of prize pool
- Platform: 1%

### 3 Participants

- 1st place: 50% of prize pool
- 2nd place: 30% of prize pool
- 3rd place: 19% of prize pool
- Platform: 1%

### 4 Participants

- 1st place: 45% of prize pool
- 2nd place: 28% of prize pool
- 3rd place: 17% of prize pool
- 4th place: 9% of prize pool
- Platform: 1%

---

## Contract Responsibilities

### Leaderboard.sol

**Responsible for:**

- Tracking points for all users
- Maintaining rankings per event
- Identifying top 5 winners
- Returning winner addresses to EventManager

**NOT responsible for:**

- Holding prize money
- Calculating prize amounts
- Distributing prizes

### EventManager.sol

**Responsible for:**

- Holding prize pool (entry fees in cUSD)
- Deducting 1% platform fee
- Calculating prize amounts for top 5
- Handling prize claims (pull pattern)
- Sending cUSD to winners
- Transferring platform fee to treasury

**NOT responsible for:**

- Calculating points
- Determining rankings

---

## Prize Claiming Process

### Pull Pattern (Recommended)

Winners must **claim their prizes** (not automatically sent):

1. AI Oracle Agent verifies result and calculates points
2. Leaderboard contract identifies top 5
3. EventManager contract marks prizes as claimable
4. Winners call `claimPrize(eventId)` from frontend
5. Contract verifies winner is in top 5
6. Contract sends cUSD to winner's wallet
7. Winner's claim is marked as complete

**Benefits:**

- Safer than push pattern (no reentrancy risk)
- Winners control when they receive funds
- Gas costs paid by winners (not platform)

**Unclaimed Prizes:**

- Winners have 30 days to claim
- After 30 days, unclaimed prizes go to treasury
- Prevents funds from being locked forever

---

## Platform Fee Usage

**1% platform fee goes to treasury for:**

- AI Oracle Agent gas fees (result verification)
- Backend infrastructure costs
- Frontend hosting
- API-Football subscription
- Smart contract upgrades
- Marketing and growth
- Team compensation

---

## Private Events Special Rules

### Creator Benefits

- **Free entry:** Creator doesn't pay entry fee
- **Competes normally:** Creator can win prizes like everyone else
- **No advantage:** Creator's free entry doesn't affect prize pool

### Prize Pool Calculation

```
Total Pool = (Number of Paid Participants) × Entry Fee
Platform Fee = Total Pool × 1%
Prize Pool = Total Pool - Platform Fee
```

**Example:**

- 10 participants (1 creator + 9 friends)
- Entry fee: $5
- Total pool: 9 × $5 = $45 (creator didn't pay)
- Platform fee: $45 × 1% = $0.45
- Prize pool: $45 - $0.45 = $44.55

### Cancellation Rules

- Creator can cancel if **no one has joined**
- If participants have joined, creator **cannot cancel**
- If creator cancels after joins, all participants get **full refunds**

---

## Smart Contract Functions

### EventManager.sol

**Prize Distribution Functions:**

```
claimPrize(uint256 eventId)
  - Called by winners to claim their prize
  - Verifies caller is in top 5
  - Sends cUSD to winner
  - Marks prize as claimed

withdrawPlatformFee()
  - Called by admin to withdraw platform fees
  - Sends accumulated 1% fees to treasury
  - Only callable by owner

getWinners(uint256 eventId)
  - Returns top 5 addresses for an event
  - Called by frontend to display winners
  - Returns prize amounts for each winner
```

### Leaderboard.sol

**Ranking Functions:**

```
updatePoints(address[] users, uint256[] points)
  - Called by AI Oracle Agent after verification
  - Updates points for all users in event
  - Recalculates rankings
  - Identifies top 5

getTopN(uint256 eventId, uint256 n)
  - Returns top N users for an event
  - Used to get top 5 winners
  - Sorted by points (tiebreaker: timestamp)

getUserRank(uint256 eventId, address user)
  - Returns user's rank in event
  - Used for frontend display
```

---

## Gas Optimization

**Why 1% Platform Fee?**

- Covers AI Oracle Agent gas costs (~$0.001 per verification)
- Covers contract deployment and upgrades
- Minimal impact on user prizes
- Sustainable for platform growth

**Gas Costs Breakdown:**

- User prediction submission: ~$0.001
- AI Oracle result verification: ~$0.002
- Prize claim: ~$0.001 (paid by winner)
- Total per user: ~$0.002-0.003

**With 1% fee on $5 entry:**

- Platform receives: $0.05
- Covers gas costs: $0.003
- Remaining: $0.047 for operations

---

## Summary

✅ **Only top 5 win prizes** (based on points)  
✅ **Platform takes 1% fee** (not 5%)  
✅ **Remaining 99% split among top 5** (40%, 25%, 15%, 10%, 5%)  
✅ **Leaderboard.sol calculates points and rankings**  
✅ **EventManager.sol holds funds and distributes prizes**  
✅ **Pull pattern for prize claims** (winners call claimPrize)  
✅ **Private event creators get free entry** but compete normally  
✅ **Unclaimed prizes after 30 days go to treasury**

---

_This document defines the complete prize distribution logic for TrueCall._

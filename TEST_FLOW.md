# TrueCall End-to-End Test Flow

This guide walks you through testing the complete prediction flow: create event → add match → join → predict → submit result → check winners.

## Prerequisites

- Admin wallet: `0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b`
- User wallet: Any other wallet (e.g., your second account)
- Both wallets funded with CELO on Celo Sepolia
- Backend running: `pnpm start` in `/backend`
- Frontend running: `npm run dev` in `/frontend`

---

## Step 1: Create an Event (Admin)

1. Go to http://localhost:3000/create-event
2. Connect with **admin wallet**
3. Fill in the form:
   - **Event Name**: "Test Event"
   - **Start Date**: Tomorrow at 10:00 AM
   - **End Date**: Tomorrow at 11:00 PM
   - **Entry Token**: CELO (native)
   - **Entry Fee**: 1 CELO
   - **Scoring Rule**: "Both (Score + Outcome)"
4. Click "Create Event On-Chain"
5. Wait for confirmation
6. Note the **Event ID** (e.g., 0, 1, 2, etc.)

---

## Step 2: Add a Match (Admin)

1. Go to http://localhost:3000/events/[EVENT_ID] (replace with your event ID)
2. Wait for the event to start (or the start time to pass)
3. You should see a **"+ Add Match"** button (only visible to admin after event starts)
4. Click it and fill in:
   - **Home Team**: "Team A"
   - **Away Team**: "Team B"
   - **API Match ID**: "match_123"
   - **Kickoff Time**: Tomorrow at 2:00 PM
   - **Prediction Deadline**: Tomorrow at 1:55 PM
   - **Allow Score Prediction**: ✓ (checked)
   - **Allow Outcome Prediction**: ✓ (checked)
5. Click "Add Match"
6. Wait for confirmation
7. Note the **Match ID** (should appear in the matches list)

---

## Step 3: Join the Event (User)

1. **Switch to user wallet** (not admin)
2. Go to http://localhost:3000/events/[EVENT_ID]
3. You should see the event details
4. If the event hasn't started yet, you'll see a **"Join"** button
5. Click "Join (1 CELO)"
6. Confirm the transaction in your wallet
7. Wait for confirmation
8. You should see "✅ You have joined — predict on matches below"

---

## Step 4: Make a Prediction (User)

1. Still as **user wallet**, on the event page
2. You should see the match card: "Team A vs Team B"
3. Click on the match card
4. You'll be taken to the prediction page: http://localhost:3000/predictions?matchId=[MATCH_ID]
5. You'll see two prediction sections:

### Option A: Exact Score Prediction (5 points)

- Enter home score: `2`
- Enter away score: `1`
- Click "Submit Score"
- Confirm in wallet
- You should see "✅ Predicted: 2 – 1"

### Option B: Outcome Prediction (3 points)

- Click one of: "Team A Win", "Draw", "Team B Win"
- Let's say you pick "Team A Win"
- Click "Submit Outcome"
- Confirm in wallet
- You should see "✅ Predicted: HOME_WIN"

**You can do both predictions for the same match!**

---

## Step 5: Submit Match Result (Admin/AI Agent)

The AI agent normally does this automatically, but for testing, you can simulate it manually.

### Option A: Via Contract Directly (Advanced)

Use a tool like Remix or cast to call `submitMatchResult`:

```bash
cast send 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33 \
  "submitMatchResult(uint256,uint8,uint8,bytes32)" \
  1 2 1 0x0000000000000000000000000000000000000000000000000000000000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

Replace:

- `1` with your match ID
- `2` with home score
- `1` with away score
- The bytes32 can be any value (it's just a proof hash)

### Option B: Via AI Agent (If Running)

If you have the AI agent running (`pnpm start` in `/ai-agent`), it will automatically:

1. Watch for `MatchAdded` events
2. Poll for match results
3. Submit results when matches finish

For testing, you can manually trigger it or wait for the polling interval.

---

## Step 6: Check Winners and Points

After the match result is submitted:

1. Go back to the event page: http://localhost:3000/events/[EVENT_ID]
2. Check the **Leaderboard** on the right side
3. You should see:
   - Your user address
   - Points earned based on predictions:
     - **+5 pts** if score prediction was correct (2-1)
     - **+3 pts** if outcome prediction was correct (Team A Win)
     - **0 pts** if predictions were wrong

### Example Scenarios:

**Scenario 1: User predicted 2-1 and Team A Win, actual result is 2-1**

- Score prediction: ✅ Correct → +5 pts
- Outcome prediction: ✅ Correct → +3 pts
- **Total: 8 pts**

**Scenario 2: User predicted 2-1 and Team A Win, actual result is 1-1**

- Score prediction: ❌ Wrong → 0 pts
- Outcome prediction: ❌ Wrong (Draw, not Team A Win) → 0 pts
- **Total: 0 pts**

**Scenario 3: User predicted 2-1 and Team A Win, actual result is 3-0**

- Score prediction: ❌ Wrong → 0 pts
- Outcome prediction: ✅ Correct (Team A Win) → +3 pts
- **Total: 3 pts**

---

## Step 7: Resolve Event and Claim Prize (Optional)

After the event end date passes:

1. Go to the event page
2. The event status should change to "RESOLVED"
3. Top 5 winners can claim their prizes
4. Click "Claim Prize" button (if you're in top 5)
5. Confirm the transaction
6. Prize is transferred to your wallet

---

## Troubleshooting

### "Event has started — joining is closed"

- This means the event's `startDate` has passed
- You can only join BEFORE the event starts
- Create a new event with a future start date

### "No matches added yet"

- The admin needs to add matches after the event starts
- Only the admin wallet can add matches
- Make sure you're logged in as admin

### Prediction not submitting

- Check that the prediction deadline hasn't passed
- Make sure you're joined to the event
- Check that you haven't already made that type of prediction

### Match result not showing

- The AI agent or admin needs to submit the result
- Results are submitted via `submitMatchResult()` function
- After submission, the match status changes to "VERIFIED"

### Points not showing

- Wait for the event to end (after `endDate`)
- Call `resolveEvent()` to calculate winners
- Check the leaderboard on the event page

---

## Quick Test Checklist

- [ ] Create event as admin
- [ ] Add match as admin (after event starts)
- [ ] Join event as user
- [ ] Submit score prediction as user
- [ ] Submit outcome prediction as user
- [ ] Submit match result as admin
- [ ] Check leaderboard shows points
- [ ] Verify correct points awarded based on predictions

---

## Contract Addresses (Celo Sepolia)

- **EventManager**: `0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33`
- **Leaderboard**: `0xb4410D9CC489bc5b1AD45a4f6611B13aA4742B06`
- **cUSD Token**: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`

---

## API Endpoints (Backend)

```
POST   /api/events                    - Create event
GET    /api/events                    - Get all events
GET    /api/events/:id                - Get event details
POST   /api/events/:id/addMatch       - Add match to event
GET    /api/events/:id/matches        - Get event matches
GET    /api/events/:id/participants   - Get event participants
GET    /api/events/:id/joined/:address - Check if user joined
GET    /api/events/:id/claimable/:address - Get claimable prize

GET    /api/matches/:id               - Get match details
GET    /api/matches/:id/prediction/:address - Get user's prediction

GET    /api/leaderboard/global        - Global leaderboard
GET    /api/leaderboard/event/:id     - Event leaderboard
```

---

## Notes

- All timestamps are **Unix timestamps** (seconds since epoch)
- Entry fees and prizes are in **18 decimals** (wei)
- Predictions are **one-time only** per match per user
- Match results can be disputed within **2 hours** of submission
- Unclaimed prizes expire after **30 days**

# Quick Test Checklist - 5 Minute Flow

Follow this checklist to test the complete flow in ~5 minutes.

## Setup (1 min)

- [ ] Backend running: `cd backend && pnpm start`
- [ ] Frontend running: `cd frontend && npm run dev`
- [ ] Have 2 wallets ready:
  - Admin: `0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b`
  - User: Any other wallet
- [ ] Both wallets have CELO on Celo Sepolia

---

## Test Flow (4 min)

### 1. Create Event (Admin) - 1 min

```
1. Go to http://localhost:3000/create-event
2. Connect admin wallet
3. Fill form:
   - Name: "Quick Test"
   - Start: Tomorrow 10:00 AM
   - End: Tomorrow 11:00 PM
   - Token: CELO
   - Fee: 1 CELO
   - Scoring: Both
4. Submit → Wait for confirmation
5. Note EVENT_ID from URL
```

### 2. Add Match (Admin) - 1 min

```
1. Go to http://localhost:3000/events/[EVENT_ID]
2. Wait for event to start (or start time to pass)
3. Click "+ Add Match"
4. Fill form:
   - Home: "Team A"
   - Away: "Team B"
   - API ID: "test_123"
   - Kickoff: Tomorrow 2:00 PM
   - Deadline: Tomorrow 1:55 PM
   - Both predictions: ✓
5. Submit → Wait for confirmation
6. Note MATCH_ID from match card
```

### 3. Join Event (User) - 30 sec

```
1. Switch to user wallet
2. Go to http://localhost:3000/events/[EVENT_ID]
3. Click "Join (1 CELO)"
4. Confirm in wallet
5. Wait for confirmation
```

### 4. Make Predictions (User) - 1 min

```
1. Click on match card "Team A vs Team B"
2. Go to predictions page
3. Enter score: 2 - 1
4. Click "Submit Score" → Confirm
5. Click "Team A Win"
6. Click "Submit Outcome" → Confirm
7. See both predictions confirmed
```

### 5. Submit Result (Admin) - 30 sec

```
Option A - Using Cast:
cast send 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33 \
  "submitMatchResult(uint256,uint8,uint8,bytes32)" \
  [MATCH_ID] 2 1 0x0000000000000000000000000000000000000000000000000000000000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org

Option B - Via Blockscout:
1. Go to Blockscout
2. Search EventManager: 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33
3. Write Contract → submitMatchResult
4. Fill: matchId=[MATCH_ID], homeScore=2, awayScore=1, resultProof=0x000...
5. Write → Confirm
```

### 6. Check Results (User) - 30 sec

```
1. Go back to http://localhost:3000/events/[EVENT_ID]
2. Look at Leaderboard (right side)
3. See your address with 8 points:
   - +5 for correct score (2-1)
   - +3 for correct outcome (Team A Win)
```

---

## Expected Results

✅ **If everything works:**

- Event created with ID
- Match added with ID
- User joined successfully
- Both predictions submitted
- Match result verified
- Leaderboard shows 8 points

❌ **If something fails:**

- Check error message in console
- Verify wallet is connected
- Check timestamps (must be in future)
- Ensure you're on Celo Sepolia network

---

## Key URLs

| Action          | URL                                            |
| --------------- | ---------------------------------------------- |
| Create Event    | http://localhost:3000/create-event             |
| View Events     | http://localhost:3000/events                   |
| Event Details   | http://localhost:3000/events/[ID]              |
| Make Prediction | http://localhost:3000/predictions?matchId=[ID] |
| Profile         | http://localhost:3000/profile                  |

---

## Key Addresses

| Item         | Address                                    |
| ------------ | ------------------------------------------ |
| Admin Wallet | 0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b |
| EventManager | 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33 |
| Leaderboard  | 0xb4410D9CC489bc5b1AD45a4f6611B13aA4742B06 |
| cUSD Token   | 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1 |

---

## Scoring Reference

| Prediction   | Points | Condition              |
| ------------ | ------ | ---------------------- |
| Score        | 5      | Exact score matches    |
| Outcome      | 3      | Win/Draw/Loss matches  |
| Both Correct | 8      | Both predictions match |
| One Correct  | 3-5    | Only one matches       |
| Both Wrong   | 0      | Neither matches        |

---

## Common Issues & Fixes

| Issue               | Fix                                            |
| ------------------- | ---------------------------------------------- |
| "Event has started" | Create new event with future start date        |
| "No matches added"  | Admin must add match after event starts        |
| "Can't join"        | Event must not have started yet                |
| "Can't predict"     | Must join event first                          |
| "OnlyAIAgent error" | Use correct admin wallet for result submission |
| "Match not found"   | Check match ID is correct                      |

---

## Notes

- All times are **Unix timestamps** (seconds)
- Fees are in **wei** (18 decimals)
- Predictions are **one-time only** per match
- Results can be disputed within **2 hours**
- Prizes expire after **30 days**

---

## Next Steps After Testing

1. ✅ Test with multiple users
2. ✅ Test with different token (cUSD)
3. ✅ Test dispute mechanism
4. ✅ Test prize claiming
5. ✅ Test leaderboard ranking
6. ✅ Test event resolution

---

**Happy testing! 🚀**

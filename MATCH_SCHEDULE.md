# 🏆 Match Schedule - Updated for Testing

## ⏰ Current Time

- **Nigerian Time (WAT):** Check your clock
- **Matches starting in 15 minutes!**

## 🔴 LIVE MATCHES (Starting Soon)

### Match 1: Manchester United vs Liverpool

- **Match ID:** `match_live_001`
- **Kickoff:** In 15 minutes (1:33 PM WAT)
- **League:** Premier League
- **Venue:** Old Trafford
- **Use for:** Create your first test event!

### Match 2: Arsenal vs Chelsea

- **Match ID:** `match_live_002`
- **Kickoff:** In 30 minutes (1:48 PM WAT)
- **League:** Premier League
- **Venue:** Emirates Stadium

### Match 3: Manchester City vs Tottenham

- **Match ID:** `match_live_003`
- **Kickoff:** In 45 minutes (2:03 PM WAT)
- **League:** Premier League
- **Venue:** Etihad Stadium

### Match 4: Newcastle United vs Brighton

- **Match ID:** `match_live_004`
- **Kickoff:** In 1 hour (2:18 PM WAT)
- **League:** Premier League
- **Venue:** St James Park

### Match 5: Real Madrid vs Barcelona (El Clásico)

- **Match ID:** `match_live_005`
- **Kickoff:** In 1.5 hours (2:48 PM WAT)
- **League:** La Liga
- **Venue:** Santiago Bernabéu

## ✅ FINISHED MATCHES (For Testing AI Agent)

### Match 6: Tottenham vs West Ham

- **Match ID:** `match_finished_001`
- **Result:** 2-1 (Tottenham wins)
- **Status:** FT (Full Time)
- **Use for:** Test AI agent auto-submission

### Match 7: Aston Villa vs Everton

- **Match ID:** `match_finished_002`
- **Result:** 3-0 (Aston Villa wins)
- **Status:** FT (Full Time)

### Match 8: PSG vs Monaco

- **Match ID:** `match_finished_003`
- **Result:** 2-2 (Draw)
- **Status:** FT (Full Time)
- **Use for:** Test draw scenarios

## 📅 FUTURE MATCHES

### Match 9: Bayern Munich vs Borussia Dortmund

- **Match ID:** `match_future_001`
- **Kickoff:** In 2 days

### Match 10: Inter Milan vs AC Milan

- **Match ID:** `match_future_002`
- **Kickoff:** In 3 days

### Match 11: Liverpool vs Leicester City

- **Match ID:** `match_future_003`
- **Kickoff:** In 4 days

### Match 12: Juventus vs Napoli

- **Match ID:** `match_future_004`
- **Kickoff:** In 5 days

## 🎯 Testing Workflow

### Step 1: Create Event (NOW!)

```
Match: match_live_001 (Man United vs Liverpool)
Kickoff: In 15 minutes
```

1. Go to "Create Event" page
2. Enter match ID: `match_live_001`
3. Home Team: Manchester United
4. Away Team: Liverpool
5. Set kickoff time: Current time + 15 minutes
6. Entry fee: 0.1 CELO
7. Create event!

### Step 2: Join Event (Quickly!)

- Have 2-3 wallets ready
- Each wallet joins and makes predictions
- Pay entry fee
- Submit predictions before kickoff

### Step 3: Watch AI Agent Work

After 15 minutes (match "finishes"):

- AI agent will detect match needs result
- Fetches from backend API
- Generates test result (or use real result from API later)
- Submits to contract automatically
- Contract calculates winners

### Step 4: Check Winners

- Go to event details page
- Click "View Winners"
- See leaderboard with Twitter handles
- Verify prize distribution

## 🚨 Quick Test (Finished Matches)

Want to test immediately without waiting?

### Option 1: Use Finished Match

```bash
# Create event with match_finished_001
# Set kickoff time to the past
# AI agent will immediately submit result!
```

### Option 2: Manual Result Submission

```bash
# For testing without waiting for AI agent
cast send $CREATOR_EVENT_MANAGER_ADDRESS \
  "submitMatchResult(uint256,uint256,uint256)" \
  <eventId> 2 1 \
  --rpc-url $CELO_RPC_URL \
  --private-key $ADMIN_PRIVATE_KEY
```

## 📊 Expected Timeline

```
NOW (1:18 PM WAT)
├─ Create event with match_live_001
├─ Users join and make predictions
│
+15 min (1:33 PM WAT)
├─ Match "kicks off"
├─ Users can no longer join
├─ Wait for match to "finish"
│
+20 min (1:38 PM WAT)
├─ AI agent detects finished match
├─ Fetches result from backend
├─ Submits to contract
├─ Contract calculates winners
│
+21 min (1:39 PM WAT)
└─ View winners on frontend!
```

## 🔧 Troubleshooting

### Backend not serving matches?

```bash
# Restart backend
cd backend && pnpm start:dev

# Check matches endpoint
curl http://localhost:3001/api/matches
```

### AI Agent not picking up match?

```bash
# Check AI agent logs
cd ai-agent && npm start

# Should see:
# ✅ Loaded 12 matches from backend API
# 🤖 Creator Match Watcher starting
```

### Need to update match times?

```bash
# Edit the single source of truth
nano backend/src/data/matches.json

# Update kickoffTime values
# Save and backend serves updated data automatically
```

## 💡 Pro Tips

1. **Multiple Events:** Create events with different matches (match_live_002, match_live_003)
2. **Different Leagues:** Test Premier League, La Liga, etc.
3. **Draw Results:** Use match_finished_003 (2-2 draw)
4. **Future Matches:** Test event creation for future dates

## 🎉 Ready to Test!

**Recommended first test:**

```
Match: match_live_001 (Man United vs Liverpool)
Kickoff: In 15 minutes
Perfect for testing complete workflow!
```

**Alternative (instant test):**

```
Match: match_finished_001 (Tottenham vs West Ham)
Result: Already finished (2-1)
AI agent will submit immediately!
```

Choose your match and start testing! 🚀

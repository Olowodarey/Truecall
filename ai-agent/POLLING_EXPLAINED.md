# AI Agent Polling - What and Where

## 🔄 What "Polling Every 60 Seconds" Means

Every 60 seconds, the AI agent performs 3 main tasks:

---

## 1️⃣ Poll the Celo Blockchain (RPC)

**Source:** `https://forno.celo.org` (Celo Mainnet RPC)

**What it checks:**

```
┌─────────────────────────────────────────┐
│  Celo Blockchain                        │
│  ├─ Scan for MatchAdded events          │
│  ├─ Read match status (OPEN/VERIFIED)   │
│  └─ Check kickoff times                 │
└─────────────────────────────────────────┘
         ↓ Every 60 seconds
┌─────────────────────────────────────────┐
│  AI Agent                               │
│  Discovers new matches to track         │
└─────────────────────────────────────────┘
```

**Code location:** `src/creatorMatchWatcher.ts`

```typescript
// Line ~200
async function syncNewMatches(): Promise<void> {
  const latestBlock = await publicClient.getBlockNumber();
  // Scan blockchain for MatchAdded events
  const newMatches = await getPendingCreatorMatchesFromLogs(
    fromBlock,
    latestBlock,
  );
}
```

**What it finds:**

- New matches added to events
- Match details (teams, kickoff time, match ID)
- Current match status

---

## 2️⃣ Poll Your Backend API

**Source:** `https://truecall-production.up.railway.app/api`

**What it fetches:**

```
┌─────────────────────────────────────────┐
│  Backend API                            │
│  /api/matches/{apiMatchId}              │
│  ├─ Match status (FT/LIVE/NS)           │
│  ├─ Final scores (homeScore, awayScore) │
│  └─ Match details                       │
└─────────────────────────────────────────┘
         ↓ For each tracked match
┌─────────────────────────────────────────┐
│  AI Agent                               │
│  Gets real match results                │
└─────────────────────────────────────────┘
```

**Code location:** `src/creatorMatchWatcher.ts`

```typescript
// Line ~80
async function fetchMatchResultFromBackend(apiMatchId: string) {
  const backendUrl = "https://truecall-production.up.railway.app/api";
  const response = await fetch(`${backendUrl}/matches/${apiMatchId}`);
  const data = await response.json();

  // Only submit if match is Full Time (FT)
  if (data.status === "FT") {
    return {
      homeScore: data.finalHomeScore,
      awayScore: data.finalAwayScore,
      isFinished: true,
    };
  }
}
```

**What it looks for:**

```json
{
  "status": "FT", // ← Must be "FT" (Full Time)
  "finalHomeScore": 3, // ← Actual result
  "finalAwayScore": 0, // ← Actual result
  "apiMatchId": "api_1545036"
}
```

---

## 3️⃣ Check Tracked Matches

**Source:** In-memory (agent's own tracking)

**What it checks:**

```
┌─────────────────────────────────────────┐
│  Tracked Matches (in memory)           │
│  For each match:                        │
│  ├─ Has kickoff time passed?            │
│  ├─ Is match still OPEN on blockchain?  │
│  ├─ Do we have FT result from backend?  │
│  └─ Should we submit now?               │
└─────────────────────────────────────────┘
         ↓ Decision tree
┌─────────────────────────────────────────┐
│  Submit Result to Blockchain            │
│  If ALL conditions met:                 │
│  ✅ Kickoff passed                      │
│  ✅ Status = OPEN                       │
│  ✅ Backend has FT result               │
└─────────────────────────────────────────┘
```

---

## 🔍 Full Polling Cycle (Every 60 Seconds)

```
┌──────────────────────────────────────────────────────────────┐
│  1. Scan Blockchain                                          │
│     └─ Check for new MatchAdded events                       │
│        (from Celo RPC: forno.celo.org)                       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  2. For Each Tracked Match                                   │
│     └─ Check kickoff time                                    │
│     └─ Read match status from blockchain                     │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  3. Fetch Results from Backend API                           │
│     └─ GET /api/matches/{apiMatchId}                         │
│        (from truecall-production.up.railway.app)             │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  4. Decision: Should Submit?                                 │
│     ✅ Kickoff passed? → Yes                                 │
│     ✅ Match status = OPEN? → Yes                            │
│     ✅ Backend status = FT? → Yes                            │
│     ✅ Has scores? → Yes                                     │
│                                                              │
│     → SUBMIT RESULT TO BLOCKCHAIN                           │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  5. Submit Transaction                                       │
│     └─ Call submitMatchResult() on contract                  │
│     └─ Wait for confirmation                                 │
│     └─ Log success ✅                                        │
└──────────────────────────────────────────────────────────────┘
                            ↓
                    Wait 60 seconds
                            ↓
                       Repeat ♻️
```

---

## 📍 Polling Sources Summary

| What               | Where                                                    | Why                                     |
| ------------------ | -------------------------------------------------------- | --------------------------------------- |
| **Blockchain**     | `https://forno.celo.org`                                 | Find new matches, check status          |
| **Match Results**  | `https://truecall-production.up.railway.app/api/matches` | Get actual scores (FT status)           |
| **Contract State** | CreatorEventManager contract on Celo                     | Verify match is still OPEN, get details |
| **Internal State** | Agent's memory (trackedMatches Map)                      | Track what matches we're monitoring     |

---

## 🎯 Example Flow for One Match

### Match: Kosovo vs Andorra (Match ID 5)

```
Minute 0:
  Agent starts → Scans blockchain
  ├─ Finds MatchAdded event for match 5
  └─ Adds to tracked matches

Minute 1 (60 seconds later):
  Poll cycle #1
  ├─ Blockchain: Match 5 still OPEN ✅
  ├─ Kickoff: Not yet (scheduled for 18:00)
  └─ Skip for now ⏭️

Minute 2-60:
  ... Match hasn't kicked off yet, skip each time ...

18:00 (Kickoff time):
  Poll cycle
  ├─ Blockchain: Match 5 still OPEN ✅
  ├─ Kickoff: PASSED ✅
  ├─ Backend API: Status = "LIVE" (match in progress)
  └─ Wait for FT ⏳

19:45 (Match ends):
  Poll cycle
  ├─ Blockchain: Match 5 still OPEN ✅
  ├─ Kickoff: PASSED ✅
  ├─ Backend API: Status = "FT", Score = 3-0 ✅
  └─ SUBMIT RESULT! 🚀

19:45:05 (5 seconds later):
  ├─ Transaction confirmed ✅
  ├─ Log: "✅ Match result submitted successfully"
  ├─ Contract now shows match as VERIFIED
  └─ Winners calculated automatically on-chain
```

---

## ⚙️ Configuration

All polling settings are in your `.env`:

```bash
# How often to poll
POLL_INTERVAL_MS=60000  # 60 seconds

# How far back to scan on startup
STARTUP_BLOCK_LOOKBACK=500000  # ~29 days of blocks

# Where to get blockchain data
CELO_RPC_URL=https://forno.celo.org

# Where to get match results
BACKEND_API_URL=https://truecall-production.up.railway.app/api
```

---

## 💡 Why 60 Seconds?

### Pros ✅

- Fast enough to catch results within 1 minute of FT
- Low cost (fewer RPC calls = less gas)
- Reduces load on backend API
- Gives blockchain time to confirm new events

### Alternatives

**30 seconds (Faster):**

```bash
POLL_INTERVAL_MS=30000
# More responsive but 2x the API calls
```

**120 seconds (Slower):**

```bash
POLL_INTERVAL_MS=120000
# Lower cost but slower response
```

**Current 60 seconds is the sweet spot!** ⚖️

---

## 🔍 How to See Polling in Action

```bash
# Watch live polling
railway logs -f

# You'll see every 60 seconds:
[debug] Scanning for new CreatorEventManager MatchAdded events
[debug] Match not kicked off yet
[debug] Match not finished yet
[debug] Creator match watcher poll complete {"trackedCount":3}

# When a match finishes:
[info] Match is Full Time, ready to submit
[info] 📊 Submitting match result
[info] ✅ Match result submitted successfully
```

---

## 📊 Data Flow Diagram

```
   ┌─────────────┐
   │  AI Agent   │ ◄─── You are here
   └──────┬──────┘
          │ Every 60 seconds
          │
    ┌─────┴──────────────────────────────┐
    │                                    │
    ↓                                    ↓
┌────────────┐                    ┌──────────────┐
│  Celo RPC  │                    │  Backend API │
│ (Blockchain)│                    │   (Results)  │
└────────────┘                    └──────────────┘
    │                                    │
    │ Returns:                           │ Returns:
    │ - MatchAdded events                │ - status: "FT"
    │ - Match status                     │ - finalHomeScore
    │ - Kickoff times                    │ - finalAwayScore
    └──────────┬─────────────────────────┘
               │
               ↓
         ┌───────────┐
         │  Decision │
         └─────┬─────┘
               │
        Ready to submit?
               │
               ↓
       ┌──────────────┐
       │   Submit to  │
       │  Blockchain  │
       └──────────────┘
```

---

## Summary

**Every 60 seconds, the agent:**

1. **Checks Celo blockchain** for new matches (via RPC)
2. **Asks your backend API** for match results (via HTTPS)
3. **Decides** if conditions are met to submit
4. **Submits results** to blockchain if ready

**Sources:**

- Blockchain: `forno.celo.org` (Celo RPC)
- Results: `truecall-production.up.railway.app/api`
- Contract: `0xbA57166902064dE0EE16Df3A30839da7382F06E5`

**The polling is automatic and requires no action from you!** 🎉

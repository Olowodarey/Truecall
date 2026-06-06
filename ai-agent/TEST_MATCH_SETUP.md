# 🧪 AI Agent Test Match Setup

## Test Match Details

**Match ID:** `test_match_agent_001`
**Teams:** Arsenal vs Manchester United
**Venue:** Emirates Stadium
**Kickoff Time:** 15 minutes from now (1780773946 Unix timestamp)
**Final Score:** Arsenal 3-1 Manchester United
**Status:** FT (Full Time)

---

## How the AI Agent Works

The AI agent is now deployed and running on Railway. It performs the following workflow:

### 1️⃣ Polling Cycle (Every 60 seconds)

- Fetches finished matches from your backend API: `https://truecall-production.up.railway.app/api/matches?status=finished`
- The backend reads from `backend/src/data/matches.json`

### 2️⃣ Match Detection

- Looks for matches with `status: "FT"` and kickoff time in the past
- Filters out matches that have already been submitted to the blockchain

### 3️⃣ Result Submission

- Extracts `finalHomeScore` and `finalAwayScore` from the match data
- Submits the result to the CreatorEventManager contract on Celo Mainnet
- Uses the oracle wallet (`0x684835A1f131dcC3D4fF49A356556Fe0188Bd062`)

---

## ⏰ Test Timeline

**Current Time:** Now
**Match Kickoff:** +15 minutes (1780773946)
**Match Becomes Eligible:** Immediately (status is already "FT")
**Expected Agent Action:** Within 1-2 minutes of match eligibility

---

## 📊 What Will Happen

### Immediate Actions:

1. ✅ The AI agent is already running on Railway
2. ✅ It will detect the test match on its next polling cycle (within 60 seconds)
3. ✅ It will read: Arsenal 3-1 Man Utd (FT)
4. ✅ It will submit this result to the blockchain

### Blockchain Submission:

```
Contract: 0xbA57166902064dE0EE16Df3A30839da7382F06E5 (Celo Mainnet)
Function: submitMatchResult(matchId, 3, 1)
Caller: 0x684835A1f131dcC3D4fF49A356556Fe0188Bd062 (Oracle)
```

---

## 🔍 How to Monitor

### 1. Railway Logs (Real-time agent activity)

```bash
cd ai-agent
railway logs -f
```

**Expected Log Output:**

```
[INFO] Creator Match Client initialized
[INFO] Polling for finished matches...
[INFO] Found finished match: test_match_agent_001
[INFO] Arsenal vs Manchester United - Result: 3-1
[INFO] Submitting creator match result { matchId: xxx, homeScore: 3, awayScore: 1 }
[INFO] Transaction submitted { txHash: 0x... }
[INFO] Creator match result confirmed on-chain
```

### 2. Backend API (Check match data)

```bash
curl https://truecall-production.up.railway.app/api/matches?status=finished
```

### 3. Blockchain Explorer

- Visit: https://celoscan.io/address/0xbA57166902064dE0EE16Df3A30839da7382F06E5
- Check recent transactions from oracle wallet
- Look for `submitMatchResult` function calls

### 4. Your Frontend

- Go to your TrueCall app
- Check the matches page to see if results are reflected

---

## 🚨 Important Notes

1. **Match Must Be On-Chain First:**
   - The AI agent only submits results for matches that already exist on the blockchain
   - You need to create the match event on-chain via your frontend or smart contract first

2. **Oracle Role Required:**
   - Wallet `0x684835A1f131dcC3D4fF49A356556Fe0188Bd062` must have `ORACLE_ROLE`
   - Verify with: `cast call 0xbA57166902064dE0EE16Df3A30839da7382F06E5 "hasRole(bytes32,address)" "ORACLE_ROLE" "0x684835A1f131dcC3D4fF49A356556Fe0188Bd062"`

3. **Gas Fees:**
   - Ensure oracle wallet has at least 0.5 CELO for transaction fees

4. **Polling Interval:**
   - Agent checks every 60 seconds (configurable via `POLL_INTERVAL_MS` env var)
   - First detection should happen within 1-2 minutes

---

## 🎯 Testing Workflow

### Step 1: Verify Agent is Running

```bash
cd ai-agent
railway status
# Should show: ● Online
```

### Step 2: Watch the Logs

```bash
railway logs -f
```

### Step 3: Wait for Next Poll Cycle

- Agent polls every 60 seconds
- Should detect and submit within 1-2 minutes

### Step 4: Verify Result on Blockchain

- Check Celoscan for transaction
- Or use cast to read match result from contract

---

## 📝 Match Data Format

The test match in `backend/src/data/matches.json`:

```json
{
  "id": "test_match_agent_001",
  "homeTeam": "Arsenal",
  "awayTeam": "Manchester United",
  "kickoffTime": 1780773946,
  "finalHomeScore": 3,
  "finalAwayScore": 1,
  "status": "FT"
}
```

---

## ✅ Success Criteria

Your test is successful when:

1. ✅ AI agent detects the match in logs
2. ✅ Transaction is submitted to blockchain
3. ✅ Transaction is confirmed (receipt status: success)
4. ✅ Match result visible on Celoscan
5. ✅ No errors in Railway logs

---

## 🔧 Troubleshooting

### Agent Not Detecting Match

- Verify backend API is accessible: `curl https://truecall-production.up.railway.app/api/matches?status=finished`
- Check Railway logs for errors
- Verify match status is "FT" in JSON

### Transaction Failing

- Check oracle wallet has CELO for gas
- Verify ORACLE_ROLE is granted
- Check if match exists on-chain

### Need to Reset Test

- Edit `backend/src/data/matches.json`
- Update kickoff time to new timestamp
- The backend auto-refreshes, no restart needed

---

## 📞 Support

If the agent doesn't submit within 5 minutes:

1. Check Railway logs for errors
2. Verify backend API returns the match
3. Confirm oracle wallet permissions
4. Check wallet CELO balance

**Deployment Info:**

- Railway Project: AI agent (56dd6bf0-b164-4dff-8294-7e50d178a878)
- Service: Truecall (Online)
- Region: US West

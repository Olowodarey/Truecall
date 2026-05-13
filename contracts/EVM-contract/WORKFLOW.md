# TrueCall — Football Prediction Platform on Celo

## System Architecture & Workflow

---

## Overview

A football prediction platform where users join events, pay entry fees, submit predictions before match kickoff (timestamped on-chain), and compete for prizes based on a leaderboard. Built on **Celo** for low gas fees and mobile-first accessibility.

**Key Innovation:** AI Oracle Agent autonomously verifies match results, calculates points, and updates leaderboards — making the platform trustless and fully automated.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  - Users view PUBLIC events (admin-created)                     │
│  - Users create PRIVATE events (with invite codes)              │
│  - Users submit predictions                                     │
│  - Mobile-first design (works with MiniPay)                     │
│  - Real-time leaderboard updates                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     BACKEND (Node.js)                           │
│  - Admin creates PUBLIC events                                  │
│  - Users create PRIVATE events (generates invite codes)         │
│  - Fetches match data from API-Football                         │
│  - Validates invite codes for private events                    │
│  - Caches leaderboard data                                      │
│  - Manages user accounts                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  SMART CONTRACTS (Celo)                         │
│                                                                 │
│  EventManager.sol                                               │
│  - Stores PUBLIC and PRIVATE events                             │
│  - Validates invite codes on-chain                              │
│  - Stores predictions with timestamps                           │
│  - Locks predictions at deadline                                │
│  - Accepts results from AI Oracle Agent only                    │
│  - Holds prize pools (entry fees)                               │
│  - Deducts 1% platform fee                                      │
│  - Distributes prizes to top 5                                  │
│                                                                 │
│  Leaderboard.sol                                                │
│  - Tracks user points across all events                         │
│  - Maintains rankings per event                                 │
│  - Identifies top 5 winners                                     │
│  - Returns winner addresses to EventManager                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              AI ORACLE AGENT (ERC-8004 Registered)              │
│                                                                 │
│  🤖 Autonomous Agent with On-Chain Identity                     │
│  - Monitors PUBLIC and PRIVATE events 24/7                      │
│  - Verifies results when matches finish                         │
│  - Calculates points for all predictions                        │
│  - Submits results on-chain with cryptographic proof            │
│  - Updates leaderboard automatically                            │
│  - Identifies top 5 winners per event                           │
│  - Builds reputation score through accurate verifications       │
│  - Pays gas fees in cUSD (fee abstraction)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Workflow

### 1. Event Creation

**Two Types of Events:**

#### A. Public Events (Admin-Created)

**You manually create public events:**

- Select match from API-Football
- Set entry fee (in cUSD)
- Set prediction deadline (before kickoff)
- Define scoring rules:
  - **Exact Score Only:** 3 points for exact match, 0 otherwise
  - **Outcome Only:** 1 point for correct W/D/L, 0 otherwise
  - **Both:** 3 points for exact, 1 point for outcome, 0 for wrong
- Event is visible to all users
- Anyone can join

#### B. Private Events (User-Created)

**Any user can create private events:**

- Select from available matches (fetched from API-Football)
- Set custom entry fee (minimum enforced by contract)
- Set prediction deadline (before kickoff)
- Choose scoring rules
- Generate unique **invite code** (6-character alphanumeric)
- Share invite code with friends
- Only users with invite code can join
- Creator can set max participants

**Private Event Features:**

- Creator doesn't pay entry fee (free entry as host)
- Creator competes for prizes like everyone else
- Creator can close event early (before deadline)
- Creator can cancel event if no one joins (refunds all)

Backend calls `EventManager.createEvent()` or `EventManager.createPrivateEvent()` on-chain.

---

### 2. User Predictions

**Users join and predict:**

- Pay entry fee (cUSD) — goes into prize pool
- Submit prediction (home score, away score)
- Prediction is **timestamped on-chain** (immutable proof)
- Deadline enforced by smart contract

**Anti-Cheat Mechanism:**

- Once submitted, prediction cannot be changed
- Timestamp proves it was before kickoff
- Stored permanently on blockchain

---

### 3. Match Happens

**During the match:**

- Contract locks predictions (no more submissions)
- AI Oracle Agent monitors API-Football every 5 minutes
- Waits for match status = "FT" (Full Time)

---

### 4. AI Oracle Agent Verifies Result

**Autonomous verification process:**

1. **Fetch Result**
   - Agent polls API-Football for final score
   - Waits 5 minutes and checks again (avoid early/wrong scores)
   - Verifies both results match

2. **Calculate Points**
   - Agent reads all predictions for the event
   - Applies scoring rules:
     - Exact score match = 3 points
     - Correct outcome (W/D/L) = 1 point
     - Wrong = 0 points
   - Generates points array for all users

3. **Create Proof**
   - Agent creates cryptographic hash:
     - `keccak256(eventId, homeScore, awayScore, timestamp, agentAddress)`
   - This proves the agent verified the result

4. **Submit On-Chain**
   - Agent calls `EventManager.verifyResultAndCalculatePoints()`
   - Passes: eventId, scores, proof, users[], points[]
   - Contract verifies agent is authorized
   - Contract stores result and points
   - Contract emits `ResultVerified` event

5. **Update Leaderboard**
   - Agent calls `Leaderboard.updatePoints()`
   - All user points updated on-chain
   - Rankings recalculated
   - Top 5 identified for prize distribution

---

### 5. Prize Distribution

**Automatic payout to top 5:**

**Prize Pool Calculation:**

1. Total entry fees collected = Prize Pool
2. Platform fee (1%) deducted first
3. Remaining 99% distributed to top 5

**Distribution Split (Top 5 Only):**

- **1st place:** 40% of remaining pool
- **2nd place:** 25% of remaining pool
- **3rd place:** 15% of remaining pool
- **4th place:** 10% of remaining pool
- **5th place:** 5% of remaining pool
- **Platform:** 1% of total pool (goes to treasury)
- **Remaining 4%:** Rolls over to next event or treasury

**Example:**

- 20 users × $5 entry fee = $100 total pool
- Platform fee: $100 × 1% = **$1** (to treasury)
- Prize pool: $100 - $1 = **$99**
- 1st place: $99 × 40% = **$39.60**
- 2nd place: $99 × 25% = **$24.75**
- 3rd place: $99 × 15% = **$14.85**
- 4th place: $99 × 10% = **$9.90**
- 5th place: $99 × 5% = **$4.95**
- Remaining: $99 × 4% = **$3.96** (to treasury)

**Payout Process:**

- Winners call `claimPrize(eventId)` — pull pattern for safety
- Contract sends cUSD to winner wallets
- Each winner can only claim once
- Unclaimed prizes after 30 days go to treasury

**Private Events:**

- Same distribution logic applies
- Creator competes for prizes (no special advantage)
- If fewer than 5 participants, prizes adjust:
  - 2 participants: 1st gets 60%, 2nd gets 39%, platform 1%
  - 3 participants: 1st gets 50%, 2nd gets 30%, 3rd gets 19%, platform 1%
  - 4 participants: 1st gets 45%, 2nd gets 28%, 3rd gets 17%, 4th gets 9%, platform 1%

---

## AI Oracle Agent Details

### What Makes It Special

**ERC-8004 Registered Identity:**

- Agent is an ERC-721 NFT on-chain
- Has discoverable metadata (name, capabilities, endpoints)
- Viewable on [8004scan.io](https://8004scan.io)

**Reputation System:**

- Every verification builds reputation
- Users can dispute results (2-hour window)
- If agent is wrong, reputation decreases
- If agent is consistently accurate, reputation increases
- Reputation score visible on-chain

**Trustless Operation:**

- No human intervention needed
- Cryptographic proofs for every result
- Dispute mechanism for transparency
- Multi-source verification (checks API twice)

---

### Agent Workflow (Technical)

**Monitoring Loop (runs every 5 minutes):**

1. Query database for events needing verification
2. For each event:
   - Check if match has finished (status = "FT")
   - If yes, proceed to verification
   - If no, skip and check next event

**Verification Process:**

1. Fetch result from API-Football
2. Wait 5 minutes
3. Fetch result again
4. Verify both results match
5. If mismatch, log error and retry later
6. If match, proceed to calculation

**Points Calculation:**

1. Read all predictions from contract
2. For each prediction:
   - Compare with actual result
   - Apply scoring rules
   - Assign points
3. Generate arrays: `users[]`, `points[]`

**On-Chain Submission:**

1. Create cryptographic proof
2. Call contract with gas paid in cUSD
3. Wait for transaction confirmation
4. Log success and update agent reputation

---

## Dispute Mechanism

**User Protection:**

- After result submission, 2-hour dispute window opens
- Any user can call `disputeResult(eventId, reason)`
- Event status changes to "DISPUTED"
- Admin manually reviews and resolves
- If agent was wrong:
  - Result corrected
  - Points recalculated
  - Agent reputation penalized
- If agent was right:
  - Dispute rejected
  - Event proceeds to payout

---

## Private Events Deep Dive

### How Private Events Work

**Creation Flow:**

1. User selects "Create Private Event" in frontend
2. User chooses match from available fixtures
3. User sets entry fee (minimum $1 cUSD)
4. User sets max participants (2-100)
5. User chooses scoring rules
6. Backend generates unique 6-character invite code (e.g., "XY7K9M")
7. Backend calls `EventManager.createPrivateEvent()` with invite code hash
8. User shares invite code with friends (via link, QR code, or text)

**Joining Flow:**

1. Friend receives invite code
2. Friend enters code in frontend
3. Frontend calls backend to validate code
4. Backend verifies code matches event
5. User pays entry fee (cUSD)
6. Backend calls `EventManager.joinPrivateEvent(eventId, inviteCode)`
7. Contract validates invite code hash
8. User can now submit prediction

**Privacy & Security:**

- Invite code is hashed on-chain (not stored in plain text)
- Only users with correct code can join
- Code cannot be guessed (6 alphanumeric = 2.1 billion combinations)
- Creator can deactivate code to prevent new joins
- Event is not visible in public event list

**Creator Benefits:**

- Free entry (doesn't pay entry fee)
- Competes for prizes like everyone else
- Can cancel event if no one joins (no penalty)
- Can close event early (before deadline)
- Receives notification when friends join

**Use Cases:**

- Friends competing for bragging rights
- Office pools and workplace competitions
- Family game nights
- Social media challenges
- Influencer fan competitions

---

## Scoring Rules Explained

### Option 1: Exact Score Only

- User predicts: 2-1
- Actual result: 2-1 → **3 points**
- Actual result: 3-1 → **0 points**

### Option 2: Outcome Only

- User predicts: 2-1 (home win)
- Actual result: 3-1 (home win) → **1 point**
- Actual result: 1-1 (draw) → **0 points**

### Option 3: Both (Recommended)

- User predicts: 2-1
- Actual result: 2-1 → **3 points** (exact)
- Actual result: 3-1 → **1 point** (correct outcome)
- Actual result: 1-2 → **0 points** (wrong)

---

## Leaderboard System

### Event Leaderboard

- Ranks users within a single event based on points
- **Only top 5 win prizes** from that event's pool
- Tiebreaker: Earlier submission timestamp wins
- Points determine ranking:
  - 3 points for exact score
  - 1 point for correct outcome
  - 0 points for wrong prediction

### Global Leaderboard

- Accumulates points across all events
- Tracks all-time best predictors
- Can be reset seasonally
- Used for platform-wide rankings and achievements
- Does NOT affect prize distribution (prizes are per-event only)

### Prize Distribution Logic

**Who Gets Prizes:**

- Only the **top 5 point holders** in each event
- Points are calculated by AI Oracle Agent after match verification
- Leaderboard contract automatically identifies top 5
- EventManager contract handles prize distribution

**Prize Calculation:**

1. AI Oracle Agent verifies result and calculates points
2. Leaderboard contract updates all user points
3. Leaderboard contract sorts users by points (tiebreaker: timestamp)
4. Leaderboard contract identifies top 5 addresses
5. EventManager contract calculates prize amounts:
   - Deduct 1% platform fee from total pool
   - Split remaining 99% among top 5 using percentages
6. Winners call `claimPrize(eventId)` to receive cUSD

**Example Breakdown:**

```
Total Pool: $100 (20 users × $5)
Platform Fee: $1 (1%)
Prize Pool: $99 (99%)

Top 5 Distribution:
1st: $39.60 (40% of $99)
2nd: $24.75 (25% of $99)
3rd: $14.85 (15% of $99)
4th: $9.90 (10% of $99)
5th: $4.95 (5% of $99)
Remaining: $3.96 (4% to treasury)
```

### Contract Responsibilities

**Leaderboard.sol:**

- Tracks points for all users
- Maintains rankings
- Identifies top 5 winners per event
- Returns winner addresses to EventManager

**EventManager.sol:**

- Holds prize pool (entry fees)
- Deducts 1% platform fee
- Calculates prize amounts for top 5
- Handles prize claims (pull pattern)
- Sends cUSD to winners
- Transfers platform fee to treasury

---

## Celo-Specific Features

### Why Celo?

**Low Gas Fees:**

- ~$0.001 per transaction
- Makes on-chain predictions practical
- AI agent can verify hundreds of events cheaply

**Stablecoin-Native:**

- Entry fees in cUSD (stable, predictable)
- Prizes in cUSD (no volatility risk)
- Gas fees paid in cUSD (fee abstraction)

**Mobile-First:**

- Works with MiniPay (11M+ wallets)
- Valora wallet integration
- MetaMask compatible

**Fast Finality:**

- ~5 second block times
- Instant prediction confirmations
- Quick result verification

---

## Tech Stack

| Component          | Technology                                  |
| ------------------ | ------------------------------------------- |
| Smart Contracts    | Solidity 0.8.24, Foundry                    |
| Blockchain         | Celo Mainnet (Chain ID: 42220)              |
| Token              | cUSD (Celo Dollar stablecoin)               |
| AI Agent Framework | Node.js + TypeScript + ethers.js            |
| AI Agent Identity  | ERC-8004 (Identity + Reputation Registries) |
| Football Data      | API-Football (api-football.com)             |
| Backend            | Node.js + Express + PostgreSQL              |
| Job Scheduler      | node-cron (for agent monitoring)            |
| Frontend           | Next.js + wagmi + RainbowKit                |
| Wallet             | MiniPay, Valora, MetaMask                   |

---

## Development Phases

### Phase 1: Core Contracts

- EventManager with prediction timestamping
- Leaderboard with points tracking
- Prize distribution logic
- Deploy to Celo Alfajores testnet

### Phase 2: AI Oracle Agent

- Register agent with ERC-8004
- Build monitoring service
- Implement verification logic
- Test on testnet events

### Phase 3: Backend & Frontend

- Admin dashboard for event creation
- User interface for predictions
- Leaderboard display
- Prize claiming flow

### Phase 4: Production

- Deploy to Celo Mainnet
- Verify agent on AgentScan
- Launch with real matches
- Monitor agent performance

---

## Celo AI Agent Prize Qualification

### Why This Wins

**Autonomous Agent:**

- Runs 24/7 without human intervention
- Makes economic decisions (gas fees, result submission)
- Builds reputation through performance

**ERC-8004 Integration:**

- Agent has on-chain identity (ERC-721 NFT)
- Reputation tracked via ERC-8004 Reputation Registry
- Discoverable on 8004scan.io

**Real-World Utility:**

- Solves actual problem (trustless sports oracle)
- Handles real money (entry fees, prizes)
- Serves real users (football prediction market)

**Trustless Infrastructure:**

- Cryptographic proofs for every result
- Dispute mechanism for transparency
- Multi-source verification

**Celo-Native:**

- Uses cUSD for all transactions
- Fee abstraction (agent pays gas in cUSD)
- Mobile-first (MiniPay integration)

---

## Key Differentiators

### vs. Traditional Prediction Markets

- ❌ Polymarket: Centralized result verification
- ❌ Augur: Complex UX, no mobile focus
- ✅ **TrueCall:** AI agent oracle + mobile-first + Celo

### vs. Other AI Agent Projects

- ❌ Most: Toy demos, no real users
- ❌ Most: No economic agency
- ✅ **TrueCall:** Real users, real money, real utility

### vs. Traditional Oracles

- ❌ Chainlink: Expensive for sports data
- ❌ Manual oracles: Centralized, slow
- ✅ **TrueCall AI Agent:** Autonomous, cheap, fast, trustless

---

## Success Metrics

**For Hackathon Submission:**

- Number of events verified by agent
- Agent accuracy rate (% correct verifications)
- Agent reputation score on ERC-8004
- Number of users who made predictions
- Total prize pool distributed
- AgentScan ranking

**For Production:**

- Daily active users
- Events per week
- Agent uptime (target: 99.9%)
- Average verification time
- Dispute rate (target: <1%)

---

## Security Considerations

**Smart Contract:**

- Prediction timestamps immutable
- Only AI agent can submit results
- Dispute window for user protection
- Pull pattern for prize claims

**AI Agent:**

- Private key secured in environment variables
- Multi-source verification (checks API twice)
- Cryptographic proofs for all results
- Reputation at stake for accuracy

**Backend:**

- Admin-only event creation
- Rate limiting on API calls
- Database backups
- Audit logs for all operations

---

## Future Enhancements

**Phase 5: Advanced Features**

- Multiple AI agents competing (best accuracy wins)
- Live in-play predictions (during match)
- Seasonal leaderboards with reset
- NFT badges for top predictors

**Phase 6: Scaling**

- Support multiple sports (basketball, tennis, etc.)
- Multi-league events (predict 10 matches at once)
- Social features (follow friends, create leagues)
- Mobile app (native iOS/Android)

---

_This document is the source of truth for TrueCall's architecture and AI Oracle Agent implementation._

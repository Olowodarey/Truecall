# Event & Match Architecture with Dual Prediction System

## Overview

The TrueCall prediction platform separates **Events** (competitions/tournaments) from **Matches** (individual fixtures). Users can make **two types of predictions per match** for maximum flexibility and points.

## Dual Prediction System

For each match, users can make **two independent predictions**:

### 1. Score Prediction (5 points)

- Predict the exact final score (e.g., Arsenal 2-1 Chelsea)
- Earn **5 points** if correct
- Optional - admin decides per match via `allowScorePrediction`

### 2. Outcome Prediction (3 points)

- Predict the match outcome: `HOME_WIN`, `DRAW`, or `AWAY_WIN`
- Earn **3 points** if correct
- Optional - admin decides per match via `allowOutcomePrediction`

### Maximum Points Per Match

- **8 points total** (5 + 3) if both predictions are correct
- Users can submit one, both, or neither prediction type
- Each prediction type can only be submitted once per match
- Admin controls which prediction types are allowed per match

## Architecture

### Event

An **Event** is a competition or tournament that houses multiple matches. Users join an event once by paying a ONE-TIME entry fee.

**Key Properties:**

- `eventName`: Name of the competition (e.g., "Premier League Week 10")
- `startDate`: When the event starts (users can join before this)
- `endDate`: When the event ends (all matches must finish before this)
- `entryFee`: ONE-TIME payment in cUSD
- `prizePool`: Accumulated entry fees from all participants
- `scoringRule`: Applied to all matches in this event (deprecated with dual system)

**Lifecycle:**

1. **OPEN**: Admin creates event, users can join (before startDate)
2. **OPEN** (after startDate): Admin can add matches, users can predict
3. **RESOLVED**: All matches verified, prizes calculated

### Match

A **Match** is an individual fixture within an event. Users can submit two types of predictions.

**Key Properties:**

- `eventId`: Parent event
- `homeTeam` / `awayTeam`: Teams playing
- `apiMatchId`: API-Football match ID
- `kickoffTime`: When the match starts
- `predictionDeadline`: Last time to submit predictions
- `allowScorePrediction`: If true, users can predict exact score (5 pts)
- `allowOutcomePrediction`: If true, users can predict outcome (3 pts)
- `finalHomeScore` / `finalAwayScore`: Result (set by AI Oracle)

**Lifecycle:**

1. **OPEN**: Admin adds match, users can predict (before predictionDeadline)
2. **LOCKED**: Deadline passed, awaiting result
3. **VERIFIED**: AI Oracle submitted result, points calculated on-chain
4. **DISPUTED**: Under admin review (if disputed)

## User Flow

### 1. Join an Event (Before Start Date)

```solidity
// Public event
eventManager.joinEvent(eventId);

// Private event
eventManager.joinPrivateEvent(eventId, "invite-code");
```

- User pays ONE-TIME entry fee
- Can now predict on all matches in this event

### 2. Admin Adds Matches (After Event Starts)

```solidity
eventManager.addMatch(
    eventId,
    "Arsenal",
    "Chelsea",
    "12345",              // API-Football match ID
    kickoffTime,
    predictionDeadline,
    true,                 // allowScorePrediction (5 pts)
    true                  // allowOutcomePrediction (3 pts)
);
```

- Can only add matches after event starts
- All matches must finish before event ends
- Admin controls which prediction types are allowed
- At least one prediction type must be enabled

### 3. Submit Predictions (Before Match Deadline)

#### Score Prediction (5 points)

```solidity
eventManager.submitScorePrediction(matchId, 2, 1); // Arsenal 2-1 Chelsea
```

#### Outcome Prediction (3 points)

```solidity
eventManager.submitOutcomePrediction(matchId, Outcome.HOME_WIN);
```

**Rules:**

- Must have joined the event first
- Can submit one or both prediction types
- Each prediction type can only be submitted once per match
- Maximum 8 points per match (5 + 3)
- Predictions locked after deadline

### 4. AI Oracle Submits Results

```solidity
eventManager.submitMatchResult(
    matchId,
    2,                    // homeScore
    1,                    // awayScore
    resultProof
);
```

- Called after match finishes
- Points calculated **on-chain** automatically:
  - Check score prediction: 5 pts if exact match
  - Check outcome prediction: 3 pts if correct outcome
- Updates leaderboard with total points
- 2-hour dispute window opens

### 5. Resolve Event (After End Date)

```solidity
eventManager.resolveEvent(eventId);
```

- Can only resolve after event ends
- All matches must be verified
- Calculates prizes for top 5
- Winners can claim prizes

## Key Changes from Old Architecture

### Before (Old)

- Event = Single match
- Users paid entry fee per match
- Prediction submitted when joining
- Single prediction type
- Points calculated off-chain by AI Oracle

### After (New)

- Event = Competition with multiple matches
- Users pay ONE-TIME entry fee per event
- Join event first, then predict on matches separately
- **Dual prediction system**: Score (5 pts) + Outcome (3 pts)
- Admin controls which prediction types are allowed per match
- Points calculated **on-chain** automatically
- Maximum 8 points per match

## Benefits

1. **Flexibility**: Users choose prediction difficulty (score vs outcome)
2. **Higher Engagement**: Two prediction types per match
3. **Scalability**: One event can house many matches
4. **Dynamic Matches**: Admin adds matches as they're scheduled
5. **Better UX**: Users join once, predict multiple times
6. **Cost Efficiency**: ONE-TIME entry fee instead of per-match fees
7. **Tournament Support**: Natural fit for leagues, cups, etc.
8. **On-Chain Points**: Transparent, verifiable point calculation

## Example Scenario

```solidity
// 1. Admin creates "Premier League Week 10" event
uint256 eventId = eventManager.createPublicEvent(
    "Premier League Week 10",
    startDate,  // Saturday 8am
    endDate,    // Monday 11pm
    1e18,       // 1 cUSD entry fee
    ScoringRule.BOTH
);

// 2. Users join before Saturday 8am
eventManager.joinEvent(eventId); // Pays 1 cUSD

// 3. Admin adds matches after Saturday 8am
uint256 match1 = eventManager.addMatch(
    eventId, "Arsenal", "Chelsea", "12345",
    kickoff1, deadline1,
    true,  // Allow score prediction (5 pts)
    true   // Allow outcome prediction (3 pts)
);

uint256 match2 = eventManager.addMatch(
    eventId, "Man City", "Liverpool", "12346",
    kickoff2, deadline2,
    false, // No score prediction
    true   // Only outcome prediction (3 pts max)
);

// 4. Users predict on each match
// Match 1: Both predictions (max 8 points)
eventManager.submitScorePrediction(match1, 2, 1);
eventManager.submitOutcomePrediction(match1, Outcome.HOME_WIN);

// Match 2: Only outcome (max 3 points)
eventManager.submitOutcomePrediction(match2, Outcome.DRAW);

// 5. AI Oracle submits results
eventManager.submitMatchResult(match1, 2, 1, proof1);
// User gets 5 + 3 = 8 points (both correct)

eventManager.submitMatchResult(match2, 1, 1, proof2);
// User gets 3 points (outcome correct)

// Total: 11 points for this user

// 6. After Monday 11pm, resolve event
eventManager.resolveEvent(eventId);

// 7. Winners claim prizes
eventManager.claimPrize(eventId);
```

## Prediction Struct

```solidity
struct Prediction {
    // Score Prediction (5 points if correct)
    uint8 homeScore;
    uint8 awayScore;
    bool hasScorePrediction;
    uint256 scorePointsEarned;

    // Outcome Prediction (3 points if correct)
    Outcome outcome;  // HOME_WIN, DRAW, AWAY_WIN
    bool hasOutcomePrediction;
    uint256 outcomePointsEarned;

    uint256 submittedAt;  // Tiebreaker timestamp
}
```

## Contract Changes

### EventManager.sol

- Added `SCORE_POINTS = 5` and `OUTCOME_POINTS = 3` constants
- Added `Outcome` enum (HOME_WIN, DRAW, AWAY_WIN)
- Updated `Match` struct with `allowScorePrediction` and `allowOutcomePrediction`
- Updated `Prediction` struct to track both prediction types separately
- Split `submitPrediction()` into:
  - `submitScorePrediction(matchId, homeScore, awayScore)`
  - `submitOutcomePrediction(matchId, outcome)`
- Updated `submitMatchResult()` to calculate points on-chain
- Removed need for AI Oracle to calculate points off-chain

### IEventManager.sol

- Added `Outcome` enum
- Updated `Match` and `Prediction` structs
- Split prediction events:
  - `ScorePredictionSubmitted`
  - `OutcomePredictionSubmitted`
- Updated `MatchAdded` event to include prediction type flags

### Benefits of On-Chain Point Calculation

1. **Transparency**: Anyone can verify points are calculated correctly
2. **Trustless**: No need to trust AI Oracle with point calculation
3. **Simplicity**: AI Oracle only submits final score
4. **Gas Efficient**: Calculation done once per match for all users
5. **Auditable**: All point calculations are on-chain and verifiable

## Migration Notes

If upgrading from the old architecture:

1. Existing events will need data migration
2. Old predictions will need to be mapped to new dual prediction structure
3. Consider deploying as a new contract instead of upgrading
4. Update AI Oracle to only submit final scores (not points)

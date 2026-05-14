# Event & Match Architecture

## Overview

The TrueCall prediction platform has been refactored to separate **Events** (competitions/tournaments) from **Matches** (individual fixtures). This allows for a more flexible and scalable system.

## Architecture

### Event

An **Event** is a competition or tournament that houses multiple matches. Users join an event once by paying a ONE-TIME entry fee.

**Key Properties:**

- `eventName`: Name of the competition (e.g., "Premier League Week 10")
- `startDate`: When the event starts (users can join before this)
- `endDate`: When the event ends (all matches must finish before this)
- `entryFee`: ONE-TIME payment in cUSD
- `prizePool`: Accumulated entry fees from all participants
- `scoringRule`: Applied to all matches in this event

**Lifecycle:**

1. **OPEN**: Admin creates event, users can join (before startDate)
2. **OPEN** (after startDate): Admin can add matches, users can predict
3. **RESOLVED**: All matches verified, prizes calculated

### Match

A **Match** is an individual fixture within an event. Users submit predictions for each match.

**Key Properties:**

- `eventId`: Parent event
- `homeTeam` / `awayTeam`: Teams playing
- `apiMatchId`: API-Football match ID
- `kickoffTime`: When the match starts
- `predictionDeadline`: Last time to submit predictions
- `finalHomeScore` / `finalAwayScore`: Result (set by AI Oracle)

**Lifecycle:**

1. **OPEN**: Admin adds match, users can predict (before predictionDeadline)
2. **LOCKED**: Deadline passed, awaiting result
3. **VERIFIED**: AI Oracle submitted result
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
    predictionDeadline
);
```

- Can only add matches after event starts
- All matches must finish before event ends

### 3. Submit Predictions (Before Match Deadline)

```solidity
eventManager.submitPrediction(matchId, homeScore, awayScore);
```

- Must have joined the event first
- Can predict on any match in the event
- Prediction locked after deadline

### 4. AI Oracle Submits Results

```solidity
eventManager.submitMatchResult(
    matchId,
    homeScore,
    awayScore,
    resultProof,
    users,
    points,
    submissionTimestamps
);
```

- Called after match finishes
- Updates leaderboard with points
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

### After (New)

- Event = Competition with multiple matches
- Users pay ONE-TIME entry fee per event
- Join event first, then predict on matches separately
- Admin adds matches dynamically after event starts

## Benefits

1. **Scalability**: One event can house many matches
2. **Flexibility**: Admin can add matches as they're scheduled
3. **Better UX**: Users join once, predict multiple times
4. **Cost Efficiency**: ONE-TIME entry fee instead of per-match fees
5. **Tournament Support**: Natural fit for leagues, cups, etc.

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
uint256 match1 = eventManager.addMatch(eventId, "Arsenal", "Chelsea", ...);
uint256 match2 = eventManager.addMatch(eventId, "Man City", "Liverpool", ...);
uint256 match3 = eventManager.addMatch(eventId, "Spurs", "Man Utd", ...);

// 4. Users predict on each match
eventManager.submitPrediction(match1, 2, 1);
eventManager.submitPrediction(match2, 3, 3);
eventManager.submitPrediction(match3, 1, 0);

// 5. AI Oracle submits results for each match
eventManager.submitMatchResult(match1, ...);
eventManager.submitMatchResult(match2, ...);
eventManager.submitMatchResult(match3, ...);

// 6. After Monday 11pm, resolve event
eventManager.resolveEvent(eventId);

// 7. Winners claim prizes
eventManager.claimPrize(eventId);
```

## Contract Changes

### EventManager.sol

- Added `Match` struct and `MatchStatus` enum
- Added `nextMatchId` counter
- Added `matches` mapping
- Added `_eventMatches` mapping (eventId → matchId[])
- Changed `predictions` mapping (matchId → user → Prediction)
- Separated `joinEvent()` from `submitPrediction()`
- Added `addMatch()` function
- Renamed `submitVerifiedResult()` to `submitMatchResult()`
- Updated `resolveEvent()` to check all matches are verified

### IEventManager.sol

- Updated `Event` struct (removed match-specific fields)
- Added `Match` struct
- Added `MatchStatus` enum
- Updated events to reflect new architecture

### Tests

- Updated to create events first, then add matches
- Updated assertions to use `eventName` instead of `homeTeam`/`awayTeam`

## Migration Notes

If upgrading from the old architecture:

1. Existing events will need data migration
2. Old predictions will need to be mapped to new match structure
3. Consider deploying as a new contract instead of upgrading

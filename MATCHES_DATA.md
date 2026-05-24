# Match Data API Documentation

This document explains how to use the match data API to fetch and add matches for prediction events.

## Overview

The TrueCall platform includes a built-in match database with 20 realistic football matches from various leagues. You can use these matches to populate your prediction events without needing live API data.

## Match Data Structure

Each match contains:

```json
{
  "id": "match_001",
  "homeTeam": "Manchester United",
  "awayTeam": "Liverpool",
  "league": "Premier League",
  "season": "2024/25",
  "round": "Week 1",
  "kickoffTime": 1716057600,
  "predictionDeadline": 1716054000,
  "status": "scheduled",
  "venue": "Old Trafford",
  "homeTeamId": "man_utd",
  "awayTeamId": "liverpool"
}
```

### Field Descriptions

- **id**: Unique match identifier (e.g., "match_001")
- **homeTeam**: Home team name
- **awayTeam**: Away team name
- **league**: League name (Premier League, La Liga, Bundesliga, etc.)
- **season**: Season (e.g., "2024/25")
- **round**: Round/Week number
- **kickoffTime**: Unix timestamp of match start time
- **predictionDeadline**: Unix timestamp when predictions close (usually 5 minutes before kickoff)
- **status**: Match status ("scheduled", "live", "finished")
- **venue**: Stadium name
- **homeTeamId**: Home team identifier (lowercase, no spaces)
- **awayTeamId**: Away team identifier (lowercase, no spaces)

## API Endpoints

### Get All Matches

```bash
GET /api/matches
```

Returns all 20 available matches.

**Example:**

```bash
curl http://localhost:3001/api/matches
```

### Get Upcoming Matches

```bash
GET /api/matches/upcoming
```

Returns matches scheduled for the next 7 days.

**Example:**

```bash
curl http://localhost:3001/api/matches/upcoming
```

### Get Matches by League

```bash
GET /api/matches/league/:league
```

Returns matches for a specific league.

**Example:**

```bash
curl http://localhost:3001/api/matches/league/Premier%20League
```

### Get Random Matches

```bash
GET /api/matches/random?count=5
```

Returns random matches (useful for testing).

**Example:**

```bash
curl http://localhost:3001/api/matches/random?count=3
```

### Get Matches by Team

```bash
GET /api/matches/team/:teamId
```

Returns all matches for a specific team.

**Example:**

```bash
curl http://localhost:3001/api/matches/team/manchester_united
```

### Search Matches by Team Name

```bash
GET /api/matches/search?team=Manchester
```

Returns matches where either team name contains the search term.

**Example:**

```bash
curl http://localhost:3001/api/matches/search?team=Manchester
```

### Get Specific Match

```bash
GET /api/matches/:id
```

Returns a specific match by ID.

**Example:**

```bash
curl http://localhost:3001/api/matches/match_001
```

### Get Statistics

```bash
GET /api/matches/statistics
```

Returns statistics about available matches.

**Example:**

```bash
curl http://localhost:3001/api/matches/statistics
```

**Response:**

```json
{
  "totalMatches": 20,
  "leagues": [
    "Premier League",
    "La Liga",
    "Bundesliga",
    "Ligue 1",
    "Serie A",
    "Eredivisie",
    "Primeira Liga",
    "Scottish Premiership",
    "Super Lig"
  ],
  "statuses": ["scheduled"],
  "matchesByLeague": [
    { "league": "Premier League", "count": 10 },
    { "league": "La Liga", "count": 2 },
    { "league": "Bundesliga", "count": 1 },
    { "league": "Ligue 1", "count": 1 },
    { "league": "Serie A", "count": 2 },
    { "league": "Eredivisie", "count": 1 },
    { "league": "Primeira Liga", "count": 1 },
    { "league": "Scottish Premiership", "count": 1 },
    { "league": "Super Lig", "count": 1 }
  ]
}
```

## Frontend Usage

### Import the API Functions

```typescript
import {
  fetchAllMatches,
  fetchUpcomingMatches,
  fetchMatchesByLeague,
  fetchRandomMatches,
  searchMatches,
} from "@/lib/matchesApi";
```

### Fetch All Matches

```typescript
const matches = await fetchAllMatches();
console.log(`Found ${matches.length} matches`);
```

### Fetch Upcoming Matches

```typescript
const upcomingMatches = await fetchUpcomingMatches();
upcomingMatches.forEach((match) => {
  console.log(
    `${match.homeTeam} vs ${match.awayTeam} at ${new Date(match.kickoffTime * 1000)}`,
  );
});
```

### Fetch Matches by League

```typescript
const premierLeagueMatches = await fetchMatchesByLeague("Premier League");
```

### Search Matches

```typescript
const manchesterMatches = await searchMatches("Manchester");
```

### Get Random Matches for Testing

```typescript
const randomMatches = await fetchRandomMatches(5);
```

## Adding Matches to an Event

### Step 1: Create an Event

1. Go to http://localhost:3000/create-event
2. Fill in event details (name, dates, entry fee, etc.)
3. Click "Create Event On-Chain"
4. Note the event ID

### Step 2: Fetch Matches

```typescript
const matches = await fetchUpcomingMatches();
```

### Step 3: Add Matches to Event

1. Go to the event detail page: http://localhost:3000/events/[EVENT_ID]
2. Wait for the event to start (or the start time to pass)
3. Click "+ Add Match" button
4. Fill in the match details:
   - **Home Team**: From match data (e.g., "Manchester United")
   - **Away Team**: From match data (e.g., "Liverpool")
   - **API Match ID**: From match data (e.g., "match_001")
   - **Kickoff Time**: From match data (kickoffTime converted to datetime)
   - **Prediction Deadline**: From match data (predictionDeadline converted to datetime)
   - **Allow Score Prediction**: Check if you want score predictions
   - **Allow Outcome Prediction**: Check if you want outcome predictions
5. Click "Add Match"

### Example: Programmatic Match Addition

```typescript
import { fetchUpcomingMatches } from "@/lib/matchesApi";

async function addMatchesToEvent(eventId: number) {
  const matches = await fetchUpcomingMatches();

  for (const match of matches.slice(0, 5)) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/addMatch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          apiMatchId: match.id,
          kickoffTime: match.kickoffTime,
          predictionDeadline: match.predictionDeadline,
          allowScorePrediction: true,
          allowOutcomePrediction: true,
        }),
      },
    );

    if (response.ok) {
      console.log(`✅ Added match: ${match.homeTeam} vs ${match.awayTeam}`);
    } else {
      console.error(
        `❌ Failed to add match: ${match.homeTeam} vs ${match.awayTeam}`,
      );
    }
  }
}
```

## Available Leagues

The match database includes matches from these leagues:

1. **Premier League** (10 matches) - England
2. **La Liga** (2 matches) - Spain
3. **Bundesliga** (1 match) - Germany
4. **Ligue 1** (1 match) - France
5. **Serie A** (2 matches) - Italy
6. **Eredivisie** (1 match) - Netherlands
7. **Primeira Liga** (1 match) - Portugal
8. **Scottish Premiership** (1 match) - Scotland
9. **Super Lig** (1 match) - Turkey

## Available Teams

### Premier League

- Manchester United, Liverpool, Arsenal, Chelsea, Manchester City, Tottenham, Newcastle United, Brighton, Aston Villa, Everton, Fulham, Brentford, West Ham, Ipswich Town, Bournemouth, Nottingham Forest, Wolverhampton, Crystal Palace, Leicester City, Southampton

### Other Leagues

- Real Madrid, Barcelona, Atletico Madrid, Sevilla, Bayern Munich, Borussia Dortmund, Paris Saint-Germain, Marseille, AC Milan, Inter Milan, Juventus, Roma, Ajax, PSV Eindhoven, Benfica, Porto, Celtic, Rangers, Galatasaray, Fenerbahçe

## Testing Workflow

### 1. Create Event

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "Test Event",
    "startDate": 1716057600,
    "endDate": 1716144000,
    "entryToken": "0x0000000000000000000000000000000000000000",
    "entryFee": "1",
    "scoringRule": 2
  }'
```

### 2. Get Upcoming Matches

```bash
curl http://localhost:3001/api/matches/upcoming
```

### 3. Add Matches to Event

```bash
curl -X POST http://localhost:3001/api/events/1/addMatch \
  -H "Content-Type: application/json" \
  -d '{
    "homeTeam": "Manchester United",
    "awayTeam": "Liverpool",
    "apiMatchId": "match_001",
    "kickoffTime": 1716057600,
    "predictionDeadline": 1716054000,
    "allowScorePrediction": true,
    "allowOutcomePrediction": true
  }'
```

### 4. Join Event and Make Predictions

- Connect user wallet
- Join event
- Make predictions on matches
- Wait for match results
- Check leaderboard

## Notes

- All timestamps are **Unix timestamps** (seconds since epoch)
- Prediction deadlines are typically 5 minutes before kickoff
- You can add multiple matches to a single event
- Matches can be added anytime after the event starts
- The match database is static and doesn't update automatically
- For live match data, integrate with a real football API (e.g., API-Football, ESPN API)

## Future Integration

To integrate with live match data:

1. Replace `matches.json` with API calls to a real football data provider
2. Update `MatchesService` to fetch from external API
3. Add caching to reduce API calls
4. Implement automatic match result updates
5. Add real-time score updates

## Support

For issues or questions:

1. Check the TEST_FLOW.md for end-to-end testing
2. Review the match data structure above
3. Check backend logs for errors
4. Verify timestamps are in the future

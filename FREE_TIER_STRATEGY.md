# Free Tier Strategy - 100 Calls/Day

## Database-First Approach with Hourly Sync

---

## 🎯 Strategy Overview

**Limit**: 100 API calls/day (FREE tier)
**Approach**: Fetch once, store in database, serve all users from database
**Sync frequency**: Every 1 hour for finished matches

---

## 📊 API Call Budget (100/day)

### Daily Schedule

| Time              | Task                     | Calls      | Purpose                                     |
| ----------------- | ------------------------ | ---------- | ------------------------------------------- |
| **Every 6 hours** | Fetch upcoming matches   | 4/day      | Load new matches for users to create events |
| **Every 1 hour**  | Fetch finished matches   | 24/day     | For AI agent to submit results              |
| **Buffer**        | Emergency/manual fetches | 72/day     | Safety margin                               |
| **Total**         |                          | **28/day** | Only 28% of limit!                          |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    API-Football                      │
│              (100 calls/day limit)                   │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ Scheduled Sync Jobs
                      │ (28 calls/day)
                      ▼
┌─────────────────────────────────────────────────────┐
│            PostgreSQL Database Cache                 │
│  ┌─────────────────────────────────────────────┐   │
│  │ match_id | match_data | status | updated_at │   │
│  ├─────────────────────────────────────────────┤   │
│  │ api_123  | {...}      | NS     | 10:00 AM   │   │
│  │ api_456  | {...}      | FT     | 11:00 AM   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ Instant reads (0 API calls)
                      ▼
┌─────────────────────────────────────────────────────┐
│              Backend API (NestJS)                    │
│         - Serves from database only                  │
│         - Never hits external API directly           │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ 0 API calls per user
                      ▼
┌─────────────────────────────────────────────────────┐
│                  Frontend + AI Agent                 │
│         Unlimited requests (from database)           │
└─────────────────────────────────────────────────────┘
```

---

## 💾 Database Schema

```sql
-- Create matches cache table
CREATE TABLE matches_cache (
  id SERIAL PRIMARY KEY,
  api_match_id VARCHAR(100) UNIQUE NOT NULL,
  match_data JSONB NOT NULL,
  status VARCHAR(20) NOT NULL, -- NS, LIVE, FT, etc.
  league VARCHAR(100),
  kickoff_time TIMESTAMP,
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_match_status ON matches_cache(status);
CREATE INDEX idx_match_kickoff ON matches_cache(kickoff_time);
CREATE INDEX idx_match_league ON matches_cache(league);
CREATE INDEX idx_match_updated ON matches_cache(updated_at);

-- Track API usage
CREATE TABLE api_call_log (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(200),
  call_time TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  matches_fetched INTEGER DEFAULT 0
);
```

---

## 🔄 Implementation

### 1. Database Cache Service

```typescript
// backend/src/matches/database-cache.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { Cron } from "@nestjs/schedule";
import { ApiFootballService } from "./api-football.service";

@Injectable()
export class DatabaseCacheService {
  private readonly logger = new Logger(DatabaseCacheService.name);
  private dailyCallCount = 0;
  private dailyLimit = 100;

  constructor(
    @InjectRepository(MatchCache)
    private matchRepo: Repository<MatchCache>,
    private apiFootball: ApiFootballService,
  ) {}

  /**
   * SCHEDULED JOB: Fetch upcoming matches every 6 hours
   * API Calls: 4 per day
   */
  @Cron("0 */6 * * *") // Every 6 hours: 12 AM, 6 AM, 12 PM, 6 PM
  async syncUpcomingMatches() {
    if (!this.canMakeApiCall()) {
      this.logger.warn("⚠️ Daily API limit reached, skipping sync");
      return;
    }

    this.logger.log("🔄 Syncing upcoming matches from API...");

    try {
      const matches = await this.apiFootball.getUpcomingMatches();
      await this.storeMatches(matches);

      this.trackApiCall("upcoming", matches.length);
      this.logger.log(`✅ Synced ${matches.length} upcoming matches`);
    } catch (error) {
      this.logger.error("Failed to sync upcoming matches", error);
    }
  }

  /**
   * SCHEDULED JOB: Fetch finished matches every 1 hour
   * API Calls: 24 per day
   * Purpose: For AI agent to submit results
   */
  @Cron("0 * * * *") // Every hour on the hour
  async syncFinishedMatches() {
    if (!this.canMakeApiCall()) {
      this.logger.warn("⚠️ Daily API limit reached, skipping sync");
      return;
    }

    this.logger.log("🔄 Syncing finished matches from API...");

    try {
      const matches = await this.apiFootball.getFinishedMatches();
      await this.storeMatches(matches);

      this.trackApiCall("finished", matches.length);
      this.logger.log(`✅ Synced ${matches.length} finished matches`);
    } catch (error) {
      this.logger.error("Failed to sync finished matches", error);
    }
  }

  /**
   * Store matches in database
   */
  private async storeMatches(matches: any[]) {
    for (const match of matches) {
      await this.matchRepo.upsert(
        {
          api_match_id: match.id,
          match_data: match,
          status: match.status,
          league: match.league,
          kickoff_time: match.kickoffTime
            ? new Date(match.kickoffTime * 1000)
            : null,
          home_team: match.homeTeam,
          away_team: match.awayTeam,
          home_score: match.finalHomeScore,
          away_score: match.finalAwayScore,
          updated_at: new Date(),
        },
        ["api_match_id"],
      );
    }
  }

  /**
   * Get upcoming matches from database (NO API CALLS)
   */
  async getUpcomingMatches(): Promise<any[]> {
    this.logger.log("📖 Reading upcoming matches from database");

    const matches = await this.matchRepo.find({
      where: {
        status: In(["NS", "TBD"]), // Not Started
        kickoff_time: MoreThan(new Date()),
      },
      order: {
        kickoff_time: "ASC",
      },
    });

    return matches.map((m) => m.match_data);
  }

  /**
   * Get finished matches from database (NO API CALLS)
   */
  async getFinishedMatches(): Promise<any[]> {
    this.logger.log("📖 Reading finished matches from database");

    const matches = await this.matchRepo.find({
      where: {
        status: "FT",
      },
      order: {
        updated_at: "DESC",
      },
      take: 100, // Last 100 finished matches
    });

    return matches.map((m) => m.match_data);
  }

  /**
   * Get specific match by API ID from database
   */
  async getMatchById(apiMatchId: string): Promise<any | null> {
    this.logger.log(`📖 Reading match ${apiMatchId} from database`);

    const match = await this.matchRepo.findOne({
      where: { api_match_id: apiMatchId },
    });

    return match ? match.match_data : null;
  }

  /**
   * Check if we can make an API call today
   */
  private canMakeApiCall(): boolean {
    return this.dailyCallCount < this.dailyLimit;
  }

  /**
   * Track API call usage
   */
  private trackApiCall(endpoint: string, matchesFetched: number) {
    this.dailyCallCount++;
    this.logger.log(
      `📊 API calls today: ${this.dailyCallCount}/${this.dailyLimit}`,
    );

    // Log to database for analytics
    // await this.apiCallLogRepo.insert({ endpoint, matches_fetched: matchesFetched });
  }

  /**
   * Reset daily counter at midnight
   */
  @Cron("0 0 * * *") // Midnight
  async resetDailyCounter() {
    this.logger.log("🔄 Resetting daily API call counter");
    this.dailyCallCount = 0;
  }

  /**
   * Get API usage stats
   */
  getUsageStats() {
    return {
      callsToday: this.dailyCallCount,
      limit: this.dailyLimit,
      remaining: this.dailyLimit - this.dailyCallCount,
      percentUsed: (this.dailyCallCount / this.dailyLimit) * 100,
    };
  }
}
```

---

### 2. Update Matches Controller

```typescript
// backend/src/matches/matches.controller.ts

@Controller("matches")
export class MatchesController {
  constructor(private databaseCache: DatabaseCacheService) {}

  /**
   * Get upcoming matches - FROM DATABASE ONLY
   * API Calls: 0 (served from database)
   */
  @Get()
  async getAllMatches(@Query("upcoming") upcoming?: string) {
    if (upcoming === "true") {
      // Read from database - NO API CALL
      return await this.databaseCache.getUpcomingMatches();
    }

    // Default: all matches from database
    return await this.databaseCache.getAllMatches();
  }

  /**
   * Get finished matches - FROM DATABASE ONLY
   * API Calls: 0 (served from database)
   */
  @Get("finished")
  async getFinishedMatches() {
    return await this.databaseCache.getFinishedMatches();
  }

  /**
   * Get specific match - FROM DATABASE ONLY
   * API Calls: 0 (served from database)
   */
  @Get(":id")
  async getMatchById(@Param("id") id: string) {
    return await this.databaseCache.getMatchById(id);
  }

  /**
   * Get API usage statistics
   */
  @Get("stats/usage")
  getApiUsage() {
    return this.databaseCache.getUsageStats();
  }
}
```

---

### 3. Update AI Agent

```typescript
// ai-agent/src/services/matchDataService.ts

export class MatchDataService {
  private backendApiUrl: string;

  constructor(backendApiUrl: string) {
    this.backendApiUrl = backendApiUrl;
  }

  /**
   * Fetch finished matches from backend database
   * Backend serves from database - NO API CALLS to external API
   */
  async getFinishedMatches(): Promise<Match[]> {
    try {
      const response = await fetch(`${this.backendApiUrl}/matches/finished`);
      const matches = await response.json();

      console.log(
        `✅ Loaded ${matches.length} finished matches from backend database`,
      );
      return matches;
    } catch (error) {
      console.error("Failed to fetch finished matches:", error);
      return [];
    }
  }

  /**
   * Get specific match by ID from backend database
   */
  async getByApiId(apiId: string): Promise<Match | null> {
    try {
      const response = await fetch(`${this.backendApiUrl}/matches/${apiId}`);

      if (!response.ok) return null;

      const match = await response.json();
      console.log(`✅ Loaded match ${apiId} from backend database`);
      return match;
    } catch (error) {
      console.error(`Failed to fetch match ${apiId}:`, error);
      return null;
    }
  }
}
```

---

## 📅 Daily Schedule Example

### Typical Day with 100 API Calls Limit

```
12:00 AM - Sync upcoming matches (1 call) ✅
01:00 AM - Sync finished matches (1 call) ✅
02:00 AM - Sync finished matches (1 call) ✅
03:00 AM - Sync finished matches (1 call) ✅
04:00 AM - Sync finished matches (1 call) ✅
05:00 AM - Sync finished matches (1 call) ✅
06:00 AM - Sync upcoming + finished (2 calls) ✅✅
07:00 AM - Sync finished matches (1 call) ✅
08:00 AM - Sync finished matches (1 call) ✅
09:00 AM - Sync finished matches (1 call) ✅
10:00 AM - Sync finished matches (1 call) ✅
11:00 AM - Sync finished matches (1 call) ✅
12:00 PM - Sync upcoming + finished (2 calls) ✅✅
01:00 PM - Sync finished matches (1 call) ✅
02:00 PM - Sync finished matches (1 call) ✅
03:00 PM - Sync finished matches (1 call) ✅
04:00 PM - Sync finished matches (1 call) ✅
05:00 PM - Sync finished matches (1 call) ✅
06:00 PM - Sync upcoming + finished (2 calls) ✅✅
07:00 PM - Sync finished matches (1 call) ✅
08:00 PM - Sync finished matches (1 call) ✅
09:00 PM - Sync finished matches (1 call) ✅
10:00 PM - Sync finished matches (1 call) ✅
11:00 PM - Sync finished matches (1 call) ✅

Total: 28 API calls/day
Buffer: 72 calls remaining
```

---

## 🎮 User Experience

### For Users Creating Events

1. User visits "Create Event" page
2. Clicks "Load Matches"
3. **Frontend → Backend → Database** (0 API calls)
4. Sees all upcoming matches instantly
5. Database updated every 6 hours (fresh enough)

### For AI Agent Submitting Results

1. AI agent checks for finished matches every 30 min
2. **AI Agent → Backend → Database** (0 API calls)
3. Database updated every 1 hour (fresh FT matches)
4. Submits results when match status = "FT"

### For Users Viewing Matches

- Unlimited views (all from database)
- No waiting, instant load
- Always available (even if API is down)

---

## 📊 Benefits of This Approach

### ✅ Pros

1. **Stay well under limit**: 28/100 calls = 72% buffer
2. **Fast for users**: Database reads are instant
3. **Resilient**: If API is down, users still see cached data
4. **Scalable**: Can support 1000s of users with same API limit
5. **Predictable**: Know exactly how many calls per day
6. **Cost-effective**: Start with free tier, upgrade when needed

### ⚠️ Trade-offs

1. **Delayed updates**: Upcoming matches refresh every 6 hours
2. **Finished match delay**: Up to 1 hour before AI agent sees FT status
3. **No live scores**: Can't track minute-by-minute live updates

---

## 🚀 Migration Path

### Phase 1: Free Tier (100 calls/day) - NOW

- Budget: $0/month
- Users: Testing + early adopters
- Matches: Database-first approach
- Update frequency: Upcoming 6h, Finished 1h

### Phase 2: Growth ($19/month - 7,500 calls/day)

- Budget: $19/month
- Users: 100-1000 users
- Add: Live match updates every 5 minutes
- Update frequency: Upcoming 1h, Finished 30min, Live 5min

### Phase 3: Scale (Custom pricing)

- Budget: Based on usage
- Users: 1000+ users
- Real-time updates
- Multiple leagues

---

## 🔧 Setup Instructions

### 1. Create Database Migration

```bash
cd backend
npx typeorm migration:create src/migrations/CreateMatchesCache
```

Add the SQL schema above to the migration file.

### 2. Run Migration

```bash
npx typeorm migration:run
```

### 3. Install Dependencies

```bash
pnpm install @nestjs/schedule
```

### 4. Update Module

```typescript
// backend/src/app.module.ts
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable cron jobs
    // ... other imports
  ],
})
export class AppModule {}
```

### 5. Create New API Account

1. Sign up for new API-Football account
2. Get fresh 100 calls/day limit
3. Update `.env` with new API key
4. Deploy and test

---

## 📈 Monitoring

### Check API Usage

```bash
curl http://localhost:3001/api/matches/stats/usage

# Response:
{
  "callsToday": 28,
  "limit": 100,
  "remaining": 72,
  "percentUsed": 28
}
```

### Check Database Cache

```sql
-- How many matches in cache?
SELECT status, COUNT(*) FROM matches_cache GROUP BY status;

-- When was last update?
SELECT MAX(updated_at) FROM matches_cache;

-- Upcoming matches count
SELECT COUNT(*) FROM matches_cache WHERE status = 'NS';

-- Finished matches today
SELECT COUNT(*) FROM matches_cache
WHERE status = 'FT'
AND updated_at > NOW() - INTERVAL '24 hours';
```

---

## ✅ Testing Checklist

- [ ] Database migration runs successfully
- [ ] Cron jobs are scheduled (check logs)
- [ ] First sync completes without errors
- [ ] Frontend loads matches from database
- [ ] AI agent reads finished matches from database
- [ ] API usage stays under 100/day
- [ ] Users see instant results (no API delays)

---

## 💡 Pro Tips

1. **Start fresh**: New API account = fresh 100 calls
2. **Monitor daily**: Check `/stats/usage` endpoint
3. **Adjust if needed**: Can reduce finished match sync to every 2 hours (12 calls/day) if needed
4. **Database is truth**: All reads from database, never direct API calls
5. **Upgrade when ready**: Once pattern works, upgrade to paid tier

---

## 🎯 Summary

**Strategy**: Database-first, scheduled sync approach
**API Calls**: 28/day (28% of free tier)
**Freshness**: Upcoming every 6h, Finished every 1h
**User Impact**: Zero - all served from fast database
**Cost**: $0/month (free tier)
**Scalability**: Can support 1000s of users

**Perfect for testing your pattern before paying!** 🚀

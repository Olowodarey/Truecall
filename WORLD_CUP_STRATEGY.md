# World Cup & International Friendlies Strategy

## Focused Approach for Free Tier (100 calls/day)

---

## 🎯 Target Competitions

### Priority Leagues (Launch Focus)

1. **World Cup 2026** - Starting in 4 days! 🏆
2. **International Friendlies** - High-profile matches
3. **UEFA Nations League** (Optional)
4. **AFCON** (Optional)

### Why This Approach?

✅ **Fewer matches** = Fewer API calls
✅ **High interest** = More user engagement
✅ **Global appeal** = Attracts worldwide users
✅ **Tournament format** = Predictable schedule
✅ **Perfect for testing** = Real matches, real results

---

## 📊 API Call Budget - World Cup Focus

### Estimated Match Volume

**World Cup 2026**:

- 64 matches total over ~30 days
- ~2-4 matches per day average
- Peak: 8 matches per day (group stage)

**International Friendlies**:

- ~10-15 matches per week
- Usually on FIFA match days

### Daily API Calls (World Cup Period)

| Activity              | Frequency     | Calls/Day  | Purpose           |
| --------------------- | ------------- | ---------- | ----------------- |
| **World Cup matches** | Every 2 hours | 12/day     | During tournament |
| **Finished matches**  | Every 1 hour  | 24/day     | For AI agent      |
| **Friendlies**        | Every 6 hours | 4/day      | Bonus matches     |
| **Total**             |               | **40/day** | 40% of limit      |
| **Buffer**            |               | **60/day** | Safety margin     |

---

## 🏆 API-Football League IDs

### World Cup & International Competitions

```typescript
// backend/src/matches/league-config.ts

export const PRIORITY_LEAGUES = {
  // World Cup
  WORLD_CUP_2026: 1, // FIFA World Cup

  // International Friendlies
  FRIENDLIES: 10, // International Friendlies

  // Optional (Add later if budget allows)
  NATIONS_LEAGUE: 5, // UEFA Nations League
  AFCON: 6, // Africa Cup of Nations
  COPA_AMERICA: 9, // Copa America
  EUROS: 4, // UEFA European Championship
} as const;

// Start with these only
export const ACTIVE_LEAGUES = [
  PRIORITY_LEAGUES.WORLD_CUP_2026,
  PRIORITY_LEAGUES.FRIENDLIES,
];
```

---

## 🔧 Implementation

### 1. League-Specific API Service

```typescript
// backend/src/matches/world-cup-api.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

@Injectable()
export class WorldCupApiService {
  private readonly logger = new Logger(WorldCupApiService.name);
  private readonly client: AxiosInstance;
  private readonly worldCupLeagueId = 1;
  private readonly friendliesLeagueId = 10;
  private readonly season = 2026;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("API_FOOTBALL_KEY");

    this.client = axios.create({
      baseURL: "https://v3.football.api-sports.io",
      headers: { "x-apisports-key": apiKey },
      timeout: 30000,
    });
  }

  /**
   * Get World Cup matches for a specific date
   */
  async getWorldCupMatches(date: string): Promise<any[]> {
    try {
      const response = await this.client.get("/fixtures", {
        params: {
          league: this.worldCupLeagueId,
          season: this.season,
          date, // Format: YYYY-MM-DD
        },
      });

      this.logger.log(
        `Fetched ${response.data.results} World Cup matches for ${date}`,
      );
      return response.data.response;
    } catch (error) {
      this.logger.error("Failed to fetch World Cup matches", error.message);
      return [];
    }
  }

  /**
   * Get International Friendlies for a date range
   */
  async getInternationalFriendlies(from: string, to: string): Promise<any[]> {
    try {
      const response = await this.client.get("/fixtures", {
        params: {
          league: this.friendliesLeagueId,
          season: this.season,
          from,
          to,
        },
      });

      this.logger.log(
        `Fetched ${response.data.results} International Friendlies`,
      );
      return response.data.response;
    } catch (error) {
      this.logger.error(
        "Failed to fetch International Friendlies",
        error.message,
      );
      return [];
    }
  }

  /**
   * Get all priority matches (World Cup + Friendlies)
   */
  async getAllPriorityMatches(date: string): Promise<any[]> {
    const [worldCup, friendlies] = await Promise.all([
      this.getWorldCupMatches(date),
      this.getInternationalFriendlies(date, date),
    ]);

    return [...worldCup, ...friendlies];
  }

  /**
   * Get finished matches for specific leagues only
   */
  async getFinishedPriorityMatches(): Promise<any[]> {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const from = yesterday.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];

      // Fetch both leagues
      const [worldCupResponse, friendliesResponse] = await Promise.all([
        this.client.get("/fixtures", {
          params: {
            league: this.worldCupLeagueId,
            season: this.season,
            from,
            to,
            status: "FT",
          },
        }),
        this.client.get("/fixtures", {
          params: {
            league: this.friendliesLeagueId,
            season: this.season,
            from,
            to,
            status: "FT",
          },
        }),
      ]);

      const allMatches = [
        ...worldCupResponse.data.response,
        ...friendliesResponse.data.response,
      ];

      this.logger.log(`Fetched ${allMatches.length} finished priority matches`);
      return allMatches;
    } catch (error) {
      this.logger.error(
        "Failed to fetch finished priority matches",
        error.message,
      );
      return [];
    }
  }
}
```

---

### 2. Optimized Database Cache with League Filter

```typescript
// backend/src/matches/database-cache.service.ts

@Injectable()
export class DatabaseCacheService {
  constructor(
    @InjectRepository(MatchCache)
    private matchRepo: Repository<MatchCache>,
    private worldCupApi: WorldCupApiService,
  ) {}

  /**
   * Sync World Cup matches every 2 hours during tournament
   */
  @Cron("0 */2 * * *") // Every 2 hours
  async syncWorldCupMatches() {
    if (!this.canMakeApiCall(2)) return; // Need 2 calls

    const today = new Date().toISOString().split("T")[0];

    this.logger.log("🏆 Syncing World Cup & Friendlies matches...");

    const matches = await this.worldCupApi.getAllPriorityMatches(today);
    await this.storeMatches(matches);

    this.trackApiCalls(2); // World Cup + Friendlies
    this.logger.log(`✅ Synced ${matches.length} priority matches`);
  }

  /**
   * Sync finished matches every 1 hour
   */
  @Cron("0 * * * *") // Every hour
  async syncFinishedMatches() {
    if (!this.canMakeApiCall(2)) return;

    this.logger.log("🔄 Syncing finished priority matches...");

    const matches = await this.worldCupApi.getFinishedPriorityMatches();
    await this.storeMatches(matches);

    this.trackApiCalls(2);
    this.logger.log(`✅ Synced ${matches.length} finished matches`);
  }

  /**
   * Get matches filtered by league
   */
  async getMatchesByLeague(leagueName: string): Promise<any[]> {
    const matches = await this.matchRepo.find({
      where: {
        league: leagueName,
        status: In(["NS", "TBD", "LIVE"]),
      },
      order: {
        kickoff_time: "ASC",
      },
    });

    return matches.map((m) => m.match_data);
  }

  /**
   * Get all World Cup and Friendlies matches
   */
  async getPriorityMatches(): Promise<any[]> {
    const matches = await this.matchRepo.find({
      where: [{ league: "World Cup" }, { league: "Friendlies" }],
      order: {
        kickoff_time: "ASC",
      },
    });

    return matches.map((m) => m.match_data);
  }
}
```

---

### 3. Frontend League Filter

```typescript
// frontend/app/creator-events/create/page.tsx

const [selectedLeague, setSelectedLeague] = useState<string>('all');

const PRIORITY_LEAGUES = [
  { value: 'all', label: '🌍 All Priority Matches' },
  { value: 'World Cup', label: '🏆 World Cup 2026' },
  { value: 'Friendlies', label: '🤝 International Friendlies' },
];

const loadFixtures = async () => {
  setLoading(true);

  try {
    // Fetch only priority leagues
    const url = selectedLeague === 'all'
      ? '/api/matches/priority'
      : `/api/matches?league=${selectedLeague}`;

    const response = await fetch(url);
    const data = await response.json();

    setFixtures(data);
    console.log(`✅ Loaded ${data.length} ${selectedLeague} matches`);
  } catch (error) {
    console.error('Error loading fixtures:', error);
  } finally {
    setLoading(false);
  }
};

// UI
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Select Competition
  </label>
  <select
    value={selectedLeague}
    onChange={(e) => setSelectedLeague(e.target.value)}
    className="w-full p-2 border rounded"
  >
    {PRIORITY_LEAGUES.map(league => (
      <option key={league.value} value={league.value}>
        {league.label}
      </option>
    ))}
  </select>
</div>
```

---

## 📅 World Cup Schedule Optimization

### Tournament Phases

#### Group Stage (Days 1-14)

- 4 matches per day
- Sync every 2 hours
- **API calls**: 12/day (syncing today's matches)

#### Round of 16 (Days 15-18)

- 2 matches per day
- Sync every 2 hours
- **API calls**: 12/day

#### Quarter Finals (Days 19-20)

- 2 matches per day
- Sync every 2 hours
- **API calls**: 12/day

#### Semi Finals (Day 21-22)

- 2 matches per day
- Sync every 2 hours
- **API calls**: 12/day

#### Final (Day 23)

- 1 match
- Sync every hour
- **API calls**: 24/day

---

## 🎮 User Experience

### Match Selection

```
┌─────────────────────────────────────────┐
│  🏆 World Cup 2026 - Group Stage        │
├─────────────────────────────────────────┤
│  ⚽ Brazil vs Argentina                 │
│     📅 Jun 11, 3:00 PM                  │
│     🏟️ MetLife Stadium                  │
│                                         │
│  ⚽ Germany vs France                   │
│     📅 Jun 11, 6:00 PM                  │
│     🏟️ AT&T Stadium                     │
├─────────────────────────────────────────┤
│  🤝 International Friendlies            │
├─────────────────────────────────────────┤
│  ⚽ England vs Spain                    │
│     📅 Jun 12, 8:00 PM                  │
│     🏟️ Wembley Stadium                  │
└─────────────────────────────────────────┘
```

---

## 📊 Expected API Usage

### During World Cup (30 days)

| Phase          | Days   | Matches/Day | API Calls/Day | Total Calls |
| -------------- | ------ | ----------- | ------------- | ----------- |
| Group Stage    | 14     | 4           | 36            | 504         |
| Round of 16    | 4      | 2           | 36            | 144         |
| Quarter Finals | 2      | 2           | 36            | 72          |
| Semi Finals    | 2      | 2           | 36            | 72          |
| Final          | 1      | 1           | 36            | 36          |
| **Total**      | **23** |             |               | **828**     |

**Average**: 36 calls/day (36% of limit)
**Peak**: 48 calls/day (48% of limit)
**Buffer**: Always 50%+ remaining

---

## 🚀 Deployment Checklist

### Environment Variables

```bash
# backend/.env

# Focus on World Cup & Friendlies
PRIORITY_LEAGUES=1,10  # World Cup, Friendlies
WORLD_CUP_SEASON=2026
ENABLE_LEAGUE_FILTER=true

# Sync intervals (World Cup optimized)
SYNC_PRIORITY_INTERVAL=7200000   # 2 hours
SYNC_FINISHED_INTERVAL=3600000   # 1 hour
```

### Database Seed (Optional)

```sql
-- Pre-populate World Cup fixture list (0 API calls)
-- Get fixture list from FIFA website manually
INSERT INTO matches_cache (api_match_id, league, home_team, away_team, kickoff_time, status)
VALUES
  ('wc_001', 'World Cup', 'Brazil', 'Argentina', '2026-06-11 15:00:00', 'NS'),
  ('wc_002', 'World Cup', 'Germany', 'France', '2026-06-11 18:00:00', 'NS'),
  -- ... add all 64 World Cup matches
;
```

---

## 💡 Pro Tips

### 1. Manual Fixture Upload

- Download World Cup schedule from FIFA
- Import to database manually
- **Saves ~20 API calls**
- Only need to fetch results, not fixtures

### 2. Peak Hour Optimization

- Most matches during specific hours
- Sync more frequently 12 PM - 10 PM
- Reduce syncing overnight

### 3. Tournament Mode

```typescript
// Enable tournament mode during World Cup
const TOURNAMENT_MODE = {
  enabled: true,
  startDate: "2026-06-11",
  endDate: "2026-07-19",
  // More aggressive syncing during tournament
  syncInterval: 2 * 60 * 60 * 1000, // 2 hours
};
```

### 4. Post-Tournament

```typescript
// After World Cup ends
const POST_TOURNAMENT = {
  enabled: false,
  // Switch to Friendlies only
  syncInterval: 6 * 60 * 60 * 1000, // 6 hours
};
```

---

## 📈 Growth Path

### Launch (Now - World Cup)

- **Focus**: World Cup + Friendlies
- **API calls**: 36/day average
- **Cost**: $0 (free tier)
- **Goal**: Test with real tournament

### Post World Cup (After tournament)

- **Focus**: International Friendlies + Nations League
- **API calls**: 20/day average
- **Cost**: $0 (free tier)
- **Goal**: Maintain engagement

### Expansion (When successful)

- **Add**: Top 5 European leagues
- **API calls**: 100-200/day
- **Cost**: Upgrade to $19/month
- **Goal**: Scale to more users

---

## 🎯 Success Metrics

Track these during World Cup:

1. **API efficiency**
   - Target: < 40 calls/day
   - Monitor: `/api/matches/stats/usage`

2. **User engagement**
   - Events created per match
   - Predictions submitted
   - Winner calculation accuracy

3. **System reliability**
   - Uptime during matches
   - Result submission speed
   - Cache hit rate

---

## 🏆 Why This is Perfect

✅ **World Cup timing**: Perfect launch moment!
✅ **High engagement**: Everyone watches World Cup
✅ **API efficient**: Only 64 matches total
✅ **Predictable**: Know schedule in advance
✅ **Global appeal**: Attract users worldwide
✅ **Proof of concept**: Real tournament, real results
✅ **Media attention**: World Cup = Free marketing
✅ **Scalable**: Can add leagues after success

---

## 🚀 Launch Timeline

### Day -4 to 0 (Before World Cup)

- [ ] Implement league filtering
- [ ] Set up database cache
- [ ] Configure World Cup league ID
- [ ] Test with friendlies
- [ ] Deploy to production

### Day 1-14 (Group Stage)

- [ ] Monitor API usage
- [ ] Track user engagement
- [ ] Fix any issues quickly
- [ ] Collect user feedback

### Day 15-23 (Knockout Stage)

- [ ] Scale if needed
- [ ] Optimize based on learnings
- [ ] Prepare for post-tournament

### Post Tournament

- [ ] Analyze success
- [ ] Plan league expansion
- [ ] Decide on paid tier timing

---

## 💰 Cost Projection

**Launch**: $0/month (100 calls/day free tier)
**After World Cup**: $0/month (Friendlies only)
**Scale phase**: $19/month (when adding leagues)

**Break-even with $19/month plan**:

- If 20 users pay $1/month = Break even
- If 100 users pay $0.20/match = Break even

---

## 🎉 Summary

**Focus**: World Cup 2026 + International Friendlies
**API Usage**: 36-40 calls/day (40% of free tier)
**Timeline**: Perfect timing - World Cup in 4 days!
**Cost**: $0 to start
**Strategy**: Proven with biggest football event
**Growth**: Add more leagues after success

**This is the perfect launch strategy!** 🌍⚽🏆

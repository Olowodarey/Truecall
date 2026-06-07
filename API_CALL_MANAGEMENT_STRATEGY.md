# API Call Management Strategy

## 7,500 Requests/Day Budget ($19/month Plan)

---

## 📊 Current Usage Analysis

### Without Optimization

- **Frontend**: Load matches on page load/refresh
- **AI Agent**: Check every 30 mins = 48 calls/day
- **Backend**: No caching = every request hits API
- **User browsing**: ~10 requests per user session

**Problem**: With 100 users/day = 1,000+ API calls just from browsing

---

## 🎯 Optimized Strategy

### Target: Stay under 7,500 calls/day (312 calls/hour)

### 1. **Smart Caching Strategy** ⭐ MOST IMPORTANT

#### A. Backend Response Caching

**Impact**: Reduces 90% of API calls

**Implementation**:

```typescript
// backend/src/matches/matches.controller.ts

import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";

@Controller("matches")
@UseInterceptors(CacheInterceptor)
export class MatchesController {
  @Get()
  @CacheTTL(1800) // 30 minutes cache
  async getAllMatches(@Query("upcoming") upcoming?: string) {
    // First call hits API, next 30 mins served from cache
    return this.matchesService.getUpcomingMatchesFromApi();
  }

  @Get("realtime/live")
  @CacheTTL(60) // 1 minute cache for live matches
  async getLiveMatches() {
    // Live matches need fresher data
    return this.matchesService.getLiveMatches();
  }

  @Get("realtime/finished")
  @CacheTTL(3600) // 1 hour cache for finished matches
  async getFinishedMatches() {
    // Finished matches don't change
    return this.matchesService.getFinishedMatches();
  }
}
```

#### B. Database Caching (Long-term storage)

**Impact**: Persist match data, rarely hit external API

**Create Match Cache Table**:

```sql
CREATE TABLE match_cache (
  id SERIAL PRIMARY KEY,
  api_match_id VARCHAR(100) UNIQUE,
  match_data JSONB,
  status VARCHAR(20),
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_match_status ON match_cache(status);
CREATE INDEX idx_match_expiry ON match_cache(expires_at);
```

**Implementation**:

```typescript
// backend/src/matches/matches-cache.service.ts

@Injectable()
export class MatchesCacheService {
  constructor(
    @InjectRepository(MatchCache)
    private matchCacheRepo: Repository<MatchCache>,
    private apiFootballService: ApiFootballService,
  ) {}

  async getUpcomingMatches(): Promise<Match[]> {
    // 1. Check database cache first
    const cached = await this.matchCacheRepo.find({
      where: {
        status: "NS", // Not Started
        expires_at: MoreThan(new Date()),
      },
    });

    if (cached.length > 0) {
      console.log("✅ Served from database cache (0 API calls)");
      return cached.map((c) => c.match_data);
    }

    // 2. If cache miss, fetch from API
    console.log("📡 Fetching from API...");
    const matches = await this.apiFootballService.getUpcomingMatches();

    // 3. Store in database with expiration
    await this.cacheMatches(matches, "NS", 30); // 30 min expiry

    return matches;
  }

  async getFinishedMatches(): Promise<Match[]> {
    // Finished matches can be cached much longer
    const cached = await this.matchCacheRepo.find({
      where: {
        status: "FT",
        expires_at: MoreThan(new Date()),
      },
    });

    if (cached.length > 0) {
      return cached.map((c) => c.match_data);
    }

    const matches = await this.apiFootballService.getFinishedMatches();
    await this.cacheMatches(matches, "FT", 1440); // 24 hours expiry

    return matches;
  }

  private async cacheMatches(
    matches: Match[],
    status: string,
    expiryMinutes: number,
  ) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    for (const match of matches) {
      await this.matchCacheRepo.upsert(
        {
          api_match_id: match.id,
          match_data: match,
          status,
          expires_at: expiresAt,
        },
        ["api_match_id"],
      );
    }
  }

  // Cleanup expired cache (run daily)
  @Cron("0 0 * * *") // Midnight
  async cleanupExpiredCache() {
    await this.matchCacheRepo.delete({
      expires_at: LessThan(new Date()),
    });
  }
}
```

---

### 2. **Scheduled Background Jobs**

**Impact**: Proactive fetching during off-peak hours

```typescript
// backend/src/matches/matches-sync.service.ts

@Injectable()
export class MatchesSyncService {
  constructor(
    private apiFootballService: ApiFootballService,
    private matchesCacheService: MatchesCacheService,
  ) {}

  // Fetch upcoming matches once per hour
  @Cron("0 * * * *") // Every hour
  async syncUpcomingMatches() {
    console.log("🔄 Syncing upcoming matches...");
    const matches = await this.apiFootballService.getUpcomingMatches();
    await this.matchesCacheService.cacheMatches(matches, "NS", 60);
    console.log(`✅ Cached ${matches.length} upcoming matches`);
  }

  // Fetch finished matches every 30 minutes
  @Cron("*/30 * * * *") // Every 30 minutes
  async syncFinishedMatches() {
    console.log("🔄 Syncing finished matches...");
    const matches = await this.apiFootballService.getFinishedMatches();
    await this.matchesCacheService.cacheMatches(matches, "FT", 1440);
    console.log(`✅ Cached ${matches.length} finished matches`);
  }

  // Fetch live matches every 2 minutes (only during match hours)
  @Cron("*/2 * * * *") // Every 2 minutes
  async syncLiveMatches() {
    // Only run during typical match hours (12 PM - 11 PM)
    const hour = new Date().getHours();
    if (hour < 12 || hour > 23) {
      console.log("⏸️ Outside match hours, skipping live sync");
      return;
    }

    console.log("🔄 Syncing live matches...");
    const matches = await this.apiFootballService.getLiveMatches();
    await this.matchesCacheService.cacheMatches(matches, "LIVE", 2);
    console.log(`✅ Cached ${matches.length} live matches`);
  }
}
```

**API Calls Per Day**:

- Upcoming: 24 calls/day (hourly)
- Finished: 48 calls/day (every 30 min)
- Live: 360 calls/day (every 2 min, 12 hours)
- **Total**: 432 calls/day (94% under budget!)

---

### 3. **Frontend Optimization**

#### A. Local Storage Caching

```typescript
// frontend/lib/matches-cache.ts

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function getCachedMatches(key: string) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  const age = Date.now() - timestamp;

  if (age > CACHE_DURATION) {
    localStorage.removeItem(key);
    return null;
  }

  return data;
}

export function setCachedMatches(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}
```

#### B. Smart Data Fetching

```typescript
// frontend/app/creator-events/create/page.tsx

const loadFixtures = async () => {
  setLoading(true);

  // Check local storage first
  const cached = getCachedMatches("upcoming_matches");
  if (cached) {
    setFixtures(cached);
    setLoading(false);
    console.log("✅ Loaded from local cache");
    return;
  }

  // Fetch from backend (which has its own cache)
  try {
    const response = await fetch("/api/matches/upcoming");
    const data = await response.json();

    setFixtures(data);
    setCachedMatches("upcoming_matches", data);
    console.log("📡 Loaded from backend");
  } catch (error) {
    console.error("Error loading fixtures:", error);
  } finally {
    setLoading(false);
  }
};
```

---

### 4. **AI Agent Optimization**

```typescript
// ai-agent/src/services/matchDataService.ts

export class MatchDataService {
  private matches: Match[] = [];
  private lastFetchTime: number = 0;
  private cacheDurationMs: number = 1800_000; // 30 minutes

  // Only fetch when needed (not on every check)
  private async ensureFreshData(): Promise<void> {
    const now = Date.now();
    const isCacheStale = now - this.lastFetchTime > this.cacheDurationMs;

    if (this.matches.length === 0 || isCacheStale) {
      await this.loadMatches();
    } else {
      console.log("✅ Using cached matches (0 API calls)");
    }
  }
}
```

**AI Agent Calls**: 48/day (checks every 30 min, served from backend cache)

---

## 📈 Daily API Call Budget

### Breakdown (Optimized)

| Source              | Frequency           | Calls/Day | % of Budget |
| ------------------- | ------------------- | --------- | ----------- |
| **Background Sync** |                     |           |             |
| - Upcoming matches  | Hourly              | 24        | 0.3%        |
| - Finished matches  | 30 min              | 48        | 0.6%        |
| - Live matches      | 2 min (12h)         | 360       | 4.8%        |
| **AI Agent**        | 30 min              | 48        | 0.6%        |
| **User Requests**   | (served from cache) | 0         | 0%          |
| **Total**           |                     | **480**   | **6.4%**    |
| **Remaining**       |                     | **7,020** | **93.6%**   |

---

## 🎛️ Configuration

### Environment Variables

```bash
# backend/.env

# API Call Management
ENABLE_CACHE=true
CACHE_TTL_UPCOMING=1800     # 30 minutes
CACHE_TTL_LIVE=60           # 1 minute
CACHE_TTL_FINISHED=3600     # 1 hour

# Background Sync (enable/disable)
ENABLE_BACKGROUND_SYNC=true
SYNC_UPCOMING_INTERVAL=3600000    # 1 hour
SYNC_FINISHED_INTERVAL=1800000    # 30 minutes
SYNC_LIVE_INTERVAL=120000         # 2 minutes

# Match hours (only fetch live during these hours)
LIVE_SYNC_START_HOUR=12    # 12 PM
LIVE_SYNC_END_HOUR=23      # 11 PM
```

---

## 📊 Monitoring & Alerts

### API Call Counter

```typescript
// backend/src/matches/api-call-tracker.service.ts

@Injectable()
export class ApiCallTrackerService {
  private dailyCalls = 0;
  private dailyLimit = 7500;
  private resetTime: Date;

  constructor() {
    this.scheduleReset();
  }

  async trackCall(): Promise<boolean> {
    this.dailyCalls++;

    if (this.dailyCalls >= this.dailyLimit * 0.9) {
      console.warn(
        `⚠️ 90% of daily API limit reached: ${this.dailyCalls}/${this.dailyLimit}`,
      );
    }

    if (this.dailyCalls >= this.dailyLimit) {
      console.error(
        `🚫 Daily API limit exceeded: ${this.dailyCalls}/${this.dailyLimit}`,
      );
      return false; // Block call
    }

    return true; // Allow call
  }

  @Cron("0 0 * * *") // Reset at midnight
  private scheduleReset() {
    console.log("🔄 Resetting daily API call counter");
    this.dailyCalls = 0;
    this.resetTime = new Date();
  }

  getStats() {
    return {
      dailyCalls: this.dailyCalls,
      dailyLimit: this.dailyLimit,
      remaining: this.dailyLimit - this.dailyCalls,
      percentUsed: (this.dailyCalls / this.dailyLimit) * 100,
      resetTime: this.resetTime,
    };
  }
}
```

### Monitoring Endpoint

```typescript
@Get('stats')
getApiStats() {
  return this.apiCallTracker.getStats();
}
```

**Access**: `GET /api/matches/stats`

---

## 🚀 Implementation Steps

### Phase 1: Immediate (Today)

1. ✅ Add NestJS cache module

```bash
cd backend
pnpm install @nestjs/cache-manager cache-manager
```

2. ✅ Enable caching in controllers
3. ✅ Update AI agent cache duration

### Phase 2: Short-term (This Week)

1. Create database cache table
2. Implement MatchesCacheService
3. Set up background sync jobs
4. Add API call tracker

### Phase 3: Monitoring (Ongoing)

1. Monitor `/api/matches/stats` daily
2. Adjust cache durations as needed
3. Fine-tune sync intervals

---

## 💰 Cost Analysis

### With 7,500 calls/day @ $19/month:

**Optimized Usage**: 480 calls/day

- **Cost per call**: $0.00008
- **Unused budget**: 7,020 calls/day
- **Room for growth**: 15x current usage

**Can support**:

- 1,000+ users/day (with caching)
- 100+ active matches/day
- Real-time updates every 2 minutes

---

## ✅ Success Metrics

Monitor these daily:

1. **Total API calls** < 7,500/day
2. **Cache hit rate** > 90%
3. **Average response time** < 200ms (cached)
4. **User experience** - No delays in data

---

## 🎯 Summary

**Budget**: 7,500 requests/day
**Actual usage**: 480 requests/day (6.4%)
**Buffer**: 7,020 requests (93.6%)

**Key strategies**:

1. ✅ Backend caching (90% reduction)
2. ✅ Database persistence (long-term storage)
3. ✅ Background sync (proactive fetching)
4. ✅ Frontend caching (eliminates user-triggered calls)
5. ✅ Smart scheduling (fetch only during match hours)

**Result**: Comfortably stay under limit while supporting thousands of users! 🎉

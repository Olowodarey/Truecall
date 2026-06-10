import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { WorldCupApiService, WorldCupFixture } from './world-cup-api.service';
import { MatchCache, ApiCallLog } from './entities/match-cache.entity';
import { ApiKeyRotatorService } from './api-key-rotator.service';
import { FootballDataOrgService } from './football-data-org.service';

@Injectable()
export class DatabaseCacheService {
  private readonly logger = new Logger(DatabaseCacheService.name);
  private dailyCallCount = 0;
  private dailyLimit = 100; // Free tier

  constructor(
    @InjectRepository(MatchCache)
    private matchRepo: Repository<MatchCache>,
    @InjectRepository(ApiCallLog)
    private apiLogRepo: Repository<ApiCallLog>,
    private worldCupApi: WorldCupApiService,
    private keyRotator: ApiKeyRotatorService,
    private footballDataOrg: FootballDataOrgService,
  ) {
    this.initializeDailyCount();
    this.doInitialSync();
  }

  /**
   * Do initial sync on startup if database is empty
   */
  private async doInitialSync() {
    try {
      const count = await this.matchRepo.count();
      if (count === 0) {
        this.logger.log('🚀 Database is empty, doing initial sync...');
        await this.syncPriorityMatches();
      } else {
        this.logger.log(
          `✅ Database has ${count} matches, skipping initial sync`,
        );
      }
    } catch (error) {
      this.logger.error('Initial sync failed', error);
    }
  }

  /**
   * Initialize daily counter from today's logs
   */
  private async initializeDailyCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.apiLogRepo.count({
      where: {
        call_time: MoreThan(today),
      },
    });

    this.dailyCallCount = count;
    this.logger.log(
      `📊 Initialized daily count: ${this.dailyCallCount}/${this.dailyLimit}`,
    );
  }

  /**
   * CRON: Sync World Cup + Friendlies every 6 hours
   * API Calls: 2 per execution (World Cup targeted + general Friendlies, parallel)
   * Total: 4 syncs/day × 2 calls = 8 calls/day
   * PUBLIC: Can also be manually triggered
   */
  @Cron('0 */6 * * *') // Every 6 hours
  async syncPriorityMatches() {
    this.logger.log('🏆 Syncing World Cup & Friendlies matches...');

    // World Cup fixtures come from football-data.org (api-football's free
    // tier blocks the current/2026 season entirely).
    const worldCup = await this.footballDataOrg.getUpcomingWorldCupMatches();

    let friendlies: WorldCupFixture[] = [];
    if (this.canMakeApiCalls(2)) {
      try {
        friendlies = await this.worldCupApi.getAllPriorityMatches();
        await this.trackApiCalls('priority_matches', friendlies.length, 2);
      } catch (error) {
        this.logger.error('Failed to sync friendlies', error);
        await this.trackApiCalls('priority_matches', 0, 2, false);
      }
    } else {
      this.logger.warn('⚠️ Daily API-Football limit reached, skipping friendlies sync');
    }

    const matches = [...worldCup, ...friendlies];
    await this.storeMatches(matches);

    this.logger.log(
      `✅ Synced ${worldCup.length} World Cup + ${friendlies.length} Friendlies = ${matches.length} total`,
    );
  }

  /**
   * CRON: Sync finished matches every 30 minutes.
   * Queries today + yesterday by specific date — the free tier returns data
   * for ?date= queries unlike broad from/to ranges without a league filter.
   * API Calls: 2 per run (today + yesterday). Total: 96/day + 8 priority = ~104/day.
   * With key rotation (4 keys) budget is ~380/day, so this is well within limits.
   */
  @Cron('*/30 * * * *') // Every 30 minutes
  async syncFinishedMatches() {
    this.logger.log('🔄 Syncing finished priority matches...');

    const worldCup = await this.footballDataOrg.getFinishedWorldCupMatches();

    let legacyFinished: WorldCupFixture[] = [];
    if (this.canMakeApiCalls(2)) {
      try {
        legacyFinished = await this.worldCupApi.getFinishedPriorityMatches();
        await this.trackApiCalls('finished_matches', legacyFinished.length, 2);
      } catch (error) {
        this.logger.error('Failed to sync finished matches', error);
        await this.trackApiCalls('finished_matches', 0, 2, false);
      }
    } else {
      this.logger.warn('⚠️ Daily API-Football limit reached, skipping finished friendlies sync');
    }

    const matches = [...worldCup, ...legacyFinished];
    await this.storeMatches(matches);

    this.logger.log(
      `✅ Synced ${worldCup.length} finished World Cup + ${legacyFinished.length} finished Friendlies = ${matches.length} total`,
    );
  }

  /**
   * Force-refresh a single match from the API by its fixture ID.
   * Uses ?id= (singular) which works on the free tier for any league.
   * Called by the admin endpoint to unstick matches that were missed by the CRON.
   */
  async forceRefreshMatch(fixtureId: string): Promise<any | null> {
    let fixture = await this.footballDataOrg.getMatchById(fixtureId);
    if (!fixture) {
      fixture = await this.worldCupApi.getSingleFixture(fixtureId);
    }
    if (!fixture) return null;
    await this.storeMatches([fixture]);
    await this.trackApiCalls('force_refresh', 1, 1);
    return fixture;
  }

  /**
   * Manually set a match result to FT in the DB.
   * Used for Friendlies whose results are locked behind the paid API tier.
   * Once updated, the AI oracle reads FT from DB and submits on-chain.
   */
  async setMatchResult(
    apiMatchId: string,
    homeScore: number,
    awayScore: number,
  ): Promise<{ home: string; away: string } | null> {
    const match = await this.matchRepo.findOne({ where: { api_match_id: apiMatchId } });
    if (!match) return null;

    const updatedData = {
      ...match.match_data,
      status: 'FT',
      comment: 'Full Time',
      finalHomeScore: homeScore,
      finalAwayScore: awayScore,
    };

    await this.matchRepo.update(
      { api_match_id: apiMatchId },
      {
        status: 'FT',
        home_score: homeScore,
        away_score: awayScore,
        match_data: updatedData,
        updated_at: new Date(),
      },
    );

    this.logger.log(`✅ Manually set ${apiMatchId} to FT: ${homeScore}-${awayScore}`);
    return { home: match.home_team, away: match.away_team };
  }

  /**
   * Store matches in database
   */
  private async storeMatches(fixtures: WorldCupFixture[]) {
    for (const fixture of fixtures) {
      try {
        await this.matchRepo.upsert(
          {
            api_match_id: `api_${fixture.fixture.id}`,
            match_data: this.convertToMatchFormat(fixture),
            status: fixture.fixture.status.short,
            league: fixture.league.name,
            kickoff_time: new Date(fixture.fixture.timestamp * 1000),
            home_team: fixture.teams.home.name,
            away_team: fixture.teams.away.name,
            home_score: fixture.score.fulltime.home ?? undefined,
            away_score: fixture.score.fulltime.away ?? undefined,
            updated_at: new Date(),
          },
          ['api_match_id'],
        );
      } catch (error) {
        this.logger.error(`Failed to store match ${fixture.fixture.id}`, error);
      }
    }
  }

  /**
   * Convert API-Football format to TrueCall format
   */
  private convertToMatchFormat(fixture: WorldCupFixture): any {
    return {
      id: `api_${fixture.fixture.id}`,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      league: fixture.league.name,
      season: `${fixture.league.season}/${fixture.league.season + 1}`,
      round: fixture.league.round,
      venue: fixture.fixture.venue.name || 'TBD',
      homeTeamId: fixture.teams.home.name.toLowerCase().replace(/\s+/g, '_'),
      awayTeamId: fixture.teams.away.name.toLowerCase().replace(/\s+/g, '_'),
      kickoffTime: fixture.fixture.timestamp,
      finalHomeScore: fixture.score.fulltime.home,
      finalAwayScore: fixture.score.fulltime.away,
      status: fixture.fixture.status.short,
      comment: fixture.fixture.status.long,
    };
  }

  /**
   * Get upcoming matches from database (NO API CALLS)
   */
  async getUpcomingMatches(): Promise<any[]> {
    this.logger.log('📖 Reading upcoming matches from database');

    const matches = await this.matchRepo.find({
      where: {
        status: In(['NS', 'TBD']),
        kickoff_time: MoreThan(new Date()),
      },
      order: {
        kickoff_time: 'ASC',
      },
      take: 100,
    });

    return matches.map((m) => m.match_data);
  }

  /**
   * Get finished matches from database (NO API CALLS)
   */
  async getFinishedMatches(): Promise<any[]> {
    this.logger.log('📖 Reading finished matches from database');

    const matches = await this.matchRepo.find({
      where: {
        status: 'FT',
      },
      order: {
        updated_at: 'DESC',
      },
      take: 50,
    });

    return matches.map((m) => m.match_data);
  }

  /**
   * Get specific match by API ID from database (NO API CALLS)
   */
  async getMatchById(apiMatchId: string): Promise<any | null> {
    this.logger.log(`📖 Reading match ${apiMatchId} from database`);

    const match = await this.matchRepo.findOne({
      where: { api_match_id: apiMatchId },
    });

    return match ? match.match_data : null;
  }

  /**
   * Get matches by league
   */
  async getMatchesByLeague(leagueName: string): Promise<any[]> {
    this.logger.log(`📖 Reading ${leagueName} matches from database`);

    const matches = await this.matchRepo.find({
      where: {
        league: leagueName,
      },
      order: {
        kickoff_time: 'ASC',
      },
    });

    return matches.map((m) => m.match_data);
  }

  /**
   * Check if we can make API calls (true if any key still has budget)
   */
  private canMakeApiCalls(_count: number): boolean {
    return this.keyRotator.hasAvailableKey();
  }

  /**
   * Track API calls
   */
  private async trackApiCalls(
    endpoint: string,
    matchesFetched: number,
    callsMade: number = 1,
    success: boolean = true,
  ) {
    this.dailyCallCount += callsMade;

    await this.apiLogRepo.insert({
      endpoint,
      success,
      matches_fetched: matchesFetched,
    });

    this.logger.log(
      `📊 API calls today: ${this.dailyCallCount}/${this.dailyLimit} (${this.getRemainingCalls()} remaining)`,
    );
  }

  /**
   * Reset daily counter at midnight
   */
  @Cron('0 0 * * *') // Midnight
  async resetDailyCounter() {
    this.logger.log('🔄 Resetting daily API call counter');
    this.dailyCallCount = 0;
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    const remaining = this.getRemainingCalls();
    const percentUsed = (this.dailyCallCount / this.dailyLimit) * 100;

    return {
      callsToday: this.dailyCallCount,
      limit: this.dailyLimit,
      remaining,
      percentUsed: Math.round(percentUsed * 10) / 10,
      status:
        percentUsed < 80
          ? 'healthy'
          : percentUsed < 95
            ? 'warning'
            : 'critical',
      keyRotation: this.keyRotator.getStats(),
    };
  }

  private getRemainingCalls(): number {
    return Math.max(0, this.dailyLimit - this.dailyCallCount);
  }

  /**
   * Get database stats
   */
  async getDatabaseStats() {
    const [total, upcoming, finished, worldCup, friendlies] = await Promise.all(
      [
        this.matchRepo.count(),
        this.matchRepo.count({ where: { status: In(['NS', 'TBD']) } }),
        this.matchRepo.count({ where: { status: 'FT' } }),
        this.matchRepo.count({ where: { league: 'World Cup' } }),
        this.matchRepo.count({ where: { league: 'Friendlies' } }),
      ],
    );

    return {
      total,
      upcoming,
      finished,
      byLeague: {
        worldCup,
        friendlies,
      },
    };
  }
}

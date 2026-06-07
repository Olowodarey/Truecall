import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { WorldCupApiService, WorldCupFixture } from './world-cup-api.service';
import { MatchCache, ApiCallLog } from './entities/match-cache.entity';

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
   * CRON: Sync World Cup + Friendlies every 2 hours
   * API Calls: 2 per execution (1 for World Cup, 1 for Friendlies)
   * PUBLIC: Can also be manually triggered
   */
  @Cron('0 */2 * * *') // Every 2 hours
  async syncPriorityMatches() {
    if (!this.canMakeApiCalls(2)) {
      this.logger.warn('⚠️ Daily API limit reached, skipping priority sync');
      return;
    }

    this.logger.log('🏆 Syncing World Cup & Friendlies matches...');

    try {
      const matches = await this.worldCupApi.getAllPriorityMatches();
      await this.storeMatches(matches);

      await this.trackApiCalls('priority_matches', matches.length, 2);
      this.logger.log(
        `✅ Synced ${matches.length} priority matches (2 API calls)`,
      );
    } catch (error) {
      this.logger.error('Failed to sync priority matches', error);
      await this.trackApiCalls('priority_matches', 0, 2, false);
    }
  }

  /**
   * CRON: Sync finished matches every 1 hour
   * API Calls: 2 per execution (1 for World Cup, 1 for Friendlies)
   */
  @Cron('0 * * * *') // Every hour
  async syncFinishedMatches() {
    if (!this.canMakeApiCalls(2)) {
      this.logger.warn('⚠️ Daily API limit reached, skipping finished sync');
      return;
    }

    this.logger.log('🔄 Syncing finished priority matches...');

    try {
      const matches = await this.worldCupApi.getFinishedPriorityMatches();
      await this.storeMatches(matches);

      await this.trackApiCalls('finished_matches', matches.length, 2);
      this.logger.log(
        `✅ Synced ${matches.length} finished matches (2 API calls)`,
      );
    } catch (error) {
      this.logger.error('Failed to sync finished matches', error);
      await this.trackApiCalls('finished_matches', 0, 2, false);
    }
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
   * Check if we can make API calls
   */
  private canMakeApiCalls(count: number): boolean {
    return this.dailyCallCount + count <= this.dailyLimit;
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

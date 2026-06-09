import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ApiKeyRotatorService } from './api-key-rotator.service';

export interface WorldCupFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: { short: string; long: string };
    venue: { name: string };
  };
  league: { id: number; name: string; season: number; round: string };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    fulltime: { home: number | null; away: number | null };
  };
}

@Injectable()
export class WorldCupApiService {
  private readonly logger = new Logger(WorldCupApiService.name);
  private readonly client: AxiosInstance;

  // Priority leagues
  private readonly WORLD_CUP_ID = 1;
  private readonly FRIENDLIES_ID = 10;
  private readonly SEASON = 2026;

  constructor(
    private configService: ConfigService,
    private keyRotator: ApiKeyRotatorService,
  ) {
    const baseUrl = this.configService.get<string>(
      'API_FOOTBALL_BASE_URL',
      'https://v3.football.api-sports.io',
    );

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });

    // Set the active key for the current time window before every request
    this.client.interceptors.request.use((config) => {
      config.headers['x-apisports-key'] = this.keyRotator.currentKey;
      return config;
    });

    // On 429, retry once with the next key in the rotation
    this.client.interceptors.response.use(
      (res) => res,
      async (err) => {
        if (err.response?.status === 429 && !(err.config as any)._retried) {
          const fallbackKey = this.keyRotator.nextKey;
          if (fallbackKey) {
            (err.config as any)._retried = true;
            err.config.headers['x-apisports-key'] = fallbackKey;
            return this.client.request(err.config);
          }
        }
        throw err;
      },
    );
  }

  /**
   * Get all priority matches (World Cup + Friendlies) for the next 7 days
   * Single date-range query: 1 API call, filtered client-side
   */
  /**
   * Get all priority matches for the next 7 days.
   * Two parallel queries (2 API calls):
   *   1. World Cup specific — league=1&season=2026 guarantees we get Group Stage fixtures
   *      even on the free tier where the general date query may omit them.
   *   2. General date range — used to pick up International Friendlies by name.
   * Results are merged and deduplicated by fixture ID.
   */
  async getAllPriorityMatches(): Promise<WorldCupFixture[]> {
    try {
      const today = new Date();
      const in7Days = new Date();
      in7Days.setDate(today.getDate() + 7);

      const from = today.toISOString().split('T')[0];
      const to = in7Days.toISOString().split('T')[0];

      this.logger.log(
        `Fetching World Cup (league=${this.WORLD_CUP_ID}, season=${this.SEASON}) + Friendlies from ${from} to ${to}`,
      );

      // Run both queries in parallel to keep the total wall-clock time low
      const [wcResponse, generalResponse] = await Promise.all([
        this.client.get('/fixtures', {
          params: {
            from,
            to,
            league: this.WORLD_CUP_ID,
            season: this.SEASON,
          },
        }),
        this.client.get('/fixtures', { params: { from, to } }),
      ]);

      const worldCupMatches: WorldCupFixture[] = wcResponse.data.response;

      const friendlies: WorldCupFixture[] = generalResponse.data.response.filter(
        (m: WorldCupFixture) => m.league.name.toLowerCase().includes('friend'),
      );

      // Deduplicate: World Cup query is the authority; skip any friendly that
      // happens to share a fixture ID with a World Cup match (shouldn't happen
      // in practice but keeps the merge safe).
      const wcIds = new Set(worldCupMatches.map((m) => m.fixture.id));
      const uniqueFriendlies = friendlies.filter((m) => !wcIds.has(m.fixture.id));

      const result = [...worldCupMatches, ...uniqueFriendlies];

      this.logger.log(
        `✅ ${worldCupMatches.length} World Cup + ${uniqueFriendlies.length} Friendlies = ${result.length} total (2 API calls, 7-day window)`,
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to fetch priority matches', error.message);
      return [];
    }
  }

  /**
   * Get finished priority matches using date-based queries.
   * Queries today + yesterday by specific date — the free tier returns data
   * for date-based queries even without a league filter, unlike from/to ranges.
   * 2 API calls per invocation.
   */
  async getFinishedPriorityMatches(): Promise<WorldCupFixture[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86_400_000)
        .toISOString()
        .split('T')[0];

      this.logger.log(`Checking finished matches for ${yesterday} and ${today}`);

      const [todayRes, yesterdayRes] = await Promise.all([
        this.client.get('/fixtures', { params: { date: today } }),
        this.client.get('/fixtures', { params: { date: yesterday } }),
      ]);

      const allMatches: WorldCupFixture[] = [
        ...todayRes.data.response,
        ...yesterdayRes.data.response,
      ];

      const finished = allMatches.filter((m: WorldCupFixture) => {
        const leagueName = m.league.name.toLowerCase();
        const isPriority =
          m.league.id === this.WORLD_CUP_ID || leagueName.includes('friend');
        return isPriority && m.fixture.status.short === 'FT';
      });

      this.logger.log(
        `Fetched ${allMatches.length} total matches, found ${finished.length} finished priority matches`,
      );
      return finished;
    } catch (error) {
      this.logger.error('Failed to fetch finished matches', error.message);
      return [];
    }
  }

  /**
   * Fetch a single fixture by its API-Football ID.
   * Uses the ?id= (singular) parameter which works on the free tier
   * for any league without needing league+season filters.
   */
  async getSingleFixture(fixtureId: string): Promise<WorldCupFixture | null> {
    try {
      const response = await this.client.get('/fixtures', {
        params: { id: fixtureId },
      });
      const fixtures: WorldCupFixture[] = response.data.response;
      return fixtures.length > 0 ? fixtures[0] : null;
    } catch (error) {
      this.logger.error(`Failed to fetch fixture ${fixtureId}`, error.message);
      return null;
    }
  }

  /**
   * Get current status of specific fixtures by their API-Football IDs.
   * Uses the ?ids=ID1-ID2-... format (up to 20 per call, batched automatically).
   * This works reliably on the free tier unlike broad date-range queries.
   */
  async getMatchesByIds(fixtureIds: string[]): Promise<WorldCupFixture[]> {
    if (fixtureIds.length === 0) return [];

    const results: WorldCupFixture[] = [];
    const BATCH_SIZE = 20;

    for (let i = 0; i < fixtureIds.length; i += BATCH_SIZE) {
      const batch = fixtureIds.slice(i, i + BATCH_SIZE);
      try {
        this.logger.log(`Fetching batch of ${batch.length} fixtures by ID: ${batch.join(', ')}`);
        const response = await this.client.get('/fixtures', {
          params: { ids: batch.join('-') },
        });
        results.push(...(response.data.response as WorldCupFixture[]));
      } catch (error) {
        this.logger.error(`Failed to fetch fixtures batch [${batch.join(',')}]`, error.message);
      }
    }

    return results;
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return this.keyRotator.isConfigured();
  }
}

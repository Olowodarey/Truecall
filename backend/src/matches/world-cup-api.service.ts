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
   * Get all priority matches (World Cup + Friendlies) from a single API call
   * More efficient: 1 call instead of 2!
   */
  async getAllPriorityMatches(): Promise<WorldCupFixture[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      this.logger.log(`Fetching all matches for ${today} and ${tomorrowStr}`);

      // Fetch all matches for today and tomorrow (1 call each)
      const [todayRes, tomorrowRes] = await Promise.all([
        this.client.get('/fixtures', { params: { date: today } }),
        this.client.get('/fixtures', { params: { date: tomorrowStr } }),
      ]);

      const allMatches = [
        ...todayRes.data.response,
        ...tomorrowRes.data.response,
      ];

      // Filter for World Cup and Friendlies
      const priorityMatches = allMatches.filter((match: WorldCupFixture) => {
        const leagueName = match.league.name.toLowerCase();
        return (
          match.league.id === this.WORLD_CUP_ID || // World Cup
          leagueName.includes('friend') // Any friendlies (includes Women's)
        );
      });

      this.logger.log(
        `Fetched ${allMatches.length} total matches, filtered to ${priorityMatches.length} priority matches (World Cup + Friendlies)`,
      );

      return priorityMatches;
    } catch (error) {
      this.logger.error('Failed to fetch priority matches', error.message);
      return [];
    }
  }

  /**
   * Get finished matches (FT status only) from priority leagues
   * Optimized: 1 call, then filter
   */
  async getFinishedPriorityMatches(): Promise<WorldCupFixture[]> {
    try {
      const today = new Date();
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(today.getDate() - 2);

      const from = twoDaysAgo.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];

      this.logger.log(`Fetching all finished matches from ${from} to ${to}`);

      // Get all matches for the date range (1 API call)
      const response = await this.client.get('/fixtures', {
        params: { from, to },
      });

      const allMatches = response.data.response;

      // Filter for priority leagues AND finished status
      const finished = allMatches.filter((match: WorldCupFixture) => {
        const leagueName = match.league.name.toLowerCase();
        const isPriority =
          match.league.id === this.WORLD_CUP_ID ||
          leagueName.includes('friend');
        const isFinished = match.fixture.status.short === 'FT';

        return isPriority && isFinished;
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
   * Check if API is configured
   */
  isConfigured(): boolean {
    return this.keyRotator.isConfigured();
  }
}

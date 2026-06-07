import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

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

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('API_FOOTBALL_KEY');
    const baseUrl = this.configService.get<string>(
      'API_FOOTBALL_BASE_URL',
      'https://v3.football.api-sports.io',
    );

    this.client = axios.create({
      baseURL: baseUrl,
      headers: { 'x-apisports-key': apiKey },
      timeout: 30000,
    });
  }

  /**
   * Get World Cup matches for today and tomorrow
   */
  async getWorldCupMatches(): Promise<WorldCupFixture[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      this.logger.log(
        `Fetching World Cup matches for ${today} and ${tomorrowStr}`,
      );

      const [todayRes, tomorrowRes] = await Promise.all([
        this.client.get('/fixtures', {
          params: {
            league: this.WORLD_CUP_ID,
            season: this.SEASON,
            date: today,
          },
        }),
        this.client.get('/fixtures', {
          params: {
            league: this.WORLD_CUP_ID,
            season: this.SEASON,
            date: tomorrowStr,
          },
        }),
      ]);

      const allMatches = [
        ...todayRes.data.response,
        ...tomorrowRes.data.response,
      ];

      this.logger.log(`Fetched ${allMatches.length} World Cup matches`);
      return allMatches;
    } catch (error) {
      this.logger.error('Failed to fetch World Cup matches', error.message);
      return [];
    }
  }

  /**
   * Get International Friendlies
   */
  async getInternationalFriendlies(): Promise<WorldCupFixture[]> {
    try {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const from = today.toISOString().split('T')[0];
      const to = nextWeek.toISOString().split('T')[0];

      this.logger.log(
        `Fetching International Friendlies from ${from} to ${to}`,
      );

      const response = await this.client.get('/fixtures', {
        params: {
          league: this.FRIENDLIES_ID,
          season: this.SEASON,
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
        'Failed to fetch International Friendlies',
        error.message,
      );
      return [];
    }
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
    const apiKey = this.configService.get<string>('API_FOOTBALL_KEY');
    return !!apiKey && apiKey !== 'YOUR_API_FOOTBALL_KEY';
  }
}

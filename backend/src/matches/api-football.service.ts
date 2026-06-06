import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface ApiFootballFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number | null;
      second: number | null;
    };
    venue: {
      id: number | null;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
}

export interface ApiFootballResponse {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: ApiFootballFixture[];
}

@Injectable()
export class ApiFootballService {
  private readonly logger = new Logger(ApiFootballService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('API_FOOTBALL_KEY', '');
    this.baseUrl = this.configService.get<string>(
      'API_FOOTBALL_BASE_URL',
      'https://v3.football.api-sports.io',
    );

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'x-apisports-key': this.apiKey,
      },
      timeout: 30000, // Increased to 30 seconds
    });

    if (!this.apiKey || this.apiKey === 'YOUR_API_FOOTBALL_KEY') {
      this.logger.warn(
        'API-Football key not configured. Real-time data will not be available.',
      );
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'YOUR_API_FOOTBALL_KEY';
  }

  /**
   * Get live matches
   */
  async getLiveMatches(): Promise<ApiFootballFixture[]> {
    try {
      const response = await this.client.get<ApiFootballResponse>('/fixtures', {
        params: { live: 'all' },
      });

      this.logger.log(`Fetched ${response.data.results} live matches`);
      return response.data.response;
    } catch (error) {
      this.logger.error('Failed to fetch live matches', error.message);
      return [];
    }
  }

  /**
   * Get fixtures by date (YYYY-MM-DD format)
   */
  async getFixturesByDate(date: string): Promise<ApiFootballFixture[]> {
    try {
      const response = await this.client.get<ApiFootballResponse>('/fixtures', {
        params: { date },
      });

      this.logger.log(`Fetched ${response.data.results} fixtures for ${date}`);
      return response.data.response;
    } catch (error) {
      this.logger.error(`Failed to fetch fixtures for ${date}`, error.message);
      return [];
    }
  }

  /**
   * Get fixtures by date range
   */
  async getFixturesByDateRange(
    from: string,
    to: string,
  ): Promise<ApiFootballFixture[]> {
    try {
      const response = await this.client.get<ApiFootballResponse>('/fixtures', {
        params: { from, to },
      });

      this.logger.log(
        `Fetched ${response.data.results} fixtures from ${from} to ${to}`,
      );
      return response.data.response;
    } catch (error) {
      this.logger.error(
        `Failed to fetch fixtures from ${from} to ${to}`,
        error.message,
      );
      return [];
    }
  }

  /**
   * Get fixtures by league and season
   */
  async getFixturesByLeague(
    leagueId: number,
    season: number,
  ): Promise<ApiFootballFixture[]> {
    try {
      const response = await this.client.get<ApiFootballResponse>('/fixtures', {
        params: { league: leagueId, season },
      });

      this.logger.log(
        `Fetched ${response.data.results} fixtures for league ${leagueId} season ${season}`,
      );
      return response.data.response;
    } catch (error) {
      this.logger.error(
        `Failed to fetch fixtures for league ${leagueId}`,
        error.message,
      );
      return [];
    }
  }

  /**
   * Get fixture by ID
   */
  async getFixtureById(fixtureId: number): Promise<ApiFootballFixture | null> {
    try {
      const response = await this.client.get<ApiFootballResponse>('/fixtures', {
        params: { id: fixtureId },
      });

      if (response.data.results > 0) {
        return response.data.response[0];
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch fixture ${fixtureId}`, error.message);
      return null;
    }
  }

  /**
   * Get finished matches (last 7 days)
   */
  async getFinishedMatches(): Promise<ApiFootballFixture[]> {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const from = sevenDaysAgo.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];

      const fixtures = await this.getFixturesByDateRange(from, to);

      // Filter only finished matches (FT, AET, PEN)
      const finishedStatuses = ['FT', 'AET', 'PEN'];
      return fixtures.filter((f) =>
        finishedStatuses.includes(f.fixture.status.short),
      );
    } catch (error) {
      this.logger.error('Failed to fetch finished matches', error.message);
      return [];
    }
  }

  /**
   * Get upcoming matches (next 7 days)
   */
  async getUpcomingMatches(): Promise<ApiFootballFixture[]> {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const toStr = sevenDaysLater.toISOString().split('T')[0];

      let allFixtures: ApiFootballFixture[] = [];

      // Fetch today's matches (with error handling)
      try {
        const todayFixtures = await this.getFixturesByDate(todayStr);
        allFixtures.push(...todayFixtures);
        this.logger.log(`Fetched ${todayFixtures.length} fixtures for today`);
      } catch (error) {
        this.logger.warn(`Failed to fetch today's fixtures: ${error.message}`);
      }

      // Fetch next 7 days matches (with error handling)
      try {
        const futureFixtures = await this.getFixturesByDateRange(
          tomorrowStr,
          toStr,
        );
        allFixtures.push(...futureFixtures);
        this.logger.log(
          `Fetched ${futureFixtures.length} fixtures for next 7 days`,
        );
      } catch (error) {
        this.logger.warn(`Failed to fetch future fixtures: ${error.message}`);
      }

      // Filter only not started matches (NS, TBD, PST, SUSP)
      const upcomingStatuses = ['NS', 'TBD', 'PST', 'SUSP'];
      const upcoming = allFixtures.filter((f) =>
        upcomingStatuses.includes(f.fixture.status.short),
      );

      this.logger.log(`Found ${upcoming.length} upcoming matches total`);
      return upcoming;
    } catch (error) {
      this.logger.error('Failed to fetch upcoming matches', error.message);
      return [];
    }
  }

  /**
   * Popular league IDs for quick reference
   */
  static readonly LEAGUES = {
    PREMIER_LEAGUE: 39, // England - Premier League
    LA_LIGA: 140, // Spain - La Liga
    BUNDESLIGA: 78, // Germany - Bundesliga
    SERIE_A: 135, // Italy - Serie A
    LIGUE_1: 61, // France - Ligue 1
    CHAMPIONS_LEAGUE: 2, // UEFA Champions League
    EUROPA_LEAGUE: 3, // UEFA Europa League
    WORLD_CUP: 1, // FIFA World Cup
  };
}

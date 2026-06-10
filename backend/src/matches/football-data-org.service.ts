import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { WorldCupFixture } from './world-cup-api.service';

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  season: { startDate: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score: { fullTime: { home: number | null; away: number | null } };
}

const STATUS_MAP: Record<string, { short: string; long: string }> = {
  SCHEDULED: { short: 'NS', long: 'Not Started' },
  TIMED: { short: 'NS', long: 'Not Started' },
  IN_PLAY: { short: '1H', long: 'In Play' },
  PAUSED: { short: 'HT', long: 'Halftime' },
  FINISHED: { short: 'FT', long: 'Full Time' },
  POSTPONED: { short: 'PST', long: 'Postponed' },
  SUSPENDED: { short: 'SUSP', long: 'Suspended' },
  CANCELLED: { short: 'CANC', long: 'Cancelled' },
  AWARDED: { short: 'AWD', long: 'Awarded' },
};

/**
 * football-data.org integration — used as the source for FIFA World Cup
 * fixtures since api-football's free tier blocks the current (2026) season.
 * Free tier on football-data.org includes the WC competition (code "WC").
 *
 * Supports up to 2 keys (FOOTBALL_DATA_API_KEY, FOOTBALL_DATA_API_KEY_2).
 * On a 429 from the active key, the next key is tried and becomes the new
 * active key (sticky switch), so a temporarily-limited key doesn't keep
 * failing every subsequent call.
 */
@Injectable()
export class FootballDataOrgService {
  private readonly logger = new Logger(FootballDataOrgService.name);
  private readonly client: AxiosInstance | null;
  private readonly keys: string[];
  private activeKeyIndex = 0;

  constructor(private configService: ConfigService) {
    this.keys = this.loadKeys();

    if (this.keys.length === 0) {
      this.logger.warn('FOOTBALL_DATA_API_KEY not configured — World Cup matches via football-data.org disabled');
      this.client = null;
      return;
    }

    this.logger.log(`Loaded ${this.keys.length} football-data.org key(s)`);

    this.client = axios.create({
      baseURL: 'https://api.football-data.org/v4',
      timeout: 30000,
    });

    this.client.interceptors.request.use((config) => {
      config.headers['X-Auth-Token'] = this.keys[this.activeKeyIndex];
      return config;
    });

    this.client.interceptors.response.use(
      (res) => res,
      async (err) => {
        if (err.response?.status === 429 && !(err.config as any)._retried && this.keys.length > 1) {
          this.activeKeyIndex = (this.activeKeyIndex + 1) % this.keys.length;
          this.logger.warn(`429 from football-data.org — switching to key index ${this.activeKeyIndex}`);
          (err.config as any)._retried = true;
          err.config.headers['X-Auth-Token'] = this.keys[this.activeKeyIndex];
          return this.client!.request(err.config);
        }
        throw err;
      },
    );
  }

  private loadKeys(): string[] {
    const keys: string[] = [];
    for (const envVar of ['FOOTBALL_DATA_API_KEY', 'FOOTBALL_DATA_API_KEY_2']) {
      const key = this.configService.get<string>(envVar, '');
      if (key && key !== 'YOUR_FOOTBALL_DATA_API_KEY') {
        keys.push(key);
      }
    }
    return keys;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private toFixture(m: FdMatch): WorldCupFixture {
    const status = STATUS_MAP[m.status] ?? { short: m.status, long: m.status };
    const round = m.group
      ? `${this.humanizeStage(m.stage)} - ${m.group.replace('_', ' ')}`
      : this.humanizeStage(m.stage);

    return {
      fixture: {
        id: m.id,
        date: m.utcDate,
        timestamp: Math.floor(new Date(m.utcDate).getTime() / 1000),
        status,
        venue: { name: 'TBD' },
      },
      league: {
        id: 1,
        name: 'World Cup',
        season: new Date(m.season.startDate).getFullYear(),
        round,
      },
      teams: {
        home: { id: m.homeTeam.id, name: m.homeTeam.name },
        away: { id: m.awayTeam.id, name: m.awayTeam.name },
      },
      goals: { home: m.score.fullTime.home, away: m.score.fullTime.away },
      score: { fulltime: { home: m.score.fullTime.home, away: m.score.fullTime.away } },
    };
  }

  private humanizeStage(stage: string): string {
    return stage
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Fetch all upcoming (not yet started) World Cup matches.
   * 1 API call — football-data.org free tier returns the full tournament
   * schedule for the WC competition.
   * Throws on failure so callers can record sync health.
   */
  async getUpcomingWorldCupMatches(): Promise<WorldCupFixture[]> {
    if (!this.client) return [];

    const response = await this.client.get('/competitions/WC/matches', {
      params: { status: 'SCHEDULED,TIMED' },
    });
    const matches: FdMatch[] = response.data.matches ?? [];
    this.logger.log(`✅ ${matches.length} upcoming World Cup matches (football-data.org)`);
    return matches.map((m) => this.toFixture(m));
  }

  /**
   * Fetch World Cup matches that are live or finished (1 API call).
   * Used for frequent polling: live scores keep the frontend up to date,
   * and FINISHED results let the AI oracle submit on-chain.
   * Throws on failure so callers can record sync health.
   */
  async getLiveAndFinishedWorldCupMatches(): Promise<WorldCupFixture[]> {
    if (!this.client) return [];

    const response = await this.client.get('/competitions/WC/matches', {
      params: { status: 'IN_PLAY,PAUSED,FINISHED' },
    });
    const matches: FdMatch[] = response.data.matches ?? [];
    return matches.map((m) => this.toFixture(m));
  }

  /**
   * Fetch a single World Cup match by its football-data.org match ID.
   */
  async getMatchById(matchId: string): Promise<WorldCupFixture | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.get(`/matches/${matchId}`);
      return this.toFixture(response.data);
    } catch (error) {
      this.logger.error(`Failed to fetch match ${matchId}`, error.message);
      return null;
    }
  }
}

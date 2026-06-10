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
 */
@Injectable()
export class FootballDataOrgService {
  private readonly logger = new Logger(FootballDataOrgService.name);
  private readonly client: AxiosInstance | null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('FOOTBALL_DATA_API_KEY', '');

    if (!apiKey || apiKey === 'YOUR_FOOTBALL_DATA_API_KEY') {
      this.logger.warn('FOOTBALL_DATA_API_KEY not configured — World Cup matches via football-data.org disabled');
      this.client = null;
      return;
    }

    this.client = axios.create({
      baseURL: 'https://api.football-data.org/v4',
      timeout: 30000,
      headers: { 'X-Auth-Token': apiKey },
    });
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
   */
  async getUpcomingWorldCupMatches(): Promise<WorldCupFixture[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.get('/competitions/WC/matches', {
        params: { status: 'SCHEDULED,TIMED' },
      });
      const matches: FdMatch[] = response.data.matches ?? [];
      this.logger.log(`✅ ${matches.length} upcoming World Cup matches (football-data.org)`);
      return matches.map((m) => this.toFixture(m));
    } catch (error) {
      this.logger.error('Failed to fetch upcoming World Cup matches', error.message);
      return [];
    }
  }

  /**
   * Fetch World Cup matches that are live or finished (1 API call).
   * Used for frequent polling: live scores keep the frontend up to date,
   * and FINISHED results let the AI oracle submit on-chain.
   */
  async getLiveAndFinishedWorldCupMatches(): Promise<WorldCupFixture[]> {
    if (!this.client) return [];

    try {
      const response = await this.client.get('/competitions/WC/matches', {
        params: { status: 'IN_PLAY,PAUSED,FINISHED' },
      });
      const matches: FdMatch[] = response.data.matches ?? [];
      return matches.map((m) => this.toFixture(m));
    } catch (error) {
      this.logger.error('Failed to fetch live/finished World Cup matches', error.message);
      return [];
    }
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

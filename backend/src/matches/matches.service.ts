import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ApiFootballService, ApiFootballFixture } from './api-football.service';

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  season: string;
  round: string;
  venue: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime?: number;
  finalHomeScore?: number;
  finalAwayScore?: number;
  status?: string;
  comment?: string;
}

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);
  private matches: Match[] = [];
  private useRealTimeData: boolean = false;

  constructor(private readonly apiFootballService: ApiFootballService) {
    this.loadMatches();
    this.useRealTimeData = this.apiFootballService.isConfigured();

    if (this.useRealTimeData) {
      this.logger.log('✅ Real-time API configured - will fetch live data');
    } else {
      this.logger.warn('⚠️ Real-time API not configured - using JSON fallback');
    }
  }

  /**
   * Load matches from JSON file
   */
  private loadMatches(): void {
    try {
      // Try multiple possible paths for the JSON file
      const possiblePaths = [
        path.join(__dirname, '../data/matches.json'), // Production build
        path.join(__dirname, '../../src/data/matches.json'), // Development
        path.join(process.cwd(), 'src/data/matches.json'), // From project root
        path.join(process.cwd(), 'dist/data/matches.json'), // From dist
      ];

      let fileContent: string | null = null;
      let loadedPath: string | null = null;

      for (const filePath of possiblePaths) {
        try {
          if (fs.existsSync(filePath)) {
            fileContent = fs.readFileSync(filePath, 'utf-8');
            loadedPath = filePath;
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }

      if (!fileContent) {
        this.logger.warn(
          'No matches.json file found - using empty array as fallback',
        );
        this.logger.warn(
          'Configure API_FOOTBALL_KEY in .env for real-time match data',
        );
        this.matches = [];
        return;
      }

      const data = JSON.parse(fileContent);
      this.matches = data.matches;
      this.logger.log(
        `Loaded ${this.matches.length} matches from JSON (${loadedPath})`,
      );
    } catch (error) {
      this.logger.warn('Failed to load matches from JSON - using empty array');
      this.logger.warn(
        'Configure API_FOOTBALL_KEY in .env for real-time match data',
      );
      this.matches = [];
    }
  }

  /**
   * Get all available matches
   */
  getAllMatches(): Match[] {
    return this.matches;
  }

  /**
   * Get matches by league
   */
  getMatchesByLeague(league: string): Match[] {
    return this.matches.filter(
      (m) => m.league.toLowerCase() === league.toLowerCase(),
    );
  }

  /**
   * Get matches by status (no-op since status removed from data)
   */
  getMatchesByStatus(_status: string): Match[] {
    return this.matches;
  }

  /**
   * Get all matches (no timestamps - admin sets times on frontend)
   */
  getUpcomingMatches(): Match[] {
    return this.matches;
  }

  /**
   * Get match by ID
   */
  getMatchById(id: string): Match | undefined {
    return this.matches.find((m) => m.id === id);
  }

  /**
   * Get matches for a specific team
   */
  getMatchesByTeam(teamId: string): Match[] {
    return this.matches.filter(
      (m) =>
        m.homeTeamId.toLowerCase() === teamId.toLowerCase() ||
        m.awayTeamId.toLowerCase() === teamId.toLowerCase(),
    );
  }

  /**
   * Get matches between two teams
   */
  getMatchBetweenTeams(
    homeTeamId: string,
    awayTeamId: string,
  ): Match | undefined {
    return this.matches.find(
      (m) =>
        m.homeTeamId.toLowerCase() === homeTeamId.toLowerCase() &&
        m.awayTeamId.toLowerCase() === awayTeamId.toLowerCase(),
    );
  }

  /**
   * Get random matches (useful for testing)
   */
  getRandomMatches(count: number = 5): Match[] {
    const shuffled = [...this.matches].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Search matches by team name
   */
  searchMatchesByTeamName(teamName: string): Match[] {
    const searchTerm = teamName.toLowerCase();
    return this.matches.filter(
      (m) =>
        m.homeTeam.toLowerCase().includes(searchTerm) ||
        m.awayTeam.toLowerCase().includes(searchTerm),
    );
  }

  /**
   * Get total number of matches
   */
  getTotalMatches(): number {
    return this.matches.length;
  }

  /**
   * Get matches statistics
   */
  getStatistics() {
    const leagues = new Set(this.matches.map((m) => m.league));

    return {
      totalMatches: this.matches.length,
      leagues: Array.from(leagues),
      matchesByLeague: Array.from(leagues).map((league) => ({
        league,
        count: this.matches.filter((m) => m.league === league).length,
      })),
      dataSource: this.useRealTimeData ? 'Real-time API' : 'JSON Fallback',
    };
  }

  /**
   * Convert API-Football fixture to Match format
   */
  private convertApiFixtureToMatch(fixture: ApiFootballFixture): Match {
    const homeTeamSlug = fixture.teams.home.name
      .toLowerCase()
      .replace(/\s+/g, '_');
    const awayTeamSlug = fixture.teams.away.name
      .toLowerCase()
      .replace(/\s+/g, '_');

    return {
      id: `api_${fixture.fixture.id}`,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      league: fixture.league.name,
      season: `${fixture.league.season}/${fixture.league.season + 1}`,
      round: fixture.league.round,
      venue: fixture.fixture.venue.name || 'TBD',
      homeTeamId: homeTeamSlug,
      awayTeamId: awayTeamSlug,
      kickoffTime: fixture.fixture.timestamp,
      finalHomeScore: fixture.score.fulltime.home ?? undefined,
      finalAwayScore: fixture.score.fulltime.away ?? undefined,
      status: fixture.fixture.status.short,
      comment: `${fixture.fixture.status.long}${fixture.fixture.status.elapsed ? ` - ${fixture.fixture.status.elapsed}'` : ''}`,
    };
  }

  /**
   * Get live matches from real-time API
   */
  async getLiveMatches(): Promise<Match[]> {
    if (!this.useRealTimeData) {
      this.logger.warn('Real-time API not available, returning empty array');
      return [];
    }

    try {
      const fixtures = await this.apiFootballService.getLiveMatches();
      return fixtures.map((f) => this.convertApiFixtureToMatch(f));
    } catch (error) {
      this.logger.error('Failed to fetch live matches', error);
      return [];
    }
  }

  /**
   * Get finished matches from real-time API
   */
  async getFinishedMatches(): Promise<Match[]> {
    if (!this.useRealTimeData) {
      // Fallback to JSON data with FT status
      return this.matches.filter((m) => m.status === 'FT');
    }

    try {
      const fixtures = await this.apiFootballService.getFinishedMatches();
      return fixtures.map((f) => this.convertApiFixtureToMatch(f));
    } catch (error) {
      this.logger.error('Failed to fetch finished matches', error);
      return this.matches.filter((m) => m.status === 'FT');
    }
  }

  /**
   * Get upcoming matches from real-time API
   */
  async getUpcomingMatchesFromApi(): Promise<Match[]> {
    if (!this.useRealTimeData) {
      // Fallback to JSON data
      return this.matches;
    }

    try {
      const fixtures = await this.apiFootballService.getUpcomingMatches();
      return fixtures.map((f) => this.convertApiFixtureToMatch(f));
    } catch (error) {
      this.logger.error('Failed to fetch upcoming matches', error);
      return this.matches;
    }
  }

  /**
   * Get matches by date from real-time API
   */
  async getMatchesByDate(date: string): Promise<Match[]> {
    if (!this.useRealTimeData) {
      this.logger.warn('Real-time API not available, returning JSON data');
      return this.matches;
    }

    try {
      const fixtures = await this.apiFootballService.getFixturesByDate(date);
      return fixtures.map((f) => this.convertApiFixtureToMatch(f));
    } catch (error) {
      this.logger.error(`Failed to fetch matches for date ${date}`, error);
      return [];
    }
  }

  /**
   * Get match by API fixture ID
   */
  async getMatchByApiId(fixtureId: number): Promise<Match | null> {
    if (!this.useRealTimeData) {
      this.logger.warn('Real-time API not available');
      return null;
    }

    try {
      const fixture = await this.apiFootballService.getFixtureById(fixtureId);
      if (!fixture) return null;
      return this.convertApiFixtureToMatch(fixture);
    } catch (error) {
      this.logger.error(`Failed to fetch fixture ${fixtureId}`, error);
      return null;
    }
  }

  /**
   * Check if real-time data is available
   */
  isRealTimeDataAvailable(): boolean {
    return this.useRealTimeData;
  }
}

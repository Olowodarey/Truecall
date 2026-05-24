import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  season: string;
  round: string;
  kickoffTime: number;
  predictionDeadline: number;
  status: string;
  venue: string;
  homeTeamId: string;
  awayTeamId: string;
}

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);
  private matches: Match[] = [];

  constructor() {
    this.loadMatches();
  }

  /**
   * Load matches from JSON file
   */
  private loadMatches(): void {
    try {
      const filePath = path.join(__dirname, '../data/matches.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      this.matches = data.matches;
      this.logger.log(`Loaded ${this.matches.length} matches from JSON`);
    } catch (error) {
      this.logger.error('Failed to load matches from JSON', error);
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
   * Get matches by status
   */
  getMatchesByStatus(status: string): Match[] {
    return this.matches.filter(
      (m) => m.status.toLowerCase() === status.toLowerCase(),
    );
  }

  /**
   * Get upcoming matches (within next 7 days)
   */
  getUpcomingMatches(): Match[] {
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60;

    return this.matches.filter(
      (m) => m.kickoffTime >= now && m.kickoffTime <= sevenDaysFromNow,
    );
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
    const statuses = new Set(this.matches.map((m) => m.status));

    return {
      totalMatches: this.matches.length,
      leagues: Array.from(leagues),
      statuses: Array.from(statuses),
      matchesByLeague: Array.from(leagues).map((league) => ({
        league,
        count: this.matches.filter((m) => m.league === league).length,
      })),
    };
  }
}

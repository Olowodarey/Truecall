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
        throw new Error(
          `Could not find matches.json in any of the expected locations: ${possiblePaths.join(', ')}`,
        );
      }

      const data = JSON.parse(fileContent);
      this.matches = data.matches;
      this.logger.log(
        `Loaded ${this.matches.length} matches from JSON (${loadedPath})`,
      );
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
    };
  }
}

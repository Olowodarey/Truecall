import * as fs from "fs";
import * as path from "path";

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
  kickoffTime: number; // Unix timestamp
}

/**
 * MatchDataService — Load and manage match data from local JSON
 * The AI agent uses this to fetch match information for verification
 */
export class MatchDataService {
  private matches: Match[] = [];

  constructor() {
    this.loadMatches();
  }

  /**
   * Load matches from JSON file
   */
  private loadMatches(): void {
    try {
      const possiblePaths = [
        path.join(__dirname, "../data/matches.json"),
        path.join(__dirname, "../../src/data/matches.json"),
        path.join(process.cwd(), "src/data/matches.json"),
        path.join(process.cwd(), "dist/services/../data/matches.json"),
      ];

      let fileContent: string | null = null;
      let loadedPath: string | null = null;

      for (const filePath of possiblePaths) {
        try {
          if (fs.existsSync(filePath)) {
            fileContent = fs.readFileSync(filePath, "utf-8");
            loadedPath = filePath;
            console.log(`✅ Loaded matches from: ${loadedPath}`);
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }

      if (!fileContent) {
        throw new Error(
          `Could not find matches.json in any of the expected locations`,
        );
      }

      const data = JSON.parse(fileContent);
      this.matches = data.matches || [];
      console.log(`✅ Loaded ${this.matches.length} matches from JSON`);
    } catch (error) {
      console.error("❌ Failed to load matches from JSON:", error);
      this.matches = [];
    }
  }

  /**
   * Get all matches
   */
  getAllMatches(): Match[] {
    return this.matches;
  }

  /**
   * Get a match by ID
   */
  getMatchById(id: string): Match | undefined {
    return this.matches.find((m) => m.id === id);
  }

  /**
   * Get matches that are ready for verification (past kickoff time)
   */
  getReadyForVerification(): Match[] {
    const now = Math.floor(Date.now() / 1000);
    return this.matches.filter((m) => m.kickoffTime <= now);
  }

  /**
   * Get upcoming matches (not yet kicked off)
   */
  getUpcoming(): Match[] {
    const now = Math.floor(Date.now() / 1000);
    return this.matches.filter((m) => m.kickoffTime > now);
  }

  /**
   * Get match by external API ID
   */
  getByApiId(apiId: string): Match | undefined {
    return this.matches.find((m) => m.id === apiId);
  }

  /**
   * Get total count
   */
  getTotalCount(): number {
    return this.matches.length;
  }

  /**
   * Pretty print match info
   */
  formatMatch(match: Match): string {
    const kickoffDate = new Date(match.kickoffTime * 1000).toLocaleString();
    return `${match.homeTeam} vs ${match.awayTeam} (${match.league}) - Kickoff: ${kickoffDate}`;
  }
}

// Export singleton instance
export const matchDataService = new MatchDataService();

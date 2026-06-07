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
  kickoffTime?: number; // Unix timestamp (optional)
  finalHomeScore?: number;
  finalAwayScore?: number;
  status?: string;
}

/**
 * MatchDataService — Fetch match data from backend API
 * The AI agent uses this to fetch match information for verification
 */
export class MatchDataService {
  private matches: Match[] = [];
  private backendApiUrl: string;
  private lastFetchTime: number = 0;
  private cacheDurationMs: number = 1800_000; // 30 minutes cache (reduced API calls)

  constructor(backendApiUrl: string) {
    this.backendApiUrl = backendApiUrl;
  }

  /**
   * Load matches from backend API
   * Fetches finished matches (status=finished) for result submission
   */
  private async loadMatches(): Promise<void> {
    try {
      // Fetch finished matches for result submission
      const response = await fetch(
        `${this.backendApiUrl}/matches?status=finished`,
      );

      if (!response.ok) {
        throw new Error(
          `Backend API returned ${response.status}: ${response.statusText}`,
        );
      }

      const matches = await response.json();
      this.matches = Array.isArray(matches) ? matches : [];
      this.lastFetchTime = Date.now();

      console.log(
        `✅ Loaded ${this.matches.length} finished matches from backend API`,
      );
    } catch (error) {
      console.error("❌ Failed to load matches from backend API:", error);
      this.matches = [];
    }
  }

  /**
   * Ensure matches are loaded and not stale
   */
  private async ensureFreshData(): Promise<void> {
    const now = Date.now();
    const isCacheStale = now - this.lastFetchTime > this.cacheDurationMs;

    if (this.matches.length === 0 || isCacheStale) {
      await this.loadMatches();
    }
  }

  /**
   * Get all matches
   */
  async getAllMatches(): Promise<Match[]> {
    await this.ensureFreshData();
    return this.matches;
  }

  /**
   * Get a match by ID
   */
  async getMatchById(id: string): Promise<Match | undefined> {
    await this.ensureFreshData();
    return this.matches.find((m) => m.id === id);
  }

  /**
   * Get matches that are ready for verification (past kickoff time)
   */
  async getReadyForVerification(): Promise<Match[]> {
    await this.ensureFreshData();
    const now = Math.floor(Date.now() / 1000);
    return this.matches.filter((m) => m.kickoffTime && m.kickoffTime <= now);
  }

  /**
   * Get upcoming matches (not yet kicked off)
   */
  async getUpcoming(): Promise<Match[]> {
    await this.ensureFreshData();
    const now = Math.floor(Date.now() / 1000);
    return this.matches.filter((m) => m.kickoffTime && m.kickoffTime > now);
  }

  /**
   * Get match by external API ID
   */
  async getByApiId(apiId: string): Promise<Match | undefined> {
    await this.ensureFreshData();
    return this.matches.find((m) => m.id === apiId);
  }

  /**
   * Get total count
   */
  async getTotalCount(): Promise<number> {
    await this.ensureFreshData();
    return this.matches.length;
  }

  /**
   * Pretty print match info
   */
  formatMatch(match: Match): string {
    const kickoffDate = match.kickoffTime
      ? new Date(match.kickoffTime * 1000).toLocaleString()
      : "TBD";
    return `${match.homeTeam} vs ${match.awayTeam} (${match.league}) - Kickoff: ${kickoffDate}`;
  }

  /**
   * Force refresh matches from backend
   */
  async refresh(): Promise<void> {
    await this.loadMatches();
  }
}

// Export factory function instead of singleton
// This allows dependency injection of the backend URL
export function createMatchDataService(
  backendApiUrl: string,
): MatchDataService {
  return new MatchDataService(backendApiUrl);
}

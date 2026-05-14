import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { logger } from "../utils/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchScore {
  homeScore: number;
  awayScore: number;
}

export type MatchStatus =
  | "NS" // Not Started
  | "1H" // First Half
  | "HT" // Half Time
  | "2H" // Second Half
  | "ET" // Extra Time
  | "P" // Penalty In Progress
  | "FT" // Full Time ← this is what we wait for
  | "AET" // After Extra Time
  | "PEN" // After Penalties
  | "BT" // Break Time
  | "SUSP" // Suspended
  | "INT" // Interrupted
  | "PST" // Postponed
  | "CANC" // Cancelled
  | "ABD" // Abandoned
  | "AWD" // Technical Loss
  | "WO" // WalkOver
  | "LIVE"; // Live

export interface MatchResult {
  apiMatchId: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  isFinished: boolean;
}

// ─── Client ───────────────────────────────────────────────────────────────────

class FootballApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiFootballBaseUrl,
      headers: {
        "x-apisports-key": config.apiFootballKey,
      },
      timeout: 10_000,
    });
  }

  /**
   * Fetch the current status and score for a match by its API-Football fixture ID.
   * Returns null if the API call fails (agent will retry on next poll).
   */
  async getMatchResult(apiMatchId: string): Promise<MatchResult | null> {
    try {
      const response = await this.client.get("/fixtures", {
        params: { id: apiMatchId },
      });

      const fixtures = response.data?.response;
      if (!fixtures || fixtures.length === 0) {
        logger.warn("No fixture found for apiMatchId", { apiMatchId });
        return null;
      }

      const fixture = fixtures[0];
      const status: MatchStatus = fixture.fixture.status.short;
      const goals = fixture.goals;

      // A match is finished when status is FT, AET, or PEN
      const isFinished = ["FT", "AET", "PEN"].includes(status);

      return {
        apiMatchId,
        status,
        homeScore: goals.home,
        awayScore: goals.away,
        isFinished,
      };
    } catch (err) {
      logger.error("Failed to fetch match result from API-Football", {
        apiMatchId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}

export const footballApi = new FootballApiClient();

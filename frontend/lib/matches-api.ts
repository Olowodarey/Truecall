/**
 * Matches API Client
 * Frontend helper for fetching match data from backend
 */

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

/**
 * Get all matches (with optional filters)
 */
export async function getAllMatches(params?: {
  status?: "live" | "finished" | "upcoming";
  league?: string;
  realtime?: boolean;
}): Promise<Match[]> {
  try {
    const searchParams = new URLSearchParams();

    if (params?.status) searchParams.append("status", params.status);
    if (params?.league) searchParams.append("league", params.league);
    if (params?.realtime) searchParams.append("realtime", "true");

    const url = searchParams.toString()
      ? `/api/matches?${searchParams.toString()}`
      : "/api/matches";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch matches: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }
}

/**
 * Get live matches (currently playing)
 */
export async function getLiveMatches(): Promise<Match[]> {
  try {
    const response = await fetch("/api/matches/live");

    if (!response.ok) {
      throw new Error(`Failed to fetch live matches: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching live matches:", error);
    throw error;
  }
}

/**
 * Get finished matches (last 7 days)
 */
export async function getFinishedMatches(): Promise<Match[]> {
  try {
    const response = await fetch("/api/matches/finished");

    if (!response.ok) {
      throw new Error(
        `Failed to fetch finished matches: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching finished matches:", error);
    throw error;
  }
}

/**
 * Get upcoming matches (next 7 days)
 * Used by creators to select matches for their events
 */
export async function getUpcomingMatches(): Promise<Match[]> {
  try {
    const response = await fetch("/api/matches/upcoming");

    if (!response.ok) {
      throw new Error(
        `Failed to fetch upcoming matches: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching upcoming matches:", error);
    throw error;
  }
}

/**
 * Get matches by league
 */
export async function getMatchesByLeague(league: string): Promise<Match[]> {
  return getAllMatches({ league });
}

/**
 * Format kickoff time to readable string
 */
export function formatKickoffTime(timestamp?: number): string {
  if (!timestamp) return "TBD";

  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  // If in the past
  if (diffMins < 0) {
    return date.toLocaleString();
  }

  // If within 24 hours
  if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours === 0) {
      return `${mins} min${mins !== 1 ? "s" : ""}`;
    }
    return `${hours}h ${mins}m`;
  }

  // Otherwise show date
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get match status badge color
 */
export function getStatusColor(status?: string): string {
  switch (status) {
    case "FT": // Full Time
    case "AET": // After Extra Time
    case "PEN": // Penalties
      return "bg-green-500/20 text-green-400";
    case "1H": // First Half
    case "2H": // Second Half
    case "HT": // Halftime
      return "bg-red-500/20 text-red-400 animate-pulse";
    case "NS": // Not Started
    case "TBD": // To Be Determined
      return "bg-blue-500/20 text-blue-400";
    case "PST": // Postponed
    case "CANC": // Cancelled
      return "bg-gray-500/20 text-gray-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status?: string): string {
  switch (status) {
    case "FT":
      return "Full Time";
    case "AET":
      return "After Extra Time";
    case "PEN":
      return "Penalties";
    case "1H":
      return "Live - 1st Half";
    case "2H":
      return "Live - 2nd Half";
    case "HT":
      return "Halftime";
    case "NS":
      return "Not Started";
    case "TBD":
      return "To Be Determined";
    case "PST":
      return "Postponed";
    case "CANC":
      return "Cancelled";
    default:
      return status || "Unknown";
  }
}

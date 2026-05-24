import { apiClient } from "./apiClient";

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

/**
 * Get all available matches
 */
export async function fetchAllMatches(): Promise<Match[]> {
  return apiClient.get<Match[]>("/matches");
}

/**
 * Get matches by league
 */
export async function fetchMatchesByLeague(league: string): Promise<Match[]> {
  return apiClient.get<Match[]>(`/matches/league/${league}`);
}

/**
 * Get upcoming matches (next 7 days)
 */
export async function fetchUpcomingMatches(): Promise<Match[]> {
  return apiClient.get<Match[]>("/matches/upcoming");
}

/**
 * Get random matches for testing
 */
export async function fetchRandomMatches(count: number = 5): Promise<Match[]> {
  return apiClient.get<Match[]>(`/matches/random?count=${count}`);
}

/**
 * Get matches for a specific team
 */
export async function fetchMatchesByTeam(teamId: string): Promise<Match[]> {
  return apiClient.get<Match[]>(`/matches/team/${teamId}`);
}

/**
 * Search matches by team name
 */
export async function searchMatches(teamName: string): Promise<Match[]> {
  return apiClient.get<Match[]>(
    `/matches/search?team=${encodeURIComponent(teamName)}`,
  );
}

/**
 * Get a specific match by ID
 */
export async function fetchMatchById(id: string): Promise<Match> {
  return apiClient.get<Match>(`/matches/${id}`);
}

/**
 * Get matches statistics
 */
export async function fetchMatchesStatistics(): Promise<{
  totalMatches: number;
  leagues: string[];
  statuses: string[];
  matchesByLeague: Array<{ league: string; count: number }>;
}> {
  return apiClient.get("/matches/statistics");
}

/**
 * Get all matches with optional filters
 */
export async function fetchMatches(options?: {
  league?: string;
  status?: string;
  upcoming?: boolean;
}): Promise<Match[]> {
  const params = new URLSearchParams();
  if (options?.league) params.append("league", options.league);
  if (options?.status) params.append("status", options.status);
  if (options?.upcoming) params.append("upcoming", "true");

  const queryString = params.toString();
  const url = queryString ? `/matches?${queryString}` : "/matches";
  return apiClient.get<Match[]>(url);
}

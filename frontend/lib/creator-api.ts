/**
 * creator-api.ts — All reads for CreatorEventManager go through the backend.
 * Writes (createEvent, joinEvent, submitPrediction) go directly via wagmi.
 */

const BASE = "/api/creator-events";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatorEvent {
  eventId: number;
  creator: string;
  eventName: string;
  createdAt: number;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
}

export interface CreatorMatch {
  matchId: number;
  eventId: number;
  homeTeam: string;
  awayTeam: string;
  apiMatchId: string;
  kickoffTime: number;
  status: "OPEN" | "VERIFIED";
  finalHomeScore: number;
  finalAwayScore: number;
  verifiedAt: number;
}

export interface OpenMatch extends CreatorMatch {
  eventName: string;
}

export interface MatchWinner {
  user: string;
  submittedAt: number;
  twitterHandle?: string | null;
  twitterAvatar?: string | null;
}

export interface UserWin {
  eventId: number;
  eventName: string;
  creator: string;
  creatorTwitter?: string | null;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  finalHomeScore: number;
  finalAwayScore: number;
  verifiedAt: number;
}

export interface CreatorPrediction {
  matchId: number;
  user: string;
  homeScore: number;
  awayScore: number;
  submitted: boolean;
  submittedAt: number;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export const fetchCreatorEvents = (): Promise<CreatorEvent[]> => get("");

export const fetchCreatorEvent = (id: number): Promise<CreatorEvent> =>
  get(`/${id}`);

export const fetchCreatorEventMatches = (id: number): Promise<CreatorMatch[]> =>
  get(`/${id}/matches`);

export const fetchOpenMatches = (): Promise<OpenMatch[]> =>
  get(`/admin/open-matches`);

export const fetchCreatorHasJoined = (
  id: number,
  address: string,
): Promise<{ eventId: number; user: string; joined: boolean }> =>
  get(`/${id}/joined/${address}`);

export interface UserEvents {
  created: CreatorEvent[];
  joined: CreatorEvent[];
}

export const fetchUserEvents = (address: string): Promise<UserEvents> =>
  get(`/user/${address}`);

export const fetchUserWins = (address: string): Promise<UserWin[]> =>
  get(`/user/${address}/wins`);

// ─── Matches ──────────────────────────────────────────────────────────────────

export const fetchMatchWinners = (
  matchId: number,
): Promise<{ matchId: number; count: number; winners: MatchWinner[] }> =>
  get(`/match/${matchId}/winners`);

// ─── Fee ──────────────────────────────────────────────────────────────────────

export const fetchCreationFee = (): Promise<{
  amount: string;
  amountRaw: string;
}> => get("/fee");

/**
 * creator-api.ts — All reads for CreatorEventManager go through the backend.
 * Writes (createEvent, joinEvent, submitPrediction) go directly via wagmi.
 */

const BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api") +
  "/creator-events";

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
  status: "OPEN" | "CANCELLED";
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

export interface MatchWinner {
  user: string;
  submittedAt: number; // original prediction timestamp
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

export const fetchCreatorEvents = (): Promise<CreatorEvent[]> => get("/");

export const fetchCreatorEvent = (id: number): Promise<CreatorEvent> =>
  get(`/${id}`);

export const fetchCreatorEventMatches = (id: number): Promise<CreatorMatch[]> =>
  get(`/${id}/matches`);

export const fetchCreatorParticipants = (
  id: number,
): Promise<{ eventId: number; count: number; participants: string[] }> =>
  get(`/${id}/participants`);

export const fetchCreatorHasJoined = (
  id: number,
  address: string,
): Promise<{ eventId: number; user: string; joined: boolean }> =>
  get(`/${id}/joined/${address}`);

// ─── Matches ──────────────────────────────────────────────────────────────────

export const fetchCreatorMatch = (matchId: number): Promise<CreatorMatch> =>
  get(`/match/${matchId}`);

export const fetchMatchWinners = (
  matchId: number,
): Promise<{ matchId: number; count: number; winners: MatchWinner[] }> =>
  get(`/match/${matchId}/winners`);

export const fetchCreatorPrediction = (
  matchId: number,
  address: string,
): Promise<CreatorPrediction> => get(`/match/${matchId}/prediction/${address}`);

// ─── Verification ─────────────────────────────────────────────────────────────

export const fetchVerificationStatus = (
  address: string,
): Promise<{ user: string; verified: boolean }> =>
  get(`/verify/status/${address}`);

// ─── Fee ──────────────────────────────────────────────────────────────────────

export const fetchCreationFee = (): Promise<{
  amount: string; // formatted CELO e.g. "0.1"
  amountRaw: string; // wei string
}> => get("/fee");

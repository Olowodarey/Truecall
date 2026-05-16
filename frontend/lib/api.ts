/**
 * api.ts — All data fetching goes through the NestJS backend.
 * The frontend never talks to the blockchain directly for reads.
 * Writes (join, predict, claim) still go directly to the contract via wagmi.
 */

import type {
  TrueCallEvent,
  TrueCallMatch,
  TrueCallPrediction,
  LeaderboardEntry,
  ParticipantsResponse,
  WinnersResponse,
  JoinedResponse,
  ClaimableResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ─── Events ───────────────────────────────────────────────────────────────────

export const fetchEvents = (): Promise<TrueCallEvent[]> => get("/events");

export const fetchEvent = (id: number): Promise<TrueCallEvent> =>
  get(`/events/${id}`);

export const fetchEventMatches = (id: number): Promise<TrueCallMatch[]> =>
  get(`/events/${id}/matches`);

export const fetchParticipants = (id: number): Promise<ParticipantsResponse> =>
  get(`/events/${id}/participants`);

export const fetchWinners = (id: number): Promise<WinnersResponse> =>
  get(`/events/${id}/winners`);

export const fetchHasJoined = (
  id: number,
  address: string,
): Promise<JoinedResponse> => get(`/events/${id}/joined/${address}`);

export const joinEventApi = (id: number, address: string): Promise<any> =>
  post(`/events/${id}/join`, { eventId: id, userAddress: address });

export const fetchClaimable = (
  id: number,
  address: string,
): Promise<ClaimableResponse> => get(`/events/${id}/claimable/${address}`);

// ─── Matches ──────────────────────────────────────────────────────────────────

export const fetchMatch = (matchId: number): Promise<TrueCallMatch> =>
  get(`/matches/${matchId}`);

export const fetchPrediction = (
  matchId: number,
  address: string,
): Promise<TrueCallPrediction> =>
  get(`/matches/${matchId}/prediction/${address}`);

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export const fetchEventLeaderboard = (
  eventId: number,
  limit = 10,
): Promise<{ eventId: number; leaderboard: LeaderboardEntry[] }> =>
  get(`/leaderboard/event/${eventId}?limit=${limit}`);

export const fetchGlobalLeaderboard = (
  limit = 10,
): Promise<{ leaderboard: LeaderboardEntry[] }> =>
  get(`/leaderboard/global?limit=${limit}`);

export const fetchUserEventRank = (
  eventId: number,
  address: string,
): Promise<{ eventId: number; user: string; rank: number; points: number }> =>
  get(`/leaderboard/event/${eventId}/${address}`);

export const fetchGlobalPoints = (
  address: string,
): Promise<{ user: string; points: number }> =>
  get(`/leaderboard/global/${address}`);

// ─── EVM / TrueCall types — aligned with NestJS backend responses ─────────────

export type EventStatus = "OPEN" | "RESOLVED" | "CANCELLED";
export type EventType = "PUBLIC" | "PRIVATE";
export type MatchStatus = "OPEN" | "LOCKED" | "VERIFIED" | "DISPUTED";
export type Outcome = "HOME_WIN" | "DRAW" | "AWAY_WIN";
export type EventFilter = "all" | "open" | "resolved" | "cancelled";

export interface TrueCallEvent {
  eventId: number;
  eventType: EventType;
  creator: string;
  eventName: string;
  startDate: number; // unix timestamp
  endDate: number; // unix timestamp
  entryFee: string; // cUSD formatted (e.g. "1.0")
  prizePool: string; // cUSD formatted
  maxParticipants: number; // 0 = unlimited
  status: EventStatus;
}

export interface TrueCallMatch {
  matchId: number;
  eventId: number;
  homeTeam: string;
  awayTeam: string;
  apiMatchId: string;
  kickoffTime: number; // unix timestamp
  predictionDeadline: number; // unix timestamp
  status: MatchStatus;
  finalHomeScore: number;
  finalAwayScore: number;
  verifiedAt: number;
  allowScorePrediction: boolean;
  allowOutcomePrediction: boolean;
}

export interface TrueCallPrediction {
  matchId: number;
  user: string;
  homeScore: number;
  awayScore: number;
  hasScorePrediction: boolean;
  outcome: Outcome;
  hasOutcomePrediction: boolean;
  submittedAt: number;
  scorePointsEarned: number;
  outcomePointsEarned: number;
  totalPoints: number;
}

export interface LeaderboardEntry {
  rank: number;
  user: string;
  points: number;
  firstSubmission?: number;
}

export interface ParticipantsResponse {
  eventId: number;
  count: number;
  participants: string[];
}

export interface WinnersResponse {
  eventId: number;
  winners: string[];
}

export interface JoinedResponse {
  eventId: number;
  user: string;
  joined: boolean;
}

export interface ClaimableResponse {
  eventId: number;
  user: string;
  claimable: string; // cUSD formatted
  currency: string;
}

/**
 * Common type definitions for API responses
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  path: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Event response
 */
export interface EventResponse {
  eventId: number;
  eventType: string;
  creator: string;
  eventName: string;
  startDate: number;
  endDate: number;
  entryFee: string;
  prizePool: string;
  maxParticipants: number;
  status: string;
  entryToken: string;
}

/**
 * Match response
 */
export interface MatchResponse {
  matchId: number;
  eventId: number;
  homeTeam: string;
  awayTeam: string;
  apiMatchId: string;
  status: string;
  kickoffTime: number;
  predictionDeadline: number;
  allowScorePrediction: boolean;
  allowOutcomePrediction: boolean;
  finalHomeScore?: number;
  finalAwayScore?: number;
}

/**
 * Leaderboard entry response
 */
export interface LeaderboardEntryResponse {
  user: string;
  points: number;
  rank: number;
}

/**
 * Leaderboard response
 */
export interface LeaderboardResponse {
  eventId: number;
  leaderboard: LeaderboardEntryResponse[];
  totalParticipants: number;
}

/**
 * User prediction response
 */
export interface PredictionResponse {
  matchId: number;
  user: string;
  predictedScore?: {
    home: number;
    away: number;
  };
  predictedOutcome?: number; // 0=HOME, 1=DRAW, 2=AWAY
  points: number;
  timestamp: number;
}

/**
 * Transaction response
 */
export interface TransactionResponse {
  hash: string;
  from: string;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  blockNumber?: number;
  status?: number;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
  path: string;
  statusCode?: number;
}

/**
 * Joined event response
 */
export interface JoinedResponse {
  eventId: number;
  user: string;
  joined: boolean;
  joinedAt?: number;
}

/**
 * Claimable response
 */
export interface ClaimableResponse {
  eventId: number;
  user: string;
  claimable: string;
  entryToken: string;
}

/**
 * Participants response
 */
export interface ParticipantsResponse {
  eventId: number;
  count: number;
  participants: string[];
}

/**
 * Winners response
 */
export interface WinnersResponse {
  eventId: number;
  winners: Array<{
    rank: number;
    user: string;
    points: number;
    prize: string;
  }>;
}

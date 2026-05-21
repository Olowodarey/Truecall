import type {
  TrueCallEvent,
  TrueCallMatch,
  LeaderboardEntry,
} from "@/lib/types";

/**
 * Mock event data for testing
 */
export const mockEvent: TrueCallEvent = {
  eventId: 1,
  eventName: "Premier League Week 1",
  eventType: "PUBLIC",
  creator: "0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b",
  startDate: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  endDate: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
  entryFee: "1",
  prizePool: "100",
  maxParticipants: 1000,
  status: "OPEN",
  entryToken: "0x0000000000000000000000000000000000000000", // Native CELO
};

/**
 * Mock matches data for testing
 */
export const mockMatches: TrueCallMatch[] = [
  {
    matchId: 1,
    eventId: 1,
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    apiMatchId: "match_001",
    status: "OPEN",
    kickoffTime: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
    predictionDeadline: Math.floor(Date.now() / 1000) + 6300, // 1h 45m from now
    allowScorePrediction: true,
    allowOutcomePrediction: true,
  },
  {
    matchId: 2,
    eventId: 1,
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    apiMatchId: "match_002",
    status: "OPEN",
    kickoffTime: Math.floor(Date.now() / 1000) + 10800, // 3 hours from now
    predictionDeadline: Math.floor(Date.now() / 1000) + 9900, // 2h 45m from now
    allowScorePrediction: true,
    allowOutcomePrediction: true,
  },
];

/**
 * Mock leaderboard data for testing
 */
export const mockLeaderboard: LeaderboardEntry[] = [
  {
    user: "0x1234567890123456789012345678901234567890",
    points: 15,
  },
  {
    user: "0x0987654321098765432109876543210987654321",
    points: 12,
  },
  {
    user: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    points: 10,
  },
  {
    user: "0xfedcbafedcbafedcbafedcbafedcbafedcbafed",
    points: 8,
  },
  {
    user: "0x1111111111111111111111111111111111111111",
    points: 5,
  },
];

/**
 * Generate mock event with custom data
 */
export function createMockEvent(
  overrides?: Partial<TrueCallEvent>,
): TrueCallEvent {
  return {
    ...mockEvent,
    ...overrides,
  };
}

/**
 * Generate mock match with custom data
 */
export function createMockMatch(
  overrides?: Partial<TrueCallMatch>,
): TrueCallMatch {
  return {
    ...mockMatches[0],
    ...overrides,
  };
}

/**
 * Generate mock leaderboard entry
 */
export function createMockLeaderboardEntry(
  overrides?: Partial<LeaderboardEntry>,
): LeaderboardEntry {
  return {
    ...mockLeaderboard[0],
    ...overrides,
  };
}

/**
 * Generate array of mock leaderboard entries
 */
export function createMockLeaderboard(count: number = 5): LeaderboardEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    user: `0x${String(i).padStart(40, "0")}`,
    points: Math.max(0, 20 - i * 3),
  }));
}

import { useState, useCallback, useEffect } from "react";
import {
  fetchEvent,
  fetchEventMatches,
  fetchEventLeaderboard,
  fetchHasJoined,
  fetchClaimable,
} from "@/lib/api";
import type {
  TrueCallEvent,
  TrueCallMatch,
  LeaderboardEntry,
} from "@/lib/types";

interface UseEventDataResult {
  event: TrueCallEvent | null;
  matches: TrueCallMatch[];
  leaderboard: LeaderboardEntry[];
  hasJoined: boolean;
  claimable: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage event data
 */
export function useEventData(
  eventId: number,
  userAddress?: string,
): UseEventDataResult {
  const [event, setEvent] = useState<TrueCallEvent | null>(null);
  const [matches, setMatches] = useState<TrueCallMatch[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [claimable, setClaimable] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (isNaN(eventId)) return;
    try {
      setLoading(true);
      setError(null);
      const [ev, ms, lb] = await Promise.all([
        fetchEvent(eventId),
        fetchEventMatches(eventId),
        fetchEventLeaderboard(eventId),
      ]);
      setEvent(ev);
      setMatches(ms);
      setLeaderboard(lb.leaderboard);

      if (userAddress) {
        const [joined, claimRes] = await Promise.all([
          fetchHasJoined(eventId, userAddress),
          fetchClaimable(eventId, userAddress),
        ]);
        setHasJoined(joined.joined);
        setClaimable(claimRes.claimable);
      }
    } catch (err) {
      setError("Failed to load event data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [eventId, userAddress]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    event,
    matches,
    leaderboard,
    hasJoined,
    claimable,
    loading,
    error,
    refetch,
  };
}

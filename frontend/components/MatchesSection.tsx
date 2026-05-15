"use client";

import { useEffect, useState } from "react";
import { fetchEvents, fetchEventMatches } from "@/lib/api";
import type { TrueCallMatch } from "@/lib/types";
import { format } from "date-fns";

export default function MatchesSection() {
  const [matches, setMatches] = useState<TrueCallMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const events = await fetchEvents();
        const openEvents = events
          .filter((e) => e.status === "OPEN")
          .slice(0, 3);
        const allMatches = await Promise.all(
          openEvents.map((e) => fetchEventMatches(e.eventId)),
        );
        setMatches(
          allMatches
            .flat()
            .filter((m) => m.status === "OPEN")
            .slice(0, 6),
        );
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  if (matches.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Open Matches
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((m) => (
            <div
              key={m.matchId}
              className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-bold">{m.homeTeam}</span>
                <span className="text-gray-500 text-sm">vs</span>
                <span className="text-white font-bold">{m.awayTeam}</span>
              </div>
              <p className="text-gray-400 text-xs text-center">
                {format(new Date(m.kickoffTime * 1000), "MMM d, HH:mm")}
              </p>
              <div className="flex justify-center gap-2 mt-2">
                {m.allowScorePrediction && (
                  <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded text-xs">
                    Score 5pts
                  </span>
                )}
                {m.allowOutcomePrediction && (
                  <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs">
                    Outcome 3pts
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

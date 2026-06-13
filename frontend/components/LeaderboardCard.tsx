import { forwardRef } from "react";
import type { EventLeaderboard } from "@/lib/creator-api";

interface LeaderboardCardProps {
  data: EventLeaderboard;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Styled card rendered off-screen and captured as a PNG for sharing. Layout
 * uses fixed pixel widths (not responsive units) so the exported image looks
 * consistent regardless of viewport.
 */
const LeaderboardCard = forwardRef<HTMLDivElement, LeaderboardCardProps>(
  ({ data }, ref) => {
    const entries = data.entries.slice(0, 10);

    return (
      <div
        ref={ref}
        style={{ width: 600 }}
        className="bg-gradient-to-br from-gray-900 to-gray-950 p-8 rounded-2xl border border-amber-500/30"
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🏆</span>
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">
              {data.eventName}
            </h2>
            <p className="text-gray-400 text-sm">Leaderboard · TrueCall</p>
          </div>
        </div>

        <p className="text-gray-500 text-xs mb-5">
          {data.totalMatches} match{data.totalMatches !== 1 ? "es" : ""}{" "}
          verified
        </p>

        {entries.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">
            No correct predictions yet
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div
                key={e.user}
                className="flex items-center justify-between bg-gray-800/60 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 text-center text-lg font-bold text-amber-400 shrink-0">
                    {MEDALS[i] ?? i + 1}
                  </span>
                  <span className="text-white font-semibold truncate">
                    {e.twitterHandle ? `@${e.twitterHandle}` : shortAddress(e.user)}
                  </span>
                </div>
                <span className="text-amber-400 font-bold text-sm shrink-0">
                  {e.wins} win{e.wins !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-gray-500 text-xs mt-6">
          truecall.vercel.app
        </p>
      </div>
    );
  },
);

LeaderboardCard.displayName = "LeaderboardCard";

export default LeaderboardCard;

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  fetchEvent,
  fetchEventMatches,
  fetchEventLeaderboard,
  fetchHasJoined,
  fetchClaimable,
  fetchWinners,
  joinEvent,
} from "@/lib/api";
import { CONTRACTS, EVENT_MANAGER_ABI } from "@/lib/contracts";
import type {
  TrueCallEvent,
  TrueCallMatch,
  LeaderboardEntry,
} from "@/lib/types";
import { formatDistanceToNow, format } from "date-fns";
import { getTokenSymbol } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params?.id);
  const { isConnected, address, connectWallet } = useWallet();

  const [event, setEvent] = useState<TrueCallEvent | null>(null);
  const [matches, setMatches] = useState<TrueCallMatch[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [claimable, setClaimable] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
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

      if (address) {
        const [joined, claimRes] = await Promise.all([
          fetchHasJoined(eventId, address),
          fetchClaimable(eventId, address),
        ]);
        setHasJoined(joined.joined);
        setClaimable(claimRes.claimable);
      }
    } catch {
      setError("Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [eventId, address]);

  useEffect(() => {
    load();
  }, [load]);

  const handleJoin = async () => {
    if (!event || !address) return;
    try {
      setJoining(true);
      await joinEvent(event.eventId, address);
      // Reload event data after joining
      await load();
    } catch (err) {
      setError(`Failed to join event: ${err}`);
    } finally {
      setJoining(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
      </div>
    );

  if (error || !event)
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl max-w-md text-center">
          <p className="text-red-400 mb-4">{error ?? "Event not found"}</p>
          <button
            onClick={() => router.push("/events")}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg"
          >
            ← Back to Events
          </button>
        </div>
      </div>
    );

  const isOpen = event.status === "OPEN";
  const isResolved = event.status === "RESOLVED";
  const now = Date.now() / 1000;
  const started = now >= event.startDate;
  const canJoin = isOpen && !started && !hasJoined;

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />
      <main className="container mx-auto px-4 max-w-5xl mt-8">
        <button
          onClick={() => router.push("/events")}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back
        </button>

        {/* Event banner */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 lg:p-10 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              {event.eventName}
            </h1>
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-bold border shrink-0 ${
                isOpen
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/30"
              }`}
            >
              {event.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {(() => {
              const tokenSymbol = getTokenSymbol(event.entryToken);
              return [
                {
                  label: "Entry Fee",
                  value: `${event.entryFee} ${tokenSymbol}`,
                },
                {
                  label: "Prize Pool",
                  value: `${event.prizePool} ${tokenSymbol}`,
                  highlight: true,
                },
                { label: "Type", value: event.eventType },
                {
                  label: "Ends",
                  value: formatDistanceToNow(new Date(event.endDate * 1000), {
                    addSuffix: true,
                  }),
                },
              ].map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30"
                >
                  <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">
                    {label}
                  </p>
                  <p
                    className={`font-medium text-lg ${highlight ? "text-orange-400" : "text-white"}`}
                  >
                    {value}
                  </p>
                </div>
              ));
            })()}
          </div>

          {/* CTA */}
          {!isConnected ? (
            <div className="text-center p-6 bg-gray-900/80 rounded-xl border border-gray-700">
              <p className="text-gray-400 mb-4">
                Connect your wallet to join and predict
              </p>
              <button
                onClick={connectWallet}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg"
              >
                Connect Wallet
              </button>
            </div>
          ) : canJoin ? (
            <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-500/30 text-center">
              <h3 className="text-white font-bold text-xl mb-2">
                Join this Event
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Pay {event.entryFee} {getTokenSymbol(event.entryToken)} once —
                predict all matches, earn points
              </p>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition disabled:opacity-50"
              >
                {joining
                  ? "Joining…"
                  : `Join (${event.entryFee} ${getTokenSymbol(event.entryToken)})`}
              </button>
            </div>
          ) : hasJoined && isOpen ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-center font-medium">
              ✅ You have joined — predict on matches below
            </div>
          ) : started && !hasJoined ? (
            <div className="bg-gray-700/40 border border-gray-600/50 rounded-xl p-4 text-gray-400 text-center">
              🔒 Event has started — joining is closed
            </div>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Matches */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Matches</h2>
            {matches.length === 0 ? (
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
                <p className="text-gray-500">No matches added yet</p>
                {isOpen && started && (
                  <p className="text-gray-600 text-sm mt-1">
                    Admin will add matches after the event starts
                  </p>
                )}
              </div>
            ) : (
              matches.map((m) => (
                <div
                  key={m.matchId}
                  onClick={() =>
                    hasJoined &&
                    router.push(`/predictions?matchId=${m.matchId}`)
                  }
                  className={`bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 transition-all ${
                    hasJoined ? "hover:border-orange-500/40 cursor-pointer" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-white font-bold">{m.homeTeam}</span>
                      <span className="text-gray-500 text-sm">vs</span>
                      <span className="text-white font-bold">{m.awayTeam}</span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        m.status === "OPEN"
                          ? "bg-green-500/20 text-green-400"
                          : m.status === "VERIFIED"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>
                      ⏰{" "}
                      {format(new Date(m.kickoffTime * 1000), "MMM d, HH:mm")}
                    </span>
                    <div className="flex gap-2">
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
                  {m.status === "VERIFIED" && (
                    <div className="mt-2 text-center text-white font-bold">
                      {m.finalHomeScore} – {m.finalAwayScore}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/60 border border-orange-500/20 rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-4">
                🏆 Leaderboard
              </h2>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No points yet</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {leaderboard.map((lb, i) => (
                    <li
                      key={lb.user}
                      className={`rounded-xl p-3 flex justify-between items-center border ${
                        address?.toLowerCase() === lb.user.toLowerCase()
                          ? "bg-orange-500/10 border-orange-500/40"
                          : "bg-gray-900/40 border-gray-700/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg w-6 text-center">
                          {MEDALS[i] ?? i + 1}
                        </span>
                        <span className="text-sm font-mono text-gray-200">
                          {lb.user.slice(0, 6)}…{lb.user.slice(-4)}
                        </span>
                        {address?.toLowerCase() === lb.user.toLowerCase() && (
                          <span className="text-[10px] bg-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-sm text-orange-400">
                        {lb.points} pts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

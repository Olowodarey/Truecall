"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";
import {
  fetchEvents,
  fetchHasJoined,
  fetchUserEventRank,
  fetchGlobalPoints,
} from "@/lib/api";
import type { TrueCallEvent } from "@/lib/types";
import { getTokenSymbol } from "@/lib/utils";

interface EventStat {
  event: TrueCallEvent;
  rank: number;
  points: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { isConnected, address, connectWallet } = useWallet();

  const [loading, setLoading] = useState(true);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [globalPts, setGlobalPts] = useState(0);

  useEffect(() => {
    if (isConnected && address) loadProfile(address);
    else setLoading(false);
  }, [isConnected, address]);

  const loadProfile = async (addr: string) => {
    try {
      setLoading(true);
      const [allEvents, gp] = await Promise.all([
        fetchEvents(),
        fetchGlobalPoints(addr).catch(() => ({ points: 0 })),
      ]);
      setGlobalPts(gp.points);

      const stats = await Promise.all(
        allEvents.map(async (ev): Promise<EventStat | null> => {
          const joined = await fetchHasJoined(ev.eventId, addr).catch(() => ({
            joined: false,
          }));
          if (!joined.joined) return null;
          const rank = await fetchUserEventRank(ev.eventId, addr).catch(() => ({
            rank: 0,
            points: 0,
          }));
          return { event: ev, rank: rank.rank, points: rank.points };
        }),
      );

      setEventStats(stats.filter(Boolean) as EventStat[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected)
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-gray-800/50 backdrop-blur-xl p-10 rounded-3xl border border-gray-700 text-center max-w-lg">
            <h1 className="text-3xl font-bold text-white mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-gray-400 mb-8">
              Connect to view your profile and predictions
            </p>
            <button
              onClick={connectWallet}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-xl"
            >
              Connect Wallet
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 max-w-5xl">
        {/* Profile header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 p-1">
              <div className="w-full h-full rounded-xl bg-gray-900 overflow-hidden">
                <img
                  src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/80 rounded-full border border-gray-700 text-gray-400 text-sm font-mono">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {address?.slice(0, 8)}…{address?.slice(-4)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 flex flex-col items-center text-center">
              <span className="text-2xl mb-1">🏆</span>
              <span className="text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                {loading ? "—" : globalPts}
              </span>
              <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                Global Points
              </span>
            </div>
            <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 flex flex-col items-center text-center">
              <span className="text-2xl mb-1">📅</span>
              <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                {loading ? "—" : eventStats.length}
              </span>
              <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                Events Joined
              </span>
            </div>
          </div>
        </div>

        {/* Joined events */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Joined Events</h2>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
            </div>
          ) : eventStats.length === 0 ? (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">
                You haven't joined any events yet
              </p>
              <a
                href="/events"
                className="text-orange-500 hover:text-orange-400 font-semibold"
              >
                Explore events →
              </a>
            </div>
          ) : (
            <div className="grid gap-4">
              {eventStats.map(({ event, rank, points }) => (
                <div
                  key={event.eventId}
                  onClick={() => router.push(`/events/${event.eventId}`)}
                  className="bg-gray-800/40 border border-gray-700/50 hover:border-orange-500/40 rounded-2xl p-5 cursor-pointer transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-bold text-lg">
                          {event.eventName}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            event.status === "OPEN"
                              ? "bg-green-500/10 text-green-400 border-green-500/30"
                              : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs">
                        {event.prizePool} {getTokenSymbol(event.entryToken)}{" "}
                        prize pool
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-center bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2">
                        <span className="text-orange-400 font-bold text-lg">
                          {points}
                        </span>
                        <span className="text-gray-500 text-[10px] uppercase">
                          pts
                        </span>
                      </div>
                      <div className="flex flex-col items-center bg-gray-700/30 border border-gray-600/30 rounded-xl px-4 py-2">
                        <span className="text-white font-bold text-lg">
                          {rank > 0 ? (medals[rank - 1] ?? `#${rank}`) : "—"}
                        </span>
                        <span className="text-gray-500 text-[10px] uppercase">
                          rank
                        </span>
                      </div>
                      <span className="text-gray-600 text-xl">›</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

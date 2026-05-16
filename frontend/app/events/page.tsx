"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fetchEvents } from "@/lib/api";
import type { TrueCallEvent, EventFilter } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { getTokenSymbol } from "@/lib/utils";

function statusColor(status: string) {
  if (status === "OPEN")
    return "bg-green-500/20 text-green-400 border-green-500/50";
  if (status === "RESOLVED")
    return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  return "bg-gray-500/20 text-gray-400 border-gray-500/50";
}

export default function EventsPage() {
  const router = useRouter();
  const { address } = useWallet();
  const [events, setEvents] = useState<TrueCallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventFilter>("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setEvents(await fetchEvents());
    } catch {
      setError("Failed to load events. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const filtered = events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "open") return e.status === "OPEN";
    if (filter === "resolved") return e.status === "RESOLVED";
    if (filter === "cancelled") return e.status === "CANCELLED";
    return true;
  });

  const filters: { key: EventFilter; label: string }[] = [
    { key: "all", label: "All Events" },
    { key: "open", label: "Open" },
    { key: "resolved", label: "Resolved" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-3">
              Prediction Events
            </h1>
            <p className="text-gray-300 text-lg">
              Join an event, predict match scores and outcomes, earn points
            </p>
            <p className="text-xs text-orange-400/70 mt-2">
              Live data from Celo Sepolia · powered by TrueCall backend
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                  filter === key
                    ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
              <p className="text-gray-400 mt-4">Loading from backend…</p>
            </div>
          )}

          {error && (
            <div className="max-w-md mx-auto bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={load}
                className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No events found</p>
              <p className="text-gray-500 text-sm mt-2">
                {filter !== "all"
                  ? "Try a different filter"
                  : "Admin can create the first event"}
              </p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((ev) => {
                const tokenSymbol = getTokenSymbol(ev.entryToken);
                return (
                  <div
                    key={ev.eventId}
                    onClick={() => router.push(`/events/${ev.eventId}`)}
                    className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold text-white truncate flex-1 pr-2">
                          {ev.eventName}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${statusColor(ev.status)}`}
                        >
                          {ev.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                        <div className="bg-gray-700/30 rounded-lg p-3">
                          <p className="text-gray-400 text-xs mb-1">
                            Entry Fee
                          </p>
                          <p className="text-white font-semibold">
                            {ev.entryFee} {tokenSymbol}
                          </p>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-3">
                          <p className="text-gray-400 text-xs mb-1">
                            Prize Pool
                          </p>
                          <p className="text-orange-400 font-semibold">
                            {ev.prizePool} {tokenSymbol}
                          </p>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-3">
                          <p className="text-gray-400 text-xs mb-1">Type</p>
                          <p className="text-white font-semibold">
                            {ev.eventType}
                          </p>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-3">
                          <p className="text-gray-400 text-xs mb-1">Ends</p>
                          <p className="text-white font-semibold text-xs">
                            {formatDistanceToNow(new Date(ev.endDate * 1000), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300">
                      View Event →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

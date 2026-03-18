"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllPrivateEvents, isEventMember } from "@/lib/private-stacks";
import { deriveStatusLabel } from "@/lib/private-event-utils";
import type { ChainPrivateEvent } from "@/lib/types";
import PrivateEventCard from "@/components/PrivateEventCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useWallet } from "@/contexts/WalletContext";

type StatusFilter = "all" | "Active" | "Pending" | "Ended";

const HIRO_API = "https://api.testnet.hiro.so";

export default function PrivateEventsPage() {
  const router = useRouter();
  const { stxAddress: userAddress, isConnected } = useWallet();

  const [events, setEvents] = useState<ChainPrivateEvent[]>([]);
  const [membershipMap, setMembershipMap] = useState<Record<number, boolean>>(
    {},
  );
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [data, blockInfo] = await Promise.all([
        getAllPrivateEvents(),
        fetch(`${HIRO_API}/v2/info`)
          .then((r) => r.json())
          .catch(() => ({ burn_block_height: 0 })),
      ]);

      setEvents(data);
      setCurrentBlock(blockInfo.burn_block_height ?? 0);

      // Build membership map only when wallet is connected
      if (isConnected && userAddress) {
        const entries = await Promise.all(
          data.map(async (event) => {
            const isMember = await isEventMember(event.id, userAddress).catch(
              () => false,
            );
            return [event.id, isMember] as [number, boolean];
          }),
        );
        setMembershipMap(Object.fromEntries(entries));
      } else {
        setMembershipMap({});
      }
    } catch (err) {
      console.error("Failed to load private events:", err);
      setError("Failed to load private events. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isConnected, userAddress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEvents = events.filter((e) => {
    if (filter === "all") return true;
    return deriveStatusLabel(e.isActive, e.ended) === filter;
  });

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "Active", label: "Active" },
    { key: "Pending", label: "Pending" },
    { key: "Ended", label: "Ended" },
  ];

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-12">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">
                Private Events
              </h1>
              <p className="text-gray-400 text-sm">
                Invite-only prediction events on Stacks testnet
              </p>
            </div>
            <Link
              href="/private-events/create"
              className="px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 transition-all shrink-0"
            >
              + Create Private Event
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {filterButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                  filter === key
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
              <p className="text-gray-400 mt-4">Loading private events…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="max-w-md mx-auto bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadData}
                className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filteredEvents.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                {filter !== "all"
                  ? `No ${filter.toLowerCase()} events found`
                  : "No private events yet"}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {filter !== "all"
                  ? "Try a different filter"
                  : "Be the first to create one!"}
              </p>
            </div>
          )}

          {/* Event Grid */}
          {!loading && !error && filteredEvents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <PrivateEventCard
                  key={event.id}
                  event={event}
                  isCreator={userAddress === event.creator}
                  isJoined={membershipMap[event.id] ?? false}
                  onClick={() => router.push(`/private-events/${event.id}`)}
                />
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

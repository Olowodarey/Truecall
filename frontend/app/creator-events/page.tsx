"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { isAdminAddress } from "@/lib/utils";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fetchCreatorEvents, type CreatorEvent } from "@/lib/creator-api";
import { formatDistanceToNow } from "date-fns";

// Extended event type with creator Twitter info
interface EventWithCreator extends CreatorEvent {
  creatorTwitter?: string | null;
  creatorAvatar?: string | null;
}

export default function CreatorEventsPage() {
  const router = useRouter();
  const { isConnected, address, connectWallet } = useWallet();
  const [events, setEvents] = useState<EventWithCreator[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithCreator[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const fetchedEvents = await fetchCreatorEvents();

        // Enrich with creator Twitter data
        const enriched = await Promise.all(
          fetchedEvents.map(async (ev) => {
            try {
              const response = await fetch(`/api/users/profile/${ev.creator}`);
              if (response.ok) {
                const profile = await response.json();
                return {
                  ...ev,
                  creatorTwitter: profile.twitterHandle || null,
                  creatorAvatar: profile.twitterAvatar || null,
                };
              }
            } catch {
              // Silently fail - just won't have Twitter data
            }
            return { ...ev, creatorTwitter: null, creatorAvatar: null };
          }),
        );

        setEvents(enriched);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Filter events based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show last 5 OPEN events when no search query (filter out completed)
      const openEvents = events.filter((ev) => ev.status === "OPEN");
      const last5Open = openEvents
        .sort((a, b) => b.eventId - a.eventId)
        .slice(0, 5);
      setFilteredEvents(last5Open);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = events.filter((ev) => {
      const matchesName = ev.eventName.toLowerCase().includes(query);
      const matchesTwitter = ev.creatorTwitter?.toLowerCase().includes(query);
      return matchesName || matchesTwitter;
    });
    setFilteredEvents(filtered);
  }, [searchQuery, events]);

  useEffect(() => {
    if (address) {
      const checkVerification = () => {
        fetch(`/api/users/twitter/verify-status/${address}`)
          .then((r) => r.json())
          .then((data) => {
            setIsVerified(data.verified ?? false);
            setTwitterHandle(data.twitterHandle);
          })
          .catch(() => {
            setIsVerified(false);
            setTwitterHandle(null);
          });
      };

      // Check initially
      checkVerification();

      // Re-check when page becomes visible (user comes back from profile)
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          checkVerification();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      };
    }
  }, [address]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />
      <main className="flex-1 container mx-auto px-4 max-w-4xl mt-28 mb-20">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Creator Events</h1>
            <p className="text-gray-400 text-sm mt-1">
              Invite-code prediction events · Free to join · Winners on-chain
            </p>
            {isConnected && (
              <div className="mt-2">
                {isVerified && twitterHandle ? (
                  <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-lg">
                    <span className="text-blue-400 text-sm">
                      🐦 @{twitterHandle}
                    </span>
                    <span className="text-green-400 text-xs font-semibold">
                      ✓ Verified
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => router.push("/profile")}
                    className="inline-flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 px-3 py-1.5 rounded-lg text-yellow-400 text-sm transition"
                  >
                    <span>⚠️</span>
                    <span>Verify Twitter to Join Events</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isAdminAddress(address) && (
              <button
                onClick={() => router.push("/creator-events/admin")}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-2 px-4 rounded-lg transition text-sm"
              >
                ⚙️ Admin
              </button>
            )}
            {isConnected ? (
              <button
                onClick={() => router.push("/creator-events/create")}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-2.5 px-5 rounded-lg transition text-sm"
              >
                + Create Event
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 px-5 rounded-lg transition text-sm"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event name or creator's Twitter username..."
              className="w-full px-4 py-3 pl-11 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {!searchQuery && events.length > 5 && (
            <p className="text-gray-500 text-xs mt-2">
              Showing last 5 active events. Use search to find completed or
              specific events.
            </p>
          )}
          {searchQuery && (
            <p className="text-gray-400 text-xs mt-2">
              Found {filteredEvents.length} event
              {filteredEvents.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-400">
            {error}
          </div>
        ) : filteredEvents.length === 0 && searchQuery ? (
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-white mb-2">
              No events found
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Try searching with a different name or creator
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 px-6 rounded-lg transition"
            >
              Clear Search
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-xl font-bold text-white mb-2">No events yet</h2>
            <p className="text-gray-400 text-sm mb-6">
              Be the first to create a prediction event
            </p>
            {isConnected ? (
              <button
                onClick={() => router.push("/creator-events/create")}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg transition"
              >
                Create First Event
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg transition"
              >
                Connect Wallet to Start
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredEvents.map((ev) => (
              <div
                key={ev.eventId}
                onClick={() => router.push(`/creator-events/${ev.eventId}`)}
                className="bg-gray-800/40 border border-gray-700/50 hover:border-orange-500/40 rounded-2xl p-6 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          ev.status === "OPEN"
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : (ev.status as string) === "COMPLETED"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : (ev.status as string) === "CANCELLED"
                                ? "bg-red-500/10 text-red-400 border-red-500/30"
                                : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {ev.status}
                      </span>
                      <span className="text-gray-500 text-xs">
                        #{ev.eventId}
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-lg group-hover:text-orange-400 transition truncate">
                      {ev.eventName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {ev.creatorAvatar && (
                        <img
                          src={ev.creatorAvatar}
                          alt="Creator"
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      {ev.creatorTwitter ? (
                        <p className="text-blue-400 text-xs flex items-center gap-1">
                          by @{ev.creatorTwitter}
                          <span className="text-green-500 text-[10px]">✓</span>
                        </p>
                      ) : (
                        <p className="text-gray-500 text-xs font-mono">
                          by {ev.creator.slice(0, 6)}…{ev.creator.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-gray-400 text-xs">
                      {formatDistanceToNow(new Date(ev.createdAt * 1000), {
                        addSuffix: true,
                      })}
                    </p>
                    <p className="text-orange-400 text-sm font-bold mt-1 group-hover:translate-x-1 transition-transform">
                      View →
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

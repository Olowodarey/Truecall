"use client";

import { useState, useEffect } from "react";
import { getAllEvents, getMarketsForEvent } from "@/lib/stacks";
import type { ChainEvent, EventFilter, ChainMarket } from "@/lib/types";
import EventCard from "@/components/EventCard";
import PredictionModal from "@/components/PredictionModal";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useWallet } from "@/contexts/WalletContext";
import { HIRO_API } from "@/lib/contracts";

export default function EventsPage() {
  const { userAddress } = useWallet();
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [markets, setMarkets] = useState<Record<number, ChainMarket[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChainEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [currentBlock, setCurrentBlock] = useState<number>(0);

  useEffect(() => {
    loadEvents();
    // Fetch current block height for dispute window calculations
    fetch(`${HIRO_API}/v2/info`)
      .then((r) => r.json())
      .then((info) => setCurrentBlock(info.stacks_tip_height ?? 0))
      .catch(console.error);
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllEvents();
      setEvents(data);

      // Fetch markets for all events
      const marketsData: Record<number, ChainMarket[]> = {};
      await Promise.all(
        data.map(async (event) => {
          const eventMarkets = await getMarketsForEvent(event.id);
          marketsData[event.id] = eventMarkets;
        }),
      );
      setMarkets(marketsData);
    } catch (err) {
      console.error("Failed to load events:", err);
      setError("Failed to load on-chain events. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = (event: ChainEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const filteredEvents = events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "open") return e.isActive;
    if (filter === "closed")
      return !e.isActive && e.finalizedMarketCount < e.marketCount;
    if (filter === "settled")
      return !e.isActive && e.finalizedMarketCount === e.marketCount;
    return true;
  });

  const filterButtons: { key: EventFilter; label: string }[] = [
    { key: "all", label: "All Events" },
    { key: "open", label: "Open" },
    { key: "closed", label: "Closed" },
    { key: "settled", label: "Settled" },
  ];

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background */}
      <div className="absolute inset-0 w-full h-full z-0 opacity-10">
        <svg
          className="w-full h-full"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M100,200 Q300,100 500,200 T900,200"
            stroke="url(#g)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M200,500 Q400,350 700,500 T1000,450"
            stroke="url(#g)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M0,750 Q250,600 500,750 T1000,700"
            stroke="url(#g)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-12">
          {/* Page Header */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-3">
              Prediction Events
            </h1>
            <p className="text-gray-300 text-lg">
              Predict outcomes on BTC price markets · Win from the prize pool
            </p>
            <p className="text-xs text-orange-400/70 mt-2">
              Live data from Stacks testnet
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {filterButtons.map(({ key, label }) => (
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

          {/* States */}
          {loading && (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
              <p className="text-gray-400 mt-4">Reading from blockchain…</p>
            </div>
          )}

          {error && (
            <div className="max-w-md mx-auto bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadEvents}
                className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Retry
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            (filteredEvents.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">
                  No events found on-chain yet
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {filter !== "all"
                    ? "Try a different filter"
                    : "Admin can create the first event"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    markets={markets[event.id] || []}
                    currentBlock={currentBlock}
                    userAddress={userAddress}
                    onJoinEvent={handleJoinEvent}
                    onRefresh={loadEvents}
                  />
                ))}
              </div>
            ))}
        </main>
        <Footer />
      </div>

      <PredictionModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}

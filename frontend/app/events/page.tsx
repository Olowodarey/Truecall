"use client";

import { useState, useEffect } from "react";
import { fetchEvents } from "@/lib/api";
import { Event } from "@/lib/types";
import EventCard from "@/components/EventCard";
import PredictionModal from "@/components/PredictionModal";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "settled">(
    "all",
  );

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
      setError("Failed to load events. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true;
    return event.status === filter;
  });

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 w-full h-full z-0">
        <svg
          className="w-full h-full opacity-15"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient
              id="globalLineGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M100,200 Q300,100 500,200 T900,200"
            stroke="url(#globalLineGradient)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M200,400 Q400,300 600,400 T1000,400"
            stroke="url(#globalLineGradient)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M50,600 Q250,500 450,600 T850,600"
            stroke="url(#globalLineGradient)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M150,800 Q350,700 550,800 T950,800"
            stroke="url(#globalLineGradient)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 py-12">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Prediction Events
            </h1>
            <p className="text-xl text-gray-300">
              Join events and make your predictions on upcoming matches
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilter("open")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === "open"
                  ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setFilter("closed")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === "closed"
                  ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Closed
            </button>
            <button
              onClick={() => setFilter("settled")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === "settled"
                  ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Settled
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
              <p className="text-gray-400 mt-4">Loading events...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="max-w-md mx-auto bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadEvents}
                className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Events Grid */}
          {!loading && !error && (
            <>
              {filteredEvents.length === 0 ? (
                <div className="text-center py-20">
                  <svg
                    className="w-24 h-24 mx-auto text-gray-600 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-gray-400 text-lg">No events found</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {filter !== "all"
                      ? "Try changing the filter"
                      : "Check back later for new events"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onJoinEvent={handleJoinEvent}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        <Footer />
      </div>

      {/* Prediction Modal */}
      <PredictionModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

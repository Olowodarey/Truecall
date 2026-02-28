"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { fetchEvents } from "@/lib/api";
import { Event } from "@/lib/types";
import EventCard from "@/components/EventCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";

export default function PredictionsPage() {
  const { isConnected, userAddress } = useWallet();
  const [predictions, setPredictions] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && userAddress) {
      loadPredictions();
    } else {
      setLoading(false);
    }
  }, [isConnected, userAddress]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const allEvents = await fetchEvents();
      // Mocking predictions by taking first 4 events
      setPredictions(allEvents.slice(0, 4));
    } catch (error) {
      console.error("Error loading predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-gray-800/50 backdrop-blur-xl p-10 rounded-3xl border border-gray-700 shadow-2xl text-center max-w-lg">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
              <svg
                className="w-10 h-10 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Please connect your Stacks wallet to view your active and past
              predictions.
            </p>
            <button
              onClick={() =>
                (window as any).StacksProvider?.authenticationRequest()
              }
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              Connect Wallet
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />

      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              My Predictions
            </h1>
            <p className="text-gray-400">
              Track and manage your match predictions.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
            <div className="flex flex-col items-center px-4 border-r border-gray-700">
              <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                {predictions.length}
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase mt-1">
                Total
              </span>
            </div>
            <div className="flex flex-col items-center px-4 border-r border-gray-700">
              <span className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                2
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase mt-1">
                Won
              </span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="text-2xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                85%
              </span>
              <span className="text-xs text-gray-500 font-medium uppercase mt-1">
                Win Rate
              </span>
            </div>
          </div>
        </div>

        <section>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : predictions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {predictions.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onJoinEvent={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">
                You have not made any predictions yet.
              </p>
              <a
                href="/events"
                className="text-blue-500 hover:text-blue-400 font-semibold transition-colors"
              >
                Explore upcoming matches &rarr;
              </a>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

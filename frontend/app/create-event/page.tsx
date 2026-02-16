"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUpcomingMatches, createEvent, syncMatches } from "@/lib/api";
import { Match } from "@/lib/types";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CreateEventPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [eventName, setEventName] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [accessCode, setAccessCode] = useState("");

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUpcomingMatches();
      setMatches(data);
    } catch (err) {
      console.error("Failed to load matches:", err);
      setError("Failed to load matches. Try syncing matches first.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMatches = async () => {
    try {
      setSyncing(true);
      setError(null);
      await syncMatches();
      await loadMatches();
    } catch (err) {
      console.error("Failed to sync matches:", err);
      setError("Failed to sync matches. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const generateAccessCode = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setAccessCode(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName || !selectedMatchId || !accessCode) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const result = await createEvent(eventName, selectedMatchId, accessCode);

      setSuccess(true);

      // Redirect to events page after 2 seconds
      setTimeout(() => {
        router.push("/events");
      }, 2000);
    } catch (err) {
      console.error("Failed to create event:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

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
              Create Prediction Event
            </h1>
            <p className="text-xl text-gray-300">
              Set up a new event for users to make predictions
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* Sync Matches Button */}
            <div className="mb-8 flex justify-between items-center">
              <p className="text-gray-400 text-sm">
                {matches.length} upcoming matches available
              </p>
              <button
                onClick={handleSyncMatches}
                disabled={syncing}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Sync Matches
                  </>
                )}
              </button>
            </div>

            {/* Create Event Form */}
            <form
              onSubmit={handleSubmit}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700"
            >
              {/* Event Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  disabled={creating}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                  placeholder="e.g., Premier League Weekend Predictions"
                />
              </div>

              {/* Match Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Match *
                </label>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-8 bg-gray-700/30 rounded-lg border border-gray-600">
                    <p className="text-gray-400 mb-4">No matches available</p>
                    <button
                      type="button"
                      onClick={handleSyncMatches}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      Sync Matches
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedMatchId || ""}
                    onChange={(e) => setSelectedMatchId(Number(e.target.value))}
                    disabled={creating}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Choose a match...</option>
                    {matches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.homeTeam} vs {match.awayTeam} -{" "}
                        {format(new Date(match.matchTime * 1000), "PPP")}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected Match Preview */}
              {selectedMatch && (
                <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Selected Match
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center">
                      <p className="text-lg font-semibold text-white">
                        {selectedMatch.homeTeam}
                      </p>
                    </div>
                    <div className="px-4 text-gray-400 font-bold">VS</div>
                    <div className="flex-1 text-center">
                      <p className="text-lg font-semibold text-white">
                        {selectedMatch.awayTeam}
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-400 mt-2">
                    {format(new Date(selectedMatch.matchTime * 1000), "PPP p")}
                  </p>
                </div>
              )}

              {/* Access Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Access Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) =>
                      setAccessCode(e.target.value.toUpperCase())
                    }
                    disabled={creating}
                    className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                    placeholder="Enter or generate access code"
                    maxLength={12}
                  />
                  <button
                    type="button"
                    onClick={generateAccessCode}
                    disabled={creating}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Users will need this code to join the event
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mb-6 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                  Event created successfully! Redirecting to events page...
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  creating || !eventName || !selectedMatchId || !accessCode
                }
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {creating ? "Creating Event..." : "Create Event"}
              </button>
            </form>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

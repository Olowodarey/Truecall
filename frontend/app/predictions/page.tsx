"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";
import { fetchMatch, fetchPrediction } from "@/lib/api";
import { CONTRACTS, EVENT_MANAGER_ABI, OUTCOME_MAP } from "@/lib/contracts";
import type { TrueCallMatch, TrueCallPrediction } from "@/lib/types";
import { format } from "date-fns";

function PredictionsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const matchId = Number(params.get("matchId") ?? 0);
  const { isConnected, address, connectWallet } = useWallet();

  const [match, setMatch] = useState<TrueCallMatch | null>(null);
  const [prediction, setPrediction] = useState<TrueCallPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  // Score prediction form
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  // Outcome prediction
  const [outcome, setOutcome] = useState<0 | 1 | 2 | null>(null);

  const { writeContract: submitScore, data: scoreTx } = useWriteContract();
  const { writeContract: submitOutcome, data: outcomeTx } = useWriteContract();

  const { isLoading: scorePending, isSuccess: scoreDone } =
    useWaitForTransactionReceipt({ hash: scoreTx });
  const { isLoading: outcomePending, isSuccess: outcomeDone } =
    useWaitForTransactionReceipt({ hash: outcomeTx });

  useEffect(() => {
    if (!matchId) return;
    load();
  }, [matchId, address]);

  useEffect(() => {
    if (scoreDone || outcomeDone) load();
  }, [scoreDone, outcomeDone]);

  const load = async () => {
    try {
      setLoading(true);
      const m = await fetchMatch(matchId);
      setMatch(m);
      if (address) {
        const p = await fetchPrediction(matchId, address).catch(() => null);
        setPrediction(p);
      }
    } catch {
      setMatch(null);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeScore || !awayScore) return;
    submitScore({
      address: CONTRACTS.EVENT_MANAGER,
      abi: EVENT_MANAGER_ABI,
      functionName: "submitScorePrediction",
      args: [BigInt(matchId), Number(homeScore), Number(awayScore)],
    });
  };

  const handleOutcomeSubmit = () => {
    if (outcome === null) return;
    submitOutcome({
      address: CONTRACTS.EVENT_MANAGER,
      abi: EVENT_MANAGER_ABI,
      functionName: "submitOutcomePrediction",
      args: [BigInt(matchId), outcome],
    });
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
            <p className="text-gray-400 mb-8">Connect to submit predictions</p>
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

  if (!matchId)
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-4">No match selected</p>
            <button
              onClick={() => router.push("/events")}
              className="text-orange-500 hover:text-orange-400"
            >
              Browse Events →
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );

  if (loading)
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex items-center justify-center min-h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
        </main>
        <Footer />
      </div>
    );

  if (!match)
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex items-center justify-center min-h-[70vh]">
          <p className="text-red-400">Match not found</p>
        </main>
        <Footer />
      </div>
    );

  const isOpen = match.status === "OPEN";
  const deadline = new Date(match.predictionDeadline * 1000);
  const isPast = Date.now() > match.predictionDeadline * 1000;

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 max-w-2xl">
        <button
          onClick={() => router.push(`/events/${match.eventId}`)}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back to Event
        </button>

        {/* Match header */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 mb-6 text-center">
          <div className="flex items-center justify-center gap-6 mb-4">
            <span className="text-2xl font-bold text-white">
              {match.homeTeam}
            </span>
            <span className="text-gray-500 text-xl font-bold">vs</span>
            <span className="text-2xl font-bold text-white">
              {match.awayTeam}
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Kickoff:{" "}
            {format(new Date(match.kickoffTime * 1000), "MMM d, yyyy HH:mm")}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Prediction deadline: {format(deadline, "MMM d, HH:mm")}
          </p>
          {match.status === "VERIFIED" && (
            <div className="mt-4 text-3xl font-black text-white">
              {match.finalHomeScore} – {match.finalAwayScore}
            </div>
          )}
        </div>

        {isPast || !isOpen ? (
          <div className="bg-gray-700/40 border border-gray-600/50 rounded-xl p-6 text-center text-gray-400">
            {match.status === "VERIFIED"
              ? "✅ Match verified — results are final"
              : "⏰ Prediction deadline has passed"}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score prediction */}
            {match.allowScorePrediction && (
              <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-lg">
                    Exact Score Prediction
                  </h2>
                  <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm font-bold">
                    5 pts
                  </span>
                </div>
                {prediction?.hasScorePrediction ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-center">
                    ✅ Predicted: {prediction.homeScore} –{" "}
                    {prediction.awayScore}
                    {prediction.scorePointsEarned > 0 && (
                      <span className="ml-2 font-bold">
                        +{prediction.scorePointsEarned} pts
                      </span>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={handleScoreSubmit}
                    className="flex items-center gap-4"
                  >
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={homeScore}
                      onChange={(e) => setHomeScore(e.target.value)}
                      placeholder="0"
                      className="w-20 text-center bg-gray-900/60 border border-gray-600 rounded-lg px-3 py-3 text-white text-xl font-bold focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-gray-500 text-xl font-bold">–</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={awayScore}
                      onChange={(e) => setAwayScore(e.target.value)}
                      placeholder="0"
                      className="w-20 text-center bg-gray-900/60 border border-gray-600 rounded-lg px-3 py-3 text-white text-xl font-bold focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="submit"
                      disabled={scorePending || !homeScore || !awayScore}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50"
                    >
                      {scorePending ? "Submitting…" : "Submit Score"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Outcome prediction */}
            {match.allowOutcomePrediction && (
              <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-lg">
                    Outcome Prediction
                  </h2>
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-bold">
                    3 pts
                  </span>
                </div>
                {prediction?.hasOutcomePrediction ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-center">
                    ✅ Predicted: {prediction.outcome}
                    {prediction.outcomePointsEarned > 0 && (
                      <span className="ml-2 font-bold">
                        +{prediction.outcomePointsEarned} pts
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {(
                        [
                          { label: `${match.homeTeam} Win`, value: 0 as const },
                          { label: "Draw", value: 1 as const },
                          { label: `${match.awayTeam} Win`, value: 2 as const },
                        ] as const
                      ).map(({ label, value }) => (
                        <button
                          key={value}
                          onClick={() => setOutcome(value)}
                          className={`py-3 px-4 rounded-lg font-semibold text-sm transition border ${
                            outcome === value
                              ? "bg-blue-500/20 border-blue-500 text-blue-300"
                              : "bg-gray-900/60 border-gray-600 text-gray-300 hover:border-blue-500/50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleOutcomeSubmit}
                      disabled={outcomePending || outcome === null}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                    >
                      {outcomePending ? "Submitting…" : "Submit Outcome"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function PredictionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
        </div>
      }
    >
      <PredictionsContent />
    </Suspense>
  );
}

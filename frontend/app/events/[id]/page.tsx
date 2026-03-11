"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { openContractCall } from "@stacks/connect";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HIRO_API } from "@/lib/contracts";

import { formatEstimatedTime } from "@/lib/utils";

import {
  getEvent,
  getQuestionsForEvent,
  getLeaderboard,
  joinEventTxOptions,
  answerQuestionTxOptions,
  getParticipant,
} from "@/lib/stacks";

import type {
  ChainEvent,
  ChainQuestion,
  LeaderboardEntry,
  ChainParticipant,
} from "@/lib/types";

export default function EventPredictionPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected, connectWallet, userAddress } = useWallet();

  const eventId = Number(params?.id);

  const [event, setEvent] = useState<ChainEvent | null>(null);
  const [questions, setQuestions] = useState<ChainQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [participant, setParticipant] = useState<ChainParticipant | null>(null);
  const [currentBlock, setCurrentBlock] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Joining state
  const [joining, setJoining] = useState(false);

  // Prediction state
  const [selectedQuestion, setSelectedQuestion] = useState<ChainQuestion | null>(null);
  const [prediction, setPrediction] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [predictSuccess, setPredictSuccess] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  const fetchData = async () => {
    if (isNaN(eventId)) return;

    try {
      const [ev, infoRes] = await Promise.all([
        getEvent(eventId),
        fetch(`${HIRO_API}/v2/info`),
      ]);
      const info = await infoRes.json();
      setCurrentBlock(info.burn_block_height ?? 0);

      if (!ev) {
        setError("Event not found");
        return;
      }
      setEvent(ev);

      const [qs, lb] = await Promise.all([
        getQuestionsForEvent(eventId),
        getLeaderboard(eventId),
      ]);
      setQuestions(qs);
      setLeaderboard(lb);

      if (userAddress) {
        const p = await getParticipant(eventId, userAddress);
        setParticipant(p);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load event data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, userAddress]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4" />
        <p className="text-gray-400">Loading Event Data...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl max-w-md w-full text-center">
          <p className="text-red-400 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push("/events")}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
          >
            ← Back to Events
          </button>
        </div>
      </div>
    );
  }

  const feeLabel = `${(event.entryFee / 1_000_000).toFixed(2)} STX`;
  const poolStx = (event.totalPool / 1_000_000).toFixed(2);
  const isJoined = !!participant?.joined;

  const handleJoin = async () => {
    if (!userAddress) return;
    setJoining(true);
    await openContractCall({
      ...joinEventTxOptions(event.id),
      onFinish: () => {
        setJoining(false);
        fetchData();
      },
      onCancel: () => setJoining(false),
    });
  };

  const handlePredict = async () => {
    if (!selectedQuestion || prediction === null) return;
    setSubmitting(true);
    setPredictError(null);
    try {
      await openContractCall({
        ...answerQuestionTxOptions(selectedQuestion.id, prediction),
        onFinish: () => {
          setPredictSuccess(true);
          setTimeout(() => {
            setPredictSuccess(false);
            setSelectedQuestion(null);
            setPrediction(null);
            setSubmitting(false);
            fetchData();
          }, 3000);
        },
        onCancel: () => setSubmitting(false),
      });
    } catch (err: any) {
      setPredictError(err?.message || "Prediction failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />

      <main className="container mx-auto px-4 max-w-5xl mt-8">
        {/* Back navigation */}
        <button
          onClick={() => router.push("/events")}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition"
        >
          <span>←</span> Back
        </button>

        {/* Hero Event Banner */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 lg:p-10 mb-8 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
              {event.title}
            </h1>
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
                event.isActive
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/30"
              }`}
            >
              {event.isActive ? "🟢 EVENT ACTIVE" : "⚪ EVENT CLOSED"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">
                Entry Fee
              </p>
              <p className="text-white font-medium text-lg">{feeLabel}</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">
                Prize Pool
              </p>
              <p className="text-orange-400 font-bold text-lg">{poolStx} STX</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">
                Participants
              </p>
              <p className="text-white font-medium text-lg">
                {event.participantCount}
              </p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">
                Ends At
              </p>
              <p className="text-white font-medium text-lg">
                {formatEstimatedTime(event.endBlock, currentBlock)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Block #{event.endBlock}
              </p>
            </div>
          </div>

          {!isConnected ? (
            <div className="text-center p-6 bg-gray-900/80 rounded-xl border border-gray-700">
              <p className="text-gray-400 mb-4">
                Connect your wallet to join and make predictions.
              </p>
              <button
                onClick={connectWallet}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg transition"
              >
                Connect Wallet
              </button>
            </div>
          ) : event.isActive && !isJoined ? (
            <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-500/30 text-center">
              <h3 className="text-white font-bold text-xl mb-2">
                Join Event to Forecast
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Pay the entry fee of {feeLabel} to enter the event. You can then
                forecast on all questions for free and earn points!
              </p>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition disabled:opacity-50"
              >
                {joining ? "Waiting for wallet..." : `Join Event (${feeLabel})`}
              </button>
            </div>
          ) : isJoined ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-center font-medium flex items-center justify-center gap-2">
              <span>✅</span> You have joined this event! Choose a question below
              to forecast.
            </div>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Questions Column */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-white mb-2">Questions</h2>
            {questions.length === 0 ? (
              <p className="text-gray-500 italic p-4 bg-gray-800/30 rounded-xl text-center">
                No questions available for this event yet.
              </p>
            ) : (
              <div className="grid gap-4">
                {questions.map((q) => {
                  const blocksLeft = Math.max(0, q.closeBlock - currentBlock);
                  const activeClass =
                    selectedQuestion?.id === q.id
                      ? "border-orange-500 ring-2 ring-orange-500/30"
                      : "border-gray-700/50 hover:border-gray-600";

                  return (
                    <div
                      key={q.id}
                      className={`bg-gray-800/50 backdrop-blur-sm p-5 rounded-2xl border transition-all ${activeClass} ${
                        q.status === "open" ? "cursor-pointer" : "opacity-80"
                      }`}
                      onClick={() => {
                        if (q.status === "open" && isJoined) {
                          setSelectedQuestion(q);
                          setPrediction(null);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <h3 className="text-lg font-medium text-white leading-tight">
                          {q.question}
                        </h3>
                        <span
                          className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            q.status === "open"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {q.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-4">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Target: ${q.targetPrice.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Closes {formatEstimatedTime(q.closeBlock, currentBlock)}
                        </span>
                      </div>

                      {/* Prediction Expansion */}
                      {selectedQuestion?.id === q.id && q.status === "open" && (
                        <div className="mt-6 pt-5 border-t border-gray-700/50">
                          <p className="text-sm text-gray-300 font-medium mb-3 text-center">
                            Your Forecast
                          </p>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrediction(true);
                              }}
                              className={`py-3 rounded-lg border-2 font-bold transition ${
                                prediction === true
                                  ? "border-green-500 bg-green-500/20 text-green-400"
                                  : "border-gray-600/50 bg-gray-800 hover:bg-gray-750 text-gray-300"
                              }`}
                            >
                              ✅ YES
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrediction(false);
                              }}
                              className={`py-3 rounded-lg border-2 font-bold transition ${
                                prediction === false
                                  ? "border-red-500 bg-red-500/20 text-red-400"
                                  : "border-gray-600/50 bg-gray-800 hover:bg-gray-750 text-gray-300"
                              }`}
                            >
                              ❌ NO
                            </button>
                          </div>

                          {predictError && (
                            <p className="text-red-400 text-xs text-center mb-3">
                              {predictError}
                            </p>
                          )}
                          {predictSuccess && (
                            <p className="text-green-400 text-xs text-center mb-3 font-medium">
                              Forecast successful!
                            </p>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePredict();
                            }}
                            disabled={prediction === null || submitting}
                            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting
                              ? "Waiting for wallet..."
                              : "Submit Forecast"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leaderboard Column */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/60 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-1 flex justify-between items-center">
                <span>Leaderboard</span>
                <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded">
                  Top 5
                </span>
              </h2>
              <p className="text-xs text-gray-400 mb-6">
                Points are awarded for correct forecasts when questions are finalized.
              </p>

              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No points awarded yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {leaderboard.map((lb, idx) => (
                    <li
                      key={`${lb.user}-${idx}`}
                      className="bg-gray-900/50 rounded-lg p-3 flex justify-between items-center border border-gray-700/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-bold w-4 text-center">
                          {idx + 1}
                        </span>
                        <img
                          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${lb.user}`}
                          alt="avatar"
                          className="w-6 h-6 rounded-full opacity-80"
                        />
                        <span className="text-sm font-medium text-gray-200">
                          {lb.user.slice(0, 4)}...{lb.user.slice(-4)}
                        </span>
                      </div>
                      <span className="text-orange-400 font-bold text-sm">
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

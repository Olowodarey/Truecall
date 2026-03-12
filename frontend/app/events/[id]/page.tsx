"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { openContractCall } from "@stacks/connect";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HIRO_API } from "@/lib/contracts";

import { formatEstimatedTime } from "@/lib/utils";
import { clearCache } from "@/lib/cache";

import {
  getEvent,
  getQuestionsForEvent,
  getLeaderboard,
  getParticipant,
  getAnswer,
  joinEventTxOptions,
  answerQuestionTxOptions,
  claimPointsTxOptions,
  claimWinningsTxOptions,
  claimRefundTxOptions,
} from "@/lib/stacks";

import type {
  ChainEvent,
  ChainQuestion,
  ChainAnswer,
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
  // Map of questionId → ChainAnswer (to show claim state)
  const [answers, setAnswers] = useState<Record<number, ChainAnswer | null>>({});
  const [currentBlock, setCurrentBlock] = useState(0);
  const [lbLoading, setLbLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-action pending state keyed by action string
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const setBusy = (key: string, v: boolean) =>
    setPending((p) => ({ ...p, [key]: v }));

  // Prediction UI state
  const [selectedQuestion, setSelectedQuestion] = useState<ChainQuestion | null>(null);
  const [prediction, setPrediction] = useState<boolean | null>(null);
  const [predictSuccess, setPredictSuccess] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  // Lightweight leaderboard-only refresh (no spinner, just silently updates)
  const refreshLeaderboard = useCallback(async () => {
    if (isNaN(eventId)) return;
    setLbLoading(true);
    try {
      clearCache(`readOnly-get-leaderboard`);
      const lb = await getLeaderboard(eventId);
      setLeaderboard(lb);
    } catch {
      // fail silently — stale data is fine
    } finally {
      setLbLoading(false);
    }
  }, [eventId]);

  const fetchData = async () => {
    if (isNaN(eventId)) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch block height separately so a CORS/network hiccup never aborts
      // loading the event itself.
      fetch(`${HIRO_API}/v2/info`)
        .then((r) => r.json())
        .then((info) => setCurrentBlock(info.burn_block_height ?? 0))
        .catch(() => {/* ignore — currentBlock stays 0 */});

      const ev = await getEvent(eventId);

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
        // Fetch participant + all answers — errors per-question are swallowed
        const [p, ...answerResults] = await Promise.all([
          getParticipant(eventId, userAddress),
          ...qs.map((q) =>
            getAnswer(q.id, userAddress!).catch(() => null)
          ),
        ]);
        setParticipant(p);

        const answerMap: Record<number, ChainAnswer | null> = {};
        qs.forEach((q, i) => {
          answerMap[q.id] = (answerResults[i] as ChainAnswer | null) ?? null;
        });
        setAnswers(answerMap);
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

  // Auto-poll leaderboard every 30 s
  useEffect(() => {
    const id = setInterval(refreshLeaderboard, 30_000);
    return () => clearInterval(id);
  }, [refreshLeaderboard]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (!userAddress) return;
    setBusy("join", true);
    await openContractCall({
      ...joinEventTxOptions(eventId),
      onFinish: () => {
        clearCache();
        setBusy("join", false);
        fetchData();
      },
      onCancel: () => setBusy("join", false),
    });
  };

  const handlePredict = async () => {
    if (!selectedQuestion || prediction === null) return;
    setBusy(`answer-${selectedQuestion.id}`, true);
    setPredictError(null);
    try {
      await openContractCall({
        ...answerQuestionTxOptions(selectedQuestion.id, prediction),
        onFinish: () => {
          clearCache();
          setPredictSuccess(true);
          setTimeout(() => {
            setPredictSuccess(false);
            setSelectedQuestion(null);
            setPrediction(null);
            setBusy(`answer-${selectedQuestion.id}`, false);
            fetchData();
          }, 3000);
        },
        onCancel: () => {
          setBusy(`answer-${selectedQuestion.id}`, false);
        },
      });
    } catch (err: any) {
      setPredictError(err?.message || "Prediction failed");
      setBusy(`answer-${selectedQuestion.id}`, false);
    }
  };

  const handleClaimPoints = async (questionId: number) => {
    setBusy(`points-${questionId}`, true);
    await openContractCall({
      ...claimPointsTxOptions(questionId),
      onFinish: () => {
        clearCache();
        setBusy(`points-${questionId}`, false);
        fetchData();
        // Give the chain ~3 s to anchor the block, then refresh leaderboard
        setTimeout(() => refreshLeaderboard(), 3000);
      },
      onCancel: () => setBusy(`points-${questionId}`, false),
    });
  };

  const handleClaimWinnings = async () => {
    setBusy("winnings", true);
    await openContractCall({
      ...claimWinningsTxOptions(eventId),
      onFinish: () => {
        clearCache();
        setBusy("winnings", false);
        fetchData();
      },
      onCancel: () => setBusy("winnings", false),
    });
  };

  const handleClaimRefund = async () => {
    setBusy("refund", true);
    await openContractCall({
      ...claimRefundTxOptions(eventId),
      onFinish: () => {
        clearCache();
        setBusy("refund", false);
        fetchData();
      },
      onCancel: () => setBusy("refund", false),
    });
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const isJoined = !!participant?.joined;
  const allFinalized =
    event !== null &&
    event.questionCount > 0 &&
    event.finalizedQuestionCount === event.questionCount;

  // ── Loading / error screens ────────────────────────────────────────────────

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
          <p className="text-red-400 font-semibold mb-4">{error ?? "Event not found"}</p>
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

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />

      <main className="container mx-auto px-4 max-w-5xl mt-8">
        {/* Back */}
        <button
          onClick={() => router.push("/events")}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition"
        >
          <span>←</span> Back
        </button>

        {/* ── Event Banner ── */}
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

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">Entry Fee</p>
              <p className="text-white font-medium text-lg">{feeLabel}</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">Prize Pool</p>
              <p className="text-orange-400 font-bold text-lg">{poolStx} STX</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">Participants</p>
              <p className="text-white font-medium text-lg">{event.participantCount}</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">Ends At</p>
              <p className="text-white font-medium text-lg">
                {formatEstimatedTime(event.endBlock, currentBlock)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Block #{event.endBlock}</p>
            </div>
          </div>

          {/* ── Join / Status CTA ── */}
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
              <h3 className="text-white font-bold text-xl mb-2">Join Event to Forecast</h3>
              <p className="text-gray-400 text-sm mb-6">
                Pay {feeLabel} to enter. Forecast on all questions and earn points!
              </p>
              <button
                onClick={handleJoin}
                disabled={!!pending["join"]}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition disabled:opacity-50"
              >
                {pending["join"] ? "Waiting for wallet..." : `Join Event (${feeLabel})`}
              </button>
            </div>
          ) : event.isActive && isJoined ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-center font-medium flex items-center justify-center gap-2">
              ✅ You have joined this event! Choose a question below to forecast.
            </div>
          ) : /* Event closed */ !event.isActive && isJoined && event.refundMode ? (
            /* Refund mode — under 5 participants */
            <div className="p-5 bg-yellow-900/20 rounded-xl border border-yellow-500/30 text-center">
              <p className="text-yellow-400 font-semibold mb-3">
                ⚠️ Event ended with too few participants — refund available
              </p>
              <button
                disabled={!!pending["refund"] || !!participant?.refundClaimed}
                onClick={handleClaimRefund}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-lg transition disabled:opacity-50"
              >
                {participant?.refundClaimed
                  ? "Refund Already Claimed"
                  : pending["refund"]
                  ? "Waiting for wallet..."
                  : `Claim Refund (${feeLabel})`}
              </button>
            </div>
          ) : !event.isActive && isJoined && allFinalized ? (
            /* Normal close — claim winnings */
            <div className="p-5 bg-green-900/20 rounded-xl border border-green-500/30 text-center">
              <p className="text-green-400 font-semibold mb-3">
                🎉 Event settled! Top scorers can claim their winnings.
              </p>
              <button
                disabled={!!pending["winnings"]}
                onClick={handleClaimWinnings}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-8 rounded-lg transition disabled:opacity-50"
              >
                {pending["winnings"] ? "Waiting for wallet..." : "🏆 Claim Winnings"}
              </button>
            </div>
          ) : null}
        </div>

        {/* ── Questions + Leaderboard ── */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Questions column */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-white mb-2">Questions</h2>

            {questions.length === 0 ? (
              <p className="text-gray-500 italic p-4 bg-gray-800/30 rounded-xl text-center">
                No questions available for this event yet.
              </p>
            ) : (
              <div className="grid gap-4">
                {questions.map((q) => {
                  const userAnswer = answers[q.id];
                  const alreadyAnswered = !!userAnswer;
                  const pointsClaimed = !!userAnswer?.pointsClaimed;
                  const isSelected = selectedQuestion?.id === q.id;
                  const isQuestionOpen = q.status === "open";

                  const activeClass = isSelected
                    ? "border-orange-500 ring-2 ring-orange-500/30"
                    : "border-gray-700/50 hover:border-gray-600";

                  return (
                    <div
                      key={q.id}
                      className={`bg-gray-800/50 backdrop-blur-sm p-5 rounded-2xl border transition-all ${activeClass} ${
                        isQuestionOpen && isJoined && !alreadyAnswered
                          ? "cursor-pointer"
                          : "opacity-90"
                      }`}
                      onClick={() => {
                        if (isQuestionOpen && isJoined && !alreadyAnswered) {
                          setSelectedQuestion(q);
                          setPrediction(null);
                          setPredictError(null);
                        }
                      }}
                    >
                      {/* Question header */}
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

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
                        <span>⚡ Target: ${q.targetPrice.toLocaleString()}</span>
                        <span>
                          🕒 Closes {formatEstimatedTime(q.closeBlock, currentBlock, q.status)}
                        </span>
                        {q.status === "final" && q.oraclePrice > 0 && (
                          <span className="text-green-400">
                            ✅ Oracle: ${q.oraclePrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Outcome badge */}
                      {q.status === "final" && q.finalOutcome !== null && (
                        <div
                          className={`text-xs font-semibold inline-block px-3 py-1 rounded-full mb-3 ${
                            q.finalOutcome
                              ? "bg-green-500/10 text-green-400 border border-green-500/30"
                              : "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}
                        >
                          Outcome: {q.finalOutcome ? "YES — Price ≥ Target" : "NO — Price < Target"}
                        </div>
                      )}

                      {/* User's answer badge */}
                      {alreadyAnswered && (
                        <div className="text-xs text-gray-400 mb-3 flex items-center gap-2">
                          <span>Your answer:</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              userAnswer!.prediction
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {userAnswer!.prediction ? "YES" : "NO"}
                          </span>
                        </div>
                      )}

                      {/* ── CLAIM POINTS button ── */}
                      {q.status === "final" &&
                        isJoined &&
                        userAddress &&
                        alreadyAnswered &&
                        !pointsClaimed &&
                        q.finalOutcome !== null &&
                        userAnswer!.prediction === q.finalOutcome && (
                          <button
                            disabled={!!pending[`points-${q.id}`]}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimPoints(q.id);
                            }}
                            className="mt-2 w-full py-2.5 rounded-lg border border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 font-semibold text-sm transition disabled:opacity-50"
                          >
                            {pending[`points-${q.id}`]
                              ? "Waiting for wallet..."
                              : "🏆 Claim Points"}
                          </button>
                        )}

                      {/* Already claimed */}
                      {q.status === "final" && pointsClaimed && (
                        <div className="mt-2 text-center text-xs text-green-400 font-semibold">
                          ✅ Points claimed
                        </div>
                      )}

                      {/* Wrong answer */}
                      {q.status === "final" &&
                        alreadyAnswered &&
                        q.finalOutcome !== null &&
                        !pointsClaimed &&
                        userAnswer!.prediction !== q.finalOutcome && (
                          <div className="mt-2 text-center text-xs text-red-400 font-semibold">
                            ❌ Incorrect prediction — no points
                          </div>
                        )}

                      {/* ── Prediction expansion (open questions only) ── */}
                      {isSelected && isQuestionOpen && !alreadyAnswered && (
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
                              className={`py-3 px-2 rounded-lg border-2 transition flex flex-col items-center justify-center gap-1 ${
                                prediction === true
                                  ? "border-green-500 bg-green-500/20 text-green-400"
                                  : "border-gray-600/50 bg-gray-800 hover:bg-gray-750 text-gray-300"
                              }`}
                            >
                              <span className="font-bold text-lg">✅ YES</span>
                              <span className="text-xs opacity-80">(Price ≥ Target)</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrediction(false);
                              }}
                              className={`py-3 px-2 rounded-lg border-2 transition flex flex-col items-center justify-center gap-1 ${
                                prediction === false
                                  ? "border-red-500 bg-red-500/20 text-red-400"
                                  : "border-gray-600/50 bg-gray-800 hover:bg-gray-750 text-gray-300"
                              }`}
                            >
                              <span className="font-bold text-lg">❌ NO</span>
                              <span className="text-xs opacity-80">(Price &lt; Target)</span>
                            </button>
                          </div>

                          {predictError && (
                            <p className="text-red-400 text-xs text-center mb-3">
                              {predictError}
                            </p>
                          )}
                          {predictSuccess && (
                            <p className="text-green-400 text-xs text-center mb-3 font-medium">
                              Forecast submitted successfully!
                            </p>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePredict();
                            }}
                            disabled={
                              prediction === null ||
                              !!pending[`answer-${q.id}`]
                            }
                            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {pending[`answer-${q.id}`]
                              ? "Waiting for wallet..."
                              : "Submit Forecast"}
                          </button>
                        </div>
                      )}

                      {/* Already answered notice */}
                      {alreadyAnswered && isQuestionOpen && (
                        <div className="mt-3 text-center text-xs text-gray-500">
                          Answer locked in — awaiting close block
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leaderboard column */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/60 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-6 sticky top-24">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  🏆 Leaderboard
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded font-semibold">
                    Top 5
                  </span>
                  <button
                    onClick={refreshLeaderboard}
                    disabled={lbLoading}
                    title="Refresh leaderboard"
                    className="text-gray-400 hover:text-orange-400 transition disabled:opacity-40 p-1 rounded-md hover:bg-gray-700/50"
                  >
                    <svg
                      className={`w-4 h-4 ${lbLoading ? "animate-spin" : ""}`}
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
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Updates after claiming points · auto-refreshes every 30s
              </p>

              {leaderboard.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-gray-400 text-sm font-medium">No points yet</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Claim points on a finalized question to appear here
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {leaderboard.map((lb, idx) => {
                    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                    const isMe = userAddress?.toLowerCase() === lb.user.toLowerCase();
                    return (
                      <li
                        key={`${lb.user}-${idx}`}
                        className={`rounded-xl p-3 flex justify-between items-center border transition-all ${
                          isMe
                            ? "bg-orange-500/10 border-orange-500/40 shadow-sm shadow-orange-500/10"
                            : idx === 0
                            ? "bg-yellow-500/5 border-yellow-500/20"
                            : "bg-gray-900/40 border-gray-700/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg leading-none w-6 text-center">
                            {medals[idx] ?? idx + 1}
                          </span>
                          <img
                            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${lb.user}`}
                            alt="avatar"
                            className="w-7 h-7 rounded-full opacity-90 border border-gray-600/50"
                          />
                          <div>
                            <span className={`text-sm font-semibold ${isMe ? "text-orange-300" : "text-gray-200"}`}>
                              {lb.user.slice(0, 5)}…{lb.user.slice(-4)}
                            </span>
                            {isMe && (
                              <span className="ml-2 text-[10px] bg-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold text-sm ${idx === 0 ? "text-yellow-400" : "text-orange-400"}`}>
                            {lb.points}
                          </span>
                          <span className="text-gray-500 text-xs ml-1">pts</span>
                        </div>
                      </li>
                    );
                  })}
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


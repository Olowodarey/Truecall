"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
const { openContractCall } = require("@stacks/connect") as any;
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HIRO_API } from "@/lib/contracts";
import { formatEstimatedTime } from "@/lib/utils";
import { clearCache } from "@/lib/cache";

import {
  getEvent,
  getQuestionsForEvent,
  getParticipant,
  getAnswer,
  answerQuestionTxOptions,
  claimPointsTxOptions,
} from "@/lib/stacks";

import type {
  ChainEvent,
  ChainQuestion,
  ChainAnswer,
  ChainParticipant,
} from "@/lib/types";

export default function EventQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const { stxAddress: userAddress } = useWallet();

  const eventId = Number(params?.id);

  const [event, setEvent] = useState<ChainEvent | null>(null);
  const [questions, setQuestions] = useState<ChainQuestion[]>([]);
  const [participant, setParticipant] = useState<ChainParticipant | null>(null);
  const [answers, setAnswers] = useState<Record<number, ChainAnswer | null>>(
    {},
  );
  const [currentBlock, setCurrentBlock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [selectedQuestion, setSelectedQuestion] =
    useState<ChainQuestion | null>(null);
  const [prediction, setPrediction] = useState<boolean | null>(null);
  const [predictSuccess, setPredictSuccess] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  const setBusy = (key: string, v: boolean) =>
    setPending((p) => ({ ...p, [key]: v }));

  const fetchData = useCallback(async () => {
    if (isNaN(eventId)) return;
    try {
      setLoading(true);
      setError(null);

      fetch(`${HIRO_API}/v2/info`)
        .then((r) => r.json())
        .then((info) => setCurrentBlock(info.burn_block_height ?? 0))
        .catch(() => {});

      const ev = await getEvent(eventId);
      if (!ev) {
        setError("Event not found");
        return;
      }
      setEvent(ev);

      const qs = await getQuestionsForEvent(eventId);
      setQuestions(qs);

      if (userAddress) {
        const [p, ...answerResults] = await Promise.all([
          getParticipant(eventId, userAddress),
          ...qs.map((q) => getAnswer(q.id, userAddress!).catch(() => null)),
        ]);
        setParticipant(p);
        const answerMap: Record<number, ChainAnswer | null> = {};
        qs.forEach((q, i) => {
          answerMap[q.id] = (answerResults[i] as ChainAnswer | null) ?? null;
        });
        setAnswers(answerMap);
      }
    } catch {
      setError("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [eventId, userAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePredict = async () => {
    if (!selectedQuestion || prediction === null) return;
    const questionId = selectedQuestion.id;
    const lockedPrediction = prediction;
    setBusy(`answer-${questionId}`, true);
    setPredictError(null);
    try {
      await openContractCall({
        ...answerQuestionTxOptions(questionId, lockedPrediction),
        onFinish: () => {
          clearCache();
          setAnswers((prev) => ({
            ...prev,
            [questionId]: {
              prediction: lockedPrediction,
              pointsClaimed: false,
            },
          }));
          setPredictSuccess(true);
          setTimeout(() => {
            setPredictSuccess(false);
            setSelectedQuestion(null);
            setPrediction(null);
            setBusy(`answer-${questionId}`, false);
          }, 3000);
        },
        onCancel: () => setBusy(`answer-${questionId}`, false),
      });
    } catch (err: any) {
      setPredictError(err?.message || "Prediction failed");
      setBusy(`answer-${questionId}`, false);
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
      },
      onCancel: () => setBusy(`points-${questionId}`, false),
    });
  };

  const isJoined = !!participant?.joined;

  if (loading) {
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4" />
        <p className="text-gray-400">Loading Questions...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl max-w-md w-full text-center">
          <p className="text-red-400 font-semibold mb-4">
            {error ?? "Event not found"}
          </p>
          <button
            onClick={() => router.push(`/events/${eventId}`)}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
          >
            ← Back to Event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />
      <main className="container mx-auto px-4 max-w-3xl mt-8">
        <button
          onClick={() => router.push(`/events/${eventId}`)}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition"
        >
          ← Back to Event
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            {event.title} — Questions
          </h1>
          <span className="text-sm text-gray-400">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </span>
        </div>

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

              return (
                <div
                  key={q.id}
                  className={`bg-gray-800/50 backdrop-blur-sm p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? "border-orange-500 ring-2 ring-orange-500/30"
                      : "border-gray-700/50 hover:border-gray-600"
                  } ${isQuestionOpen && isJoined && !alreadyAnswered ? "cursor-pointer" : "opacity-90"}`}
                  onClick={() => {
                    if (isQuestionOpen && isJoined && !alreadyAnswered) {
                      setSelectedQuestion(q);
                      setPrediction(null);
                      setPredictError(null);
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

                  <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
                    <span>⚡ Target: ${q.targetPrice.toLocaleString()}</span>
                    <span>
                      🔒 Predictions close:{" "}
                      {formatEstimatedTime(
                        q.closeBlock,
                        currentBlock,
                        q.status,
                      )}
                    </span>
                    {q.status === "open" && (
                      <span className="text-yellow-400/80">
                        ⏳ Resolves:{" "}
                        {formatEstimatedTime(q.resolveBlock, currentBlock)}
                      </span>
                    )}
                    {q.status === "final" && q.oraclePrice > 0 && (
                      <span className="text-green-400">
                        ✅ Oracle: ${q.oraclePrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {q.status === "final" && q.finalOutcome !== null && (
                    <div
                      className={`text-xs font-semibold inline-block px-3 py-1 rounded-full mb-3 ${
                        q.finalOutcome
                          ? "bg-green-500/10 text-green-400 border border-green-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      Outcome:{" "}
                      {q.finalOutcome
                        ? "YES — Price ≥ Target"
                        : "NO — Price < Target"}
                    </div>
                  )}

                  {q.status === "final" &&
                    q.finalOutcome !== null &&
                    (alreadyAnswered ? (
                      <div
                        className={`flex items-center gap-3 mb-3 p-3 rounded-xl border ${
                          userAnswer!.prediction === q.finalOutcome
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-red-500/10 border-red-500/30"
                        }`}
                      >
                        <span className="text-lg">
                          {userAnswer!.prediction === q.finalOutcome
                            ? "✅"
                            : "❌"}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-gray-400">
                            Your prediction
                          </span>
                          <span
                            className={`text-sm font-bold ${userAnswer!.prediction === q.finalOutcome ? "text-green-400" : "text-red-400"}`}
                          >
                            {userAnswer!.prediction ? "YES" : "NO"} —{" "}
                            {userAnswer!.prediction === q.finalOutcome
                              ? "Correct"
                              : "Wrong"}
                          </span>
                        </div>
                      </div>
                    ) : isJoined && userAddress ? (
                      <div className="flex items-center gap-3 mb-3 p-3 rounded-xl border bg-gray-700/30 border-gray-600/30">
                        <span className="text-lg">⚪</span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-gray-400">
                            Your prediction
                          </span>
                          <span className="text-sm font-bold text-gray-500">
                            No prediction made
                          </span>
                        </div>
                      </div>
                    ) : null)}

                  {q.status === "open" && alreadyAnswered && (
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

                  {q.status === "final" && pointsClaimed && (
                    <div className="mt-2 text-center text-xs text-green-400 font-semibold">
                      ✅ Points claimed
                    </div>
                  )}

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
                          <span className="text-xs opacity-80">
                            (Price ≥ Target)
                          </span>
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
                          <span className="text-xs opacity-80">
                            (Price &lt; Target)
                          </span>
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
                          prediction === null || !!pending[`answer-${q.id}`]
                        }
                        className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pending[`answer-${q.id}`]
                          ? "Waiting for wallet..."
                          : "Submit Forecast"}
                      </button>
                    </div>
                  )}

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
      </main>
      <Footer />
    </div>
  );
}

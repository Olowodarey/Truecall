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
  getLeaderboard,
  getParticipant,
  joinEventTxOptions,
  claimWinningsTxOptions,
  claimRefundTxOptions,
} from "@/lib/stacks";

import type {
  ChainEvent,
  LeaderboardEntry,
  ChainParticipant,
} from "@/lib/types";

export default function EventPredictionPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected, connectWallet, stxAddress: userAddress } = useWallet();

  const eventId = Number(params?.id);

  const [event, setEvent] = useState<ChainEvent | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [participant, setParticipant] = useState<ChainParticipant | null>(null);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [lbLoading, setLbLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-action pending state keyed by action string
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const setBusy = (key: string, v: boolean) =>
    setPending((p) => ({ ...p, [key]: v }));

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
        .catch(() => {
          /* ignore — currentBlock stays 0 */
        });

      const ev = await getEvent(eventId);

      if (!ev) {
        setError("Event not found");
        return;
      }
      setEvent(ev);

      const lb = await getLeaderboard(eventId);
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
          <p className="text-red-400 font-semibold mb-4">
            {error ?? "Event not found"}
          </p>
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
              <h3 className="text-white font-bold text-xl mb-2">
                Join Event to Forecast
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Pay {feeLabel} to enter. Forecast on all questions and earn
                points!
              </p>
              <button
                onClick={handleJoin}
                disabled={!!pending["join"]}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition disabled:opacity-50"
              >
                {pending["join"]
                  ? "Waiting for wallet..."
                  : `Join Event (${feeLabel})`}
              </button>
            </div>
          ) : event.isActive && isJoined ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-center font-medium flex items-center justify-center gap-2">
              ✅ You have joined this event! Choose a question below to
              forecast.
            </div>
          ) : /* Event closed */ !event.isActive &&
            isJoined &&
            event.refundMode ? (
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
          ) : !event.isActive &&
            isJoined &&
            event.questionCount > 0 &&
            event.finalizedQuestionCount === event.questionCount ? (
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
                {pending["winnings"]
                  ? "Waiting for wallet..."
                  : "🏆 Claim Winnings"}
              </button>
            </div>
          ) : null}
        </div>

        {/* ── Leaderboard + Questions CTA ── */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Questions CTA */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 h-full min-h-[200px]">
              <div className="text-4xl">🎯</div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {event.questionCount} Question
                  {event.questionCount !== 1 ? "s" : ""}
                </h2>
                <p className="text-gray-400 text-sm">
                  {event.finalizedQuestionCount} of {event.questionCount}{" "}
                  finalized
                </p>
              </div>
              <button
                onClick={() => router.push(`/events/${eventId}/questions`)}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                View Questions →
              </button>
            </div>
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
                  <p className="text-gray-400 text-sm font-medium">
                    No points yet
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    Claim points on a finalized question to appear here
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {leaderboard.map((lb, idx) => {
                    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                    const isMe =
                      userAddress?.toLowerCase() === lb.user.toLowerCase();
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
                            <span
                              className={`text-sm font-semibold ${isMe ? "text-orange-300" : "text-gray-200"}`}
                            >
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
                          <span
                            className={`font-bold text-sm ${idx === 0 ? "text-yellow-400" : "text-orange-400"}`}
                          >
                            {lb.points}
                          </span>
                          <span className="text-gray-500 text-xs ml-1">
                            pts
                          </span>
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

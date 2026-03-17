"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";
import {
  getAllEvents,
  getParticipant,
  getUserPoints,
  getQuestionsForEvent,
  getAnswer,
  getLeaderboard,
} from "@/lib/stacks";
import type {
  ChainEvent,
  ChainQuestion,
  ChainAnswer,
  LeaderboardEntry,
} from "@/lib/types";

interface EventStats {
  event: ChainEvent;
  points: number;
  rank: number | null;
  answered: number;
  correct: number;
  total: number;
  hasUnclaimedWinnings: boolean;
  refundAvailable: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { isConnected, connectWallet, stxAddress: userAddress } = useWallet();

  const [loading, setLoading] = useState(true);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);

  const totalPoints = eventStats.reduce((s, e) => s + e.points, 0);
  const totalAnswered = eventStats.reduce((s, e) => s + e.answered, 0);
  const totalCorrect = eventStats.reduce((s, e) => s + e.correct, 0);
  const accuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const unclaimedCount = eventStats.filter(
    (e) => e.hasUnclaimedWinnings,
  ).length;

  useEffect(() => {
    if (isConnected && userAddress) {
      loadProfile(userAddress);
    } else {
      setLoading(false);
    }
  }, [isConnected, userAddress]);

  const loadProfile = async (address: string) => {
    try {
      setLoading(true);
      const allEvents = await getAllEvents();

      const participationResults = await Promise.all(
        allEvents.map((ev) => getParticipant(ev.id, address).catch(() => null)),
      );

      const joinedEvents = allEvents.filter(
        (_, i) => participationResults[i]?.joined,
      );

      const stats = await Promise.all(
        joinedEvents.map(async (ev): Promise<EventStats> => {
          const [points, questions, leaderboard, participant] =
            await Promise.all([
              getUserPoints(ev.id, address).catch(() => 0),
              getQuestionsForEvent(ev.id).catch(() => [] as ChainQuestion[]),
              getLeaderboard(ev.id).catch(() => [] as LeaderboardEntry[]),
              getParticipant(ev.id, address).catch(() => null),
            ]);

          const finalizedQs = questions.filter((q) => q.status === "final");
          const answerResults = await Promise.all(
            finalizedQs.map((q) => getAnswer(q.id, address).catch(() => null)),
          );

          let answered = 0;
          let correct = 0;
          for (let i = 0; i < finalizedQs.length; i++) {
            const ans = answerResults[i] as ChainAnswer | null;
            if (ans) {
              answered++;
              if (ans.prediction === finalizedQs[i].finalOutcome) correct++;
            }
          }

          const rankIndex = leaderboard.findIndex(
            (lb) => lb.user.toLowerCase() === address.toLowerCase(),
          );
          const rank = rankIndex >= 0 ? rankIndex + 1 : null;

          const hasUnclaimedWinnings =
            !ev.isActive && ev.feeBooked && !ev.refundMode && rank !== null;

          const refundAvailable =
            !ev.isActive &&
            ev.refundMode &&
            !!participant?.joined &&
            !participant?.refundClaimed;

          return {
            event: ev,
            points,
            rank,
            answered,
            correct,
            total: questions.length,
            hasUnclaimedWinnings,
            refundAvailable,
          };
        }),
      );

      setEventStats(stats);
    } catch (err) {
      console.error("Profile load error:", err);
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
            <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/30">
              <svg
                className="w-10 h-10 text-orange-500"
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
              Connect your Stacks wallet to view your predictions, points, and
              rewards.
            </p>
            <button
              onClick={connectWallet}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold rounded-xl transition-all transform hover:scale-105"
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
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 max-w-5xl">
        {/* Profile header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 p-1">
              <div className="w-full h-full rounded-xl bg-gray-900 overflow-hidden">
                <img
                  src={`https://api.dicebear.com/7.x/identicon/svg?seed=${userAddress}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/80 rounded-full border border-gray-700 text-gray-400 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {userAddress?.slice(0, 8)}…{userAddress?.slice(-4)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
            <StatCard
              label="Total Points"
              value={loading ? "—" : totalPoints}
              icon="🏆"
              color="from-yellow-400 to-orange-500"
            />
            <StatCard
              label="Accuracy"
              value={loading ? "—" : `${accuracy}%`}
              icon="🎯"
              color="from-green-400 to-emerald-500"
            />
            <StatCard
              label="Predictions"
              value={loading ? "—" : totalAnswered}
              icon="📈"
              color="from-blue-400 to-indigo-500"
            />
          </div>
        </div>

        {/* Unclaimed winnings banner */}
        {!loading && unclaimedCount > 0 && (
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <p className="text-yellow-300 font-semibold">
                You have unclaimed winnings in {unclaimedCount} event
                {unclaimedCount > 1 ? "s" : ""}!
              </p>
            </div>
            <button
              onClick={() => router.push("/events")}
              className="text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-4 py-2 rounded-lg transition font-semibold shrink-0"
            >
              Claim Now →
            </button>
          </div>
        )}

        {/* Joined events */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                📅
              </span>
              Joined Events
            </h2>
            {!loading && (
              <span className="text-gray-400 text-sm">
                {eventStats.length} event{eventStats.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
            </div>
          ) : eventStats.length === 0 ? (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">
                You haven't joined any events yet.
              </p>
              <a
                href="/events"
                className="text-orange-500 hover:text-orange-400 font-semibold transition-colors"
              >
                Explore events →
              </a>
            </div>
          ) : (
            <div className="grid gap-4">
              {eventStats.map((es) => (
                <EventStatCard
                  key={es.event.id}
                  es={es}
                  onClick={() => router.push(`/events/${es.event.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50 flex flex-col items-center text-center hover:border-gray-500 transition-colors">
      <span className="text-2xl mb-1">{icon}</span>
      <span
        className={`text-2xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent`}
      >
        {value}
      </span>
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
        {label}
      </span>
    </div>
  );
}

function EventStatCard({
  es,
  onClick,
}: {
  es: EventStats;
  onClick: () => void;
}) {
  const {
    event,
    points,
    rank,
    answered,
    correct,
    total,
    hasUnclaimedWinnings,
    refundAvailable,
  } = es;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  const statusColor = event.isActive
    ? "bg-green-500/10 text-green-400 border-green-500/30"
    : "bg-gray-500/10 text-gray-400 border-gray-500/30";

  return (
    <div
      onClick={onClick}
      className="bg-gray-800/40 border border-gray-700/50 hover:border-orange-500/40 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-orange-500/5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-white font-bold text-lg truncate">
              {event.title}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}
            >
              {event.isActive ? "OPEN" : "CLOSED"}
            </span>
            {hasUnclaimedWinnings && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                💰 Unclaimed
              </span>
            )}
            {refundAvailable && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                ↩ Refund
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs">
            {answered}/{total} questions answered
            {accuracy !== null && ` · ${accuracy}% accuracy`}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex flex-col items-center bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2 min-w-[60px]">
            <span className="text-orange-400 font-bold text-lg leading-none">
              {points}
            </span>
            <span className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">
              pts
            </span>
          </div>
          <div className="flex flex-col items-center bg-gray-700/30 border border-gray-600/30 rounded-xl px-4 py-2 min-w-[60px]">
            <span className="text-white font-bold text-lg leading-none">
              {rank !== null ? (medals[rank - 1] ?? `#${rank}`) : "—"}
            </span>
            <span className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">
              rank
            </span>
          </div>
          <div className="flex flex-col items-center bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2 min-w-[60px]">
            <span className="text-green-400 font-bold text-lg leading-none">
              {correct}/{answered}
            </span>
            <span className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">
              correct
            </span>
          </div>
          <span className="text-gray-600 text-xl">›</span>
        </div>
      </div>
    </div>
  );
}

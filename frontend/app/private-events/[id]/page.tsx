"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PrivateRoundPanel from "@/components/PrivateRoundPanel";
import {
  deriveStatusLabel,
  deriveJoinFormVisible,
  derivePayoutButtons,
  renderLeaderboard,
  encodeInviteCode,
  blocksToTime,
  blockToRelativeTime,
} from "@/lib/private-event-utils";
import {
  getPrivateEvent,
  getPrivateLeaderboard,
  getPrivateParticipant,
  getRound,
  getRoundAnswer,
  joinPrivateEventTxOptions,
  startPrivateEventTxOptions,
  claimPrivateWinningsTxOptions,
  claimPrivateRefundTxOptions,
} from "@/lib/private-stacks";
import { HIRO_API } from "@/lib/contracts";
import type {
  ChainPrivateEvent,
  ChainRound,
  ChainPrivateParticipant,
  ChainRoundAnswer,
  LeaderboardEntry,
} from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

function truncate(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 8)}…${addr.slice(-4)}` : addr;
}

export default function PrivateEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected, connectWallet, stxAddress: userAddress } = useWallet();

  const eventId = Number(params?.id);

  const [event, setEvent] = useState<ChainPrivateEvent | null>(null);
  const [round, setRound] = useState<ChainRound | null>(null);
  const [participant, setParticipant] =
    useState<ChainPrivateParticipant | null>(null);
  const [roundAnswer, setRoundAnswer] = useState<ChainRoundAnswer | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lbLoading, setLbLoading] = useState(false);

  // Join form
  const [joinCode, setJoinCode] = useState("");
  const [joinPending, setJoinPending] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Creator actions
  const [startPending, setStartPending] = useState(false);
  const [payoutPending, setPayoutPending] = useState(false);

  const fetchData = useCallback(async () => {
    if (isNaN(eventId)) return;
    try {
      setLoading(true);
      setError(null);

      const [ev, blockInfo] = await Promise.all([
        getPrivateEvent(eventId),
        fetch(`${HIRO_API}/v2/info`)
          .then((r) => r.json())
          .catch(() => ({ burn_block_height: 0 })),
      ]);

      if (!ev) {
        setError("not_found");
        setLoading(false);
        return;
      }

      setEvent(ev);
      setCurrentBlock(blockInfo.burn_block_height ?? 0);

      const [lb, p] = await Promise.all([
        getPrivateLeaderboard(eventId),
        userAddress
          ? getPrivateParticipant(eventId, userAddress).catch(() => null)
          : Promise.resolve(null),
      ]);

      setLeaderboard(lb);
      setParticipant(p);

      if (ev.currentRound > 0) {
        const r = await getRound(eventId, ev.currentRound).catch(() => null);
        setRound(r);
        if (r && userAddress) {
          const ans = await getRoundAnswer(
            eventId,
            ev.currentRound,
            userAddress,
          ).catch(() => null);
          setRoundAnswer(ans);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load event data.");
    } finally {
      setLoading(false);
    }
  }, [eventId, userAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const lb = await getPrivateLeaderboard(eventId);
      setLeaderboard(lb);
    } catch {
      /* silent */
    } finally {
      setLbLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const id = setInterval(refreshLeaderboard, 30_000);
    return () => clearInterval(id);
  }, [refreshLeaderboard]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function callContract(
    txOptions: object,
    onDone: () => void,
    setP: (v: boolean) => void,
  ) {
    setP(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { openContractCall } = (await import("@stacks/connect")) as any;
    await openContractCall({
      ...txOptions,
      onFinish: () => {
        setP(false);
        onDone();
      },
      onCancel: () => setP(false),
    });
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError("Invite code is required");
      return;
    }
    setJoinError(null);
    await callContract(
      joinPrivateEventTxOptions(eventId, encodeInviteCode(joinCode)),
      fetchData,
      setJoinPending,
    );
  }

  async function handleStart() {
    await callContract(
      startPrivateEventTxOptions(eventId),
      fetchData,
      setStartPending,
    );
  }

  async function handleClaimWinnings() {
    await callContract(
      claimPrivateWinningsTxOptions(eventId),
      fetchData,
      setPayoutPending,
    );
  }

  async function handleClaimRefund() {
    await callContract(
      claimPrivateRefundTxOptions(eventId),
      fetchData,
      setPayoutPending,
    );
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4" />
        <p className="text-gray-400">Loading event…</p>
      </div>
    );
  }

  if (error === "not_found" || !event) {
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-4">
        <Header />
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-10 text-center max-w-md">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Event Not Found
          </h2>
          <p className="text-gray-400 mb-6">
            This private event doesn&apos;t exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/private-events")}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            ← Back to Private Events
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const isCreator = userAddress === event.creator;
  const isParticipant = !!participant?.joined;
  const status = deriveStatusLabel(event.isActive, event.ended);
  const joinFormVisible = deriveJoinFormVisible({
    isParticipant,
    isActive: event.isActive,
    ended: event.ended,
    currentBlock,
    joinDeadline: event.joinDeadline,
    currentRound: event.currentRound,
  });
  const deadlinePassed = currentBlock >= event.joinDeadline;
  const payoutButton = derivePayoutButtons({
    ended: event.ended,
    refundMode: event.refundMode,
    isParticipant,
    refundClaimed: participant?.refundClaimed ?? false,
  });
  const renderedLeaderboard = renderLeaderboard(leaderboard, userAddress);

  const statusColor =
    status === "Active"
      ? "bg-green-500/20 text-green-400 border-green-500/50"
      : status === "Ended"
        ? "bg-gray-500/20 text-gray-400 border-gray-500/50"
        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Back */}
        <button
          onClick={() => router.push("/private-events")}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition"
        >
          ← Back to Private Events
        </button>

        {/* ── Event Overview ── */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 lg:p-10 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              {event.title}
            </h1>
            <div className="flex gap-2 flex-wrap shrink-0">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor}`}
              >
                {status}
              </span>
              {event.refundMode && (
                <span className="px-3 py-1 rounded-full text-xs font-bold border bg-red-500/20 text-red-400 border-red-500/50">
                  Refund Mode
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Stat label="Creator" value={truncate(event.creator)} mono />
            <Stat
              label="Entry Fee"
              value={`${(event.entryFee / 1_000_000).toFixed(2)} STX`}
            />
            <Stat
              label="Total Pool"
              value={`${(event.totalPool / 1_000_000).toFixed(2)} STX`}
              highlight
            />
            <Stat label="Participants" value={String(event.participantCount)} />
            <Stat
              label="Round Progress"
              value={`${event.currentRound} / ${event.maxRounds}`}
            />
            <Stat
              label="Completed Rounds"
              value={String(event.completedRounds)}
            />
            <Stat
              label="Join Deadline"
              value={
                currentBlock
                  ? blockToRelativeTime(event.joinDeadline, currentBlock)
                  : `#${event.joinDeadline}`
              }
              sub={`block #${event.joinDeadline}`}
            />
            <Stat
              label="Time Between Rounds"
              value={blocksToTime(event.intervalBlocks)}
              sub={`${event.intervalBlocks} blocks`}
            />
            <Stat
              label="Submission Window"
              value={blocksToTime(event.submissionWindow)}
              sub={`${event.submissionWindow} blocks`}
            />
            <Stat
              label="Answer Window"
              value={blocksToTime(event.answerWindow)}
              sub={`${event.answerWindow} blocks`}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* ── Connect prompt ── */}
            {!isConnected && (
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-8 text-center">
                <p className="text-gray-400 mb-4">
                  Connect your wallet to join or manage this event.
                </p>
                <button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-2.5 px-6 rounded-lg transition"
                >
                  Connect Wallet
                </button>
              </div>
            )}

            {/* ── Join section ── */}
            {isConnected && (
              <>
                {isParticipant && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 font-medium text-center">
                    ✅ You have joined this event
                  </div>
                )}

                {!isParticipant &&
                  deadlinePassed &&
                  event.currentRound === 0 &&
                  !event.isActive &&
                  !event.ended && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-400 text-sm text-center">
                      ⏰ Join deadline passed — waiting for creator to start the
                      event
                    </div>
                  )}

                {!isParticipant && event.currentRound > 0 && !event.ended && (
                  <div className="bg-gray-700/40 border border-gray-600/50 rounded-xl p-4 text-gray-400 text-sm text-center">
                    🔒 This event has already started — joining is closed
                  </div>
                )}

                {joinFormVisible && (
                  <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6">
                    <h2 className="text-white font-bold text-lg mb-4">
                      Join Event
                    </h2>
                    <form onSubmit={handleJoin} className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">
                          Invite Code
                        </label>
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) => {
                            setJoinCode(e.target.value);
                            setJoinError(null);
                          }}
                          placeholder="Enter the invite code"
                          className="w-full bg-gray-900/60 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                        />
                        {joinError && (
                          <p className="text-red-400 text-xs mt-1">
                            {joinError}
                          </p>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={joinPending}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                      >
                        {joinPending
                          ? "Waiting for wallet…"
                          : `Join (${(event.entryFee / 1_000_000).toFixed(2)} STX)`}
                      </button>
                    </form>
                  </div>
                )}

                {/* ── Start Event (creator) ── */}
                {isCreator &&
                  !event.isActive &&
                  !event.ended &&
                  event.participantCount >= 1 && (
                    <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6">
                      <h2 className="text-white font-bold text-lg mb-2">
                        Start Event
                      </h2>
                      <p className="text-gray-400 text-sm mb-4">
                        {event.participantCount} participant(s) have joined.
                        Start the event to begin round 1.
                      </p>
                      <button
                        onClick={handleStart}
                        disabled={startPending}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-6 rounded-lg transition disabled:opacity-50"
                      >
                        {startPending ? "Waiting for wallet…" : "Start Event"}
                      </button>
                    </div>
                  )}

                {/* ── Round Panel ── */}
                {event.isActive && (
                  <div>
                    <h2 className="text-white font-bold text-lg mb-3">
                      Current Round
                    </h2>
                    <PrivateRoundPanel
                      event={event}
                      round={round}
                      roundAnswer={roundAnswer}
                      userAddress={userAddress}
                      isCreator={isCreator}
                      isParticipant={isParticipant}
                      currentBlock={currentBlock}
                      onActionComplete={fetchData}
                    />
                  </div>
                )}

                {/* ── Payout section ── */}
                {payoutButton && (
                  <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6">
                    <h2 className="text-white font-bold text-lg mb-4">
                      Payout
                    </h2>
                    {payoutButton === "winnings" && (
                      <button
                        onClick={handleClaimWinnings}
                        disabled={payoutPending}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50"
                      >
                        {payoutPending
                          ? "Waiting for wallet…"
                          : "🏆 Claim Winnings"}
                      </button>
                    )}
                    {payoutButton === "refund" && (
                      <button
                        onClick={handleClaimRefund}
                        disabled={payoutPending}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition disabled:opacity-50"
                      >
                        {payoutPending ? "Waiting for wallet…" : "Claim Refund"}
                      </button>
                    )}
                    {payoutButton === "refundClaimed" && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 font-semibold text-center">
                        Refund Claimed ✓
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Leaderboard ── */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/60 border border-purple-500/20 rounded-2xl p-6 sticky top-24">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-white">🏆 Leaderboard</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded font-semibold">
                    Top 5
                  </span>
                  <button
                    onClick={refreshLeaderboard}
                    disabled={lbLoading}
                    title="Refresh leaderboard"
                    className="text-gray-400 hover:text-purple-400 transition disabled:opacity-40 p-1 rounded-md hover:bg-gray-700/50"
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
                Auto-refreshes every 30s
              </p>

              {renderedLeaderboard.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-gray-400 text-sm">No points yet</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {renderedLeaderboard.map((entry, idx) => (
                    <li
                      key={`${entry.user}-${idx}`}
                      className={`rounded-xl p-3 flex justify-between items-center border transition-all ${
                        entry.isMe
                          ? "bg-purple-500/10 border-purple-500/40"
                          : "bg-gray-900/40 border-gray-700/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg w-6 text-center">
                          {MEDALS[idx] ?? idx + 1}
                        </span>
                        <div>
                          <span
                            className={`text-sm font-semibold font-mono ${entry.isMe ? "text-purple-300" : "text-gray-200"}`}
                          >
                            {truncate(entry.user)}
                          </span>
                          {entry.isMe && (
                            <span className="ml-2 text-[10px] bg-purple-500/30 text-purple-400 px-1.5 py-0.5 rounded font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-purple-400">
                          {entry.points}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">pts</span>
                      </div>
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

function Stat({
  label,
  value,
  mono,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
      <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">
        {label}
      </p>
      <p
        className={`font-semibold text-sm ${highlight ? "text-purple-400" : "text-white"} ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
      {sub && <p className="text-gray-500 text-xs mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}

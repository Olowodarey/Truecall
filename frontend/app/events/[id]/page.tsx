"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { celoSepolia } from "@/lib/wagmi";
import { parseUnits } from "viem";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  fetchEvent,
  fetchEventMatches,
  fetchEventLeaderboard,
  fetchHasJoined,
  fetchClaimable,
} from "@/lib/api";
import { CONTRACTS, EVENT_MANAGER_ABI } from "@/lib/contracts";
import type {
  TrueCallEvent,
  TrueCallMatch,
  LeaderboardEntry,
} from "@/lib/types";
import { formatDistanceToNow, format } from "date-fns";
import { getTokenSymbol } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
const ADMIN = "0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b";

// ERC-20 ABI for approval
const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params?.id);
  const { isConnected, address, connectWallet } = useWallet();

  const isAdmin = address?.toLowerCase() === ADMIN.toLowerCase();

  // Debug logging
  useEffect(() => {
    console.log("Event Detail Debug:", {
      address,
      isAdmin,
      ADMIN,
      isConnected,
    });
  }, [address, isConnected]);

  const [event, setEvent] = useState<TrueCallEvent | null>(null);
  const [matches, setMatches] = useState<TrueCallMatch[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [claimable, setClaimable] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinStep, setJoinStep] = useState<"idle" | "approving" | "joining">(
    "idle",
  );

  // Add match form state
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [matchForm, setMatchForm] = useState({
    homeTeam: "",
    awayTeam: "",
    apiMatchId: "",
    kickoffTime: "",
    predictionDeadline: "",
    allowScorePrediction: true,
    allowOutcomePrediction: true,
  });
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  // wagmi write hook for joining
  const {
    writeContract: join,
    data: joinTx,
    isPending: walletPending,
    error: writeError,
    reset: resetJoin,
  } = useWriteContract();
  const {
    isLoading: miningLoading,
    isSuccess: joinDone,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: joinTx });

  // wagmi write hook for approval
  const {
    writeContract: approve,
    data: approveTx,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();
  const {
    isLoading: approveMiningLoading,
    isSuccess: approveDone,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({ hash: approveTx });

  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== celoSepolia.id;

  const joinLoading =
    walletPending || miningLoading || approvePending || approveMiningLoading;
  const joinError =
    writeError ?? receiptError ?? approveError ?? approveReceiptError;

  const load = useCallback(async () => {
    if (isNaN(eventId)) return;
    try {
      setLoading(true);
      setError(null);
      const [ev, ms, lb] = await Promise.all([
        fetchEvent(eventId),
        fetchEventMatches(eventId),
        fetchEventLeaderboard(eventId),
      ]);
      setEvent(ev);
      setMatches(ms);
      setLeaderboard(lb.leaderboard);

      if (address) {
        const [joined, claimRes] = await Promise.all([
          fetchHasJoined(eventId, address),
          fetchClaimable(eventId, address),
        ]);
        setHasJoined(joined.joined);
        setClaimable(claimRes.claimable);
      }
    } catch {
      setError("Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [eventId, address]);

  useEffect(() => {
    resetJoin();
    resetApprove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (joinDone) {
      setJoinStep("idle");
      load();
    }
  }, [joinDone, load]);

  // Handle approval completion
  useEffect(() => {
    if (approveDone && event) {
      setJoinStep("joining");
      join({
        address: CONTRACTS.EVENT_MANAGER,
        abi: EVENT_MANAGER_ABI,
        functionName: "joinEvent",
        args: [BigInt(eventId)],
      });
    }
  }, [approveDone, event, eventId, join]);

  const handleJoin = async () => {
    if (!event || joinLoading) return;
    resetJoin();
    resetApprove();
    setJoinStep("idle");

    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: celoSepolia.id });
      } catch {
        return;
      }
    }

    const amount = parseUnits(event.entryFee, 18);
    const isNativeCELO =
      event.entryToken.toLowerCase() ===
      "0x0000000000000000000000000000000000000000";

    if (isNativeCELO) {
      setJoinStep("joining");
      join({
        address: CONTRACTS.EVENT_MANAGER,
        abi: EVENT_MANAGER_ABI,
        functionName: "joinEvent",
        args: [BigInt(eventId)],
        value: amount,
      });
    } else {
      setJoinStep("approving");
      approve({
        address: event.entryToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.EVENT_MANAGER, amount],
      });
    }
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || matchLoading) return;

    setMatchError(null);

    // Validate form
    if (
      !matchForm.homeTeam.trim() ||
      !matchForm.awayTeam.trim() ||
      !matchForm.apiMatchId.trim() ||
      !matchForm.kickoffTime ||
      !matchForm.predictionDeadline
    ) {
      setMatchError("All fields are required");
      return;
    }

    if (!matchForm.allowScorePrediction && !matchForm.allowOutcomePrediction) {
      setMatchError("At least one prediction type must be allowed");
      return;
    }

    const kickoffTs = Math.floor(
      new Date(matchForm.kickoffTime).getTime() / 1000,
    );
    const deadlineTs = Math.floor(
      new Date(matchForm.predictionDeadline).getTime() / 1000,
    );
    const now = Math.floor(Date.now() / 1000);

    if (kickoffTs <= now) {
      setMatchError("Kickoff time must be in the future");
      return;
    }

    if (deadlineTs >= kickoffTs) {
      setMatchError("Prediction deadline must be before kickoff");
      return;
    }

    setMatchLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/addMatch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            homeTeam: matchForm.homeTeam.trim(),
            awayTeam: matchForm.awayTeam.trim(),
            apiMatchId: matchForm.apiMatchId.trim(),
            kickoffTime: kickoffTs,
            predictionDeadline: deadlineTs,
            allowScorePrediction: matchForm.allowScorePrediction,
            allowOutcomePrediction: matchForm.allowOutcomePrediction,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        setMatchError(error.message || "Failed to add match");
        setMatchLoading(false);
        return;
      }

      // Success - reload matches
      setMatchForm({
        homeTeam: "",
        awayTeam: "",
        apiMatchId: "",
        kickoffTime: "",
        predictionDeadline: "",
        allowScorePrediction: true,
        allowOutcomePrediction: true,
      });
      setShowAddMatch(false);
      load();
    } catch (err) {
      setMatchError("Failed to add match. Check console for details.");
      console.error(err);
    } finally {
      setMatchLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
      </div>
    );

  if (error || !event)
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl max-w-md text-center">
          <p className="text-red-400 mb-4">{error ?? "Event not found"}</p>
          <button
            onClick={() => router.push("/events")}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg"
          >
            ← Back to Events
          </button>
        </div>
      </div>
    );

  const isOpen = event.status === "OPEN";
  const now = Date.now() / 1000;
  const started = now >= event.startDate;
  const canJoin = isOpen && !started && !hasJoined;

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />
      <main className="container mx-auto px-4 max-w-5xl mt-8">
        <button
          onClick={() => router.push("/events")}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back
        </button>

        {/* Event banner */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 lg:p-10 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              {event.eventName}
            </h1>
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-bold border shrink-0 ${
                isOpen
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/30"
              }`}
            >
              {event.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {(() => {
              const tokenSymbol = getTokenSymbol(event.entryToken);
              return [
                {
                  label: "Entry Fee",
                  value: `${event.entryFee} ${tokenSymbol}`,
                },
                {
                  label: "Prize Pool",
                  value: `${event.prizePool} ${tokenSymbol}`,
                  highlight: true,
                },
                { label: "Type", value: event.eventType },
                {
                  label: "Ends",
                  value: formatDistanceToNow(new Date(event.endDate * 1000), {
                    addSuffix: true,
                  }),
                },
              ].map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30"
                >
                  <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">
                    {label}
                  </p>
                  <p
                    className={`font-medium text-lg ${highlight ? "text-orange-400" : "text-white"}`}
                  >
                    {value}
                  </p>
                </div>
              ));
            })()}
          </div>

          {/* CTA */}
          {!isConnected ? (
            <div className="text-center p-6 bg-gray-900/80 rounded-xl border border-gray-700">
              <p className="text-gray-400 mb-4">
                Connect your wallet to join and predict
              </p>
              <button
                onClick={connectWallet}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg"
              >
                Connect Wallet
              </button>
            </div>
          ) : canJoin ? (
            <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-500/30 text-center">
              <h3 className="text-white font-bold text-xl mb-2">
                Join this Event
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Pay {event.entryFee} {getTokenSymbol(event.entryToken)} once —
                predict all matches, earn points
              </p>
              <button
                onClick={handleJoin}
                disabled={joinLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition disabled:opacity-50"
              >
                {joinStep === "approving"
                  ? approvePending
                    ? "Confirm approval in wallet…"
                    : "Approving token…"
                  : joinStep === "joining"
                    ? walletPending
                      ? "Confirm join in wallet…"
                      : "Joining…"
                    : `Join (${event.entryFee} ${getTokenSymbol(event.entryToken)})`}
              </button>
              {joinError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-left">
                  <p className="text-red-400 text-sm mb-2">
                    ⚠️{" "}
                    {joinError.message?.split(".")[0] ?? "Transaction failed"}
                  </p>
                  <button
                    onClick={() => {
                      resetJoin();
                      resetApprove();
                      setJoinStep("idle");
                    }}
                    className="text-xs text-gray-400 hover:text-white underline"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          ) : hasJoined && isOpen ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-center font-medium">
              ✅ You have joined — predict on matches below
            </div>
          ) : started && !hasJoined ? (
            <div className="bg-gray-700/40 border border-gray-600/50 rounded-xl p-4 text-gray-400 text-center">
              🔒 Event has started — joining is closed
            </div>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Matches */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Matches</h2>
              {/* Debug info */}
              {process.env.NODE_ENV === "development" && (
                <div className="text-xs text-gray-500 mr-2">
                  admin:{isAdmin ? "Y" : "N"} open:{isOpen ? "Y" : "N"} started:
                  {started ? "Y" : "N"}
                </div>
              )}
              {isAdmin && isOpen && started && (
                <button
                  onClick={() => setShowAddMatch(!showAddMatch)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition"
                >
                  {showAddMatch ? "Cancel" : "+ Add Match"}
                </button>
              )}
            </div>

            {/* Add Match Form */}
            {showAddMatch && isAdmin && (
              <div className="bg-gray-800/60 border border-orange-500/30 rounded-xl p-6 mb-6">
                <h3 className="text-white font-bold text-lg mb-4">Add Match</h3>
                <form onSubmit={handleAddMatch} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Home Team
                      </label>
                      <input
                        type="text"
                        value={matchForm.homeTeam}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            homeTeam: e.target.value,
                          })
                        }
                        placeholder="e.g. Manchester United"
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        disabled={matchLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Away Team
                      </label>
                      <input
                        type="text"
                        value={matchForm.awayTeam}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            awayTeam: e.target.value,
                          })
                        }
                        placeholder="e.g. Liverpool"
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        disabled={matchLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm mb-2">
                      API Match ID
                    </label>
                    <input
                      type="text"
                      value={matchForm.apiMatchId}
                      onChange={(e) =>
                        setMatchForm({
                          ...matchForm,
                          apiMatchId: e.target.value,
                        })
                      }
                      placeholder="e.g. match_12345"
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      disabled={matchLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Kickoff Time
                      </label>
                      <input
                        type="datetime-local"
                        value={matchForm.kickoffTime}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            kickoffTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        disabled={matchLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Prediction Deadline
                      </label>
                      <input
                        type="datetime-local"
                        value={matchForm.predictionDeadline}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            predictionDeadline: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        disabled={matchLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={matchForm.allowScorePrediction}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            allowScorePrediction: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-orange-500"
                        disabled={matchLoading}
                      />
                      <span className="text-gray-300 text-sm">
                        Allow Score Prediction (5 pts)
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={matchForm.allowOutcomePrediction}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            allowOutcomePrediction: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-orange-500"
                        disabled={matchLoading}
                      />
                      <span className="text-gray-300 text-sm">
                        Allow Outcome Prediction (3 pts)
                      </span>
                    </label>
                  </div>

                  {matchError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      ⚠️ {matchError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={matchLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
                  >
                    {matchLoading ? "Adding match…" : "Add Match"}
                  </button>
                </form>
              </div>
            )}

            {matches.length === 0 ? (
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
                <p className="text-gray-500">No matches added yet</p>
                {isOpen && started && isAdmin && (
                  <p className="text-gray-600 text-sm mt-1">
                    Click "Add Match" above to add matches
                  </p>
                )}
                {isOpen && started && !isAdmin && (
                  <p className="text-gray-600 text-sm mt-1">
                    Admin will add matches soon
                  </p>
                )}
              </div>
            ) : (
              matches.map((m) => (
                <div
                  key={m.matchId}
                  onClick={() =>
                    hasJoined &&
                    router.push(`/predictions?matchId=${m.matchId}`)
                  }
                  className={`bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 transition-all ${
                    hasJoined ? "hover:border-orange-500/40 cursor-pointer" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-white font-bold">{m.homeTeam}</span>
                      <span className="text-gray-500 text-sm">vs</span>
                      <span className="text-white font-bold">{m.awayTeam}</span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        m.status === "OPEN"
                          ? "bg-green-500/20 text-green-400"
                          : m.status === "VERIFIED"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>
                      ⏰{" "}
                      {format(new Date(m.kickoffTime * 1000), "MMM d, HH:mm")}
                    </span>
                    <div className="flex gap-2">
                      {m.allowScorePrediction && (
                        <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded text-xs">
                          Score 5pts
                        </span>
                      )}
                      {m.allowOutcomePrediction && (
                        <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs">
                          Outcome 3pts
                        </span>
                      )}
                    </div>
                  </div>
                  {m.status === "VERIFIED" && (
                    <div className="mt-2 text-center text-white font-bold">
                      {m.finalHomeScore} – {m.finalAwayScore}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/60 border border-orange-500/20 rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-4">
                🏆 Leaderboard
              </h2>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No points yet</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {leaderboard.map((lb, i) => (
                    <li
                      key={lb.user}
                      className={`rounded-xl p-3 flex justify-between items-center border ${
                        address?.toLowerCase() === lb.user.toLowerCase()
                          ? "bg-orange-500/10 border-orange-500/40"
                          : "bg-gray-900/40 border-gray-700/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg w-6 text-center">
                          {MEDALS[i] ?? i + 1}
                        </span>
                        <span className="text-sm font-mono text-gray-200">
                          {lb.user.slice(0, 6)}…{lb.user.slice(-4)}
                        </span>
                        {address?.toLowerCase() === lb.user.toLowerCase() && (
                          <span className="text-[10px] bg-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-sm text-orange-400">
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

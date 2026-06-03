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
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  fetchCreatorEvent,
  fetchCreatorEventMatches,
  fetchCreatorHasJoined,
  fetchMatchWinners,
  type CreatorEvent,
  type CreatorMatch,
  type MatchWinner,
} from "@/lib/creator-api";
import {
  CREATOR_EVENT_MANAGER_ADDRESS,
  CREATOR_EVENT_MANAGER_ABI,
} from "@/lib/creator-contracts";
import { format, formatDistanceToNow } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowPlusHours(h: number) {
  const d = new Date(Date.now() + h * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FixtureMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  venue: string;
  kickoffTime?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreatorEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params?.id);
  const { isConnected, address, connectWallet } = useWallet();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== celoSepolia.id;

  const [event, setEvent] = useState<CreatorEvent | null>(null);
  const [matches, setMatches] = useState<CreatorMatch[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [userPredictions, setUserPredictions] = useState<
    Record<
      number,
      {
        homeScore: number;
        awayScore: number;
        submitted: boolean;
        submittedAt: number;
      }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Join state
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Predict state
  const [predictMatchId, setPredictMatchId] = useState<number | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [predictError, setPredictError] = useState<string | null>(null);

  // Add match state (creator only)
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [newMatch, setNewMatch] = useState({
    homeTeam: "",
    awayTeam: "",
    apiMatchId: "",
    kickoffTime: nowPlusHours(24),
  });
  const [addMatchError, setAddMatchError] = useState<string | null>(null);

  // Fixture picker state for add match
  const [fixtures, setFixtures] = useState<FixtureMatch[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixturesLoaded, setFixturesLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [showFixturePicker, setShowFixturePicker] = useState(false);

  // Winners modal
  const [winnersMatchId, setWinnersMatchId] = useState<number | null>(null);
  const [winners, setWinners] = useState<MatchWinner[]>([]);
  const [winnersLoading, setWinnersLoading] = useState(false);

  // wagmi — join
  const {
    writeContract: joinWrite,
    data: joinTx,
    isPending: joinPending,
    error: joinWriteError,
    reset: resetJoin,
  } = useWriteContract();
  const { isLoading: joinMining, isSuccess: joinDone } =
    useWaitForTransactionReceipt({ hash: joinTx });

  // wagmi — predict
  const {
    writeContract: predictWrite,
    data: predictTx,
    isPending: predictPending,
    error: predictWriteError,
    reset: resetPredict,
  } = useWriteContract();
  const { isLoading: predictMining, isSuccess: predictDone } =
    useWaitForTransactionReceipt({ hash: predictTx });

  // wagmi — add match (creator)
  const {
    writeContract: addMatchWrite,
    data: addMatchTx,
    isPending: addMatchPending,
    error: addMatchWriteError,
    reset: resetAddMatch,
  } = useWriteContract();
  const { isLoading: addMatchMining, isSuccess: addMatchDone } =
    useWaitForTransactionReceipt({ hash: addMatchTx });

  const isCreator =
    event && address?.toLowerCase() === event.creator.toLowerCase();

  // ── Load ─────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (isNaN(eventId)) return;
    try {
      setLoading(true);
      setError(null);
      const [ev, ms] = await Promise.all([
        fetchCreatorEvent(eventId),
        fetchCreatorEventMatches(eventId),
      ]);
      setEvent(ev);
      setMatches(ms);

      if (address) {
        const [joined, verified] = await Promise.all([
          fetchCreatorHasJoined(eventId, address),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/creator-events/verify/status/${address}`,
          )
            .then((r) => r.json())
            .catch(() => ({ verified: false })),
        ]);
        setHasJoined(joined.joined);
        setIsVerified(verified.verified ?? false);

        // Fetch predictions for all matches
        const predictions: Record<number, any> = {};
        for (const match of ms) {
          try {
            const pred = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/creator-events/match/${match.matchId}/prediction/${address}`,
            ).then((r) => r.json());
            if (pred && pred.submitted) {
              predictions[match.matchId] = pred;
            }
          } catch {
            // Silently continue
          }
        }
        setUserPredictions(predictions);
      }
    } catch {
      setError("Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [eventId, address]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (joinDone && joinTx) {
      // Wait a moment for blockchain to be indexed
      setTimeout(() => {
        setInviteCode("");
        load();
      }, 1500);
    }
  }, [joinDone, joinTx, load]);
  useEffect(() => {
    if (predictDone) {
      setPredictMatchId(null);
      setHomeScore("");
      setAwayScore("");
      load();
    }
  }, [predictDone, load]);
  useEffect(() => {
    if (addMatchDone) {
      setShowAddMatch(false);
      setNewMatch({
        homeTeam: "",
        awayTeam: "",
        apiMatchId: "",
        kickoffTime: nowPlusHours(24),
      });
      load();
    }
  }, [addMatchDone, load]);

  // ── Join ─────────────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    setJoinError(null);
    if (!inviteCode.trim()) return setJoinError("Enter the invite code");
    resetJoin();

    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: celoSepolia.id });
      } catch {
        return;
      }
    }

    joinWrite({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "joinEvent",
      args: [BigInt(eventId), inviteCode.trim()],
    });
  };

  // ── Predict ──────────────────────────────────────────────────────────────────

  const handlePredict = async (matchId: number) => {
    setPredictError(null);
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h > 20 || a > 20)
      return setPredictError("Enter valid scores (0–20)");
    resetPredict();

    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: celoSepolia.id });
      } catch {
        return;
      }
    }

    predictWrite({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "submitPrediction",
      args: [BigInt(matchId), h, a],
    });
  };

  // ── Add Match ────────────────────────────────────────────────────────────────

  const loadFixtures = async () => {
    if (fixturesLoaded) return;
    setFixturesLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/matches/upcoming`,
      );
      if (res.ok) {
        setFixtures(await res.json());
        setFixturesLoaded(true);
      }
    } catch {
      /* silently fail */
    } finally {
      setFixturesLoading(false);
    }
  };

  const filteredFixtures = fixtures.filter(
    (f) =>
      search === "" ||
      f.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      f.awayTeam.toLowerCase().includes(search.toLowerCase()) ||
      f.league.toLowerCase().includes(search.toLowerCase()),
  );

  const selectFixture = (f: FixtureMatch) => {
    // Convert Unix timestamp to Nigerian time (WAT = GMT+1)
    const kickoffDate = new Date((f.kickoffTime ?? 0) * 1000);

    // Get components in Nigerian timezone (Africa/Lagos)
    const nigerianTimeStr = kickoffDate.toLocaleString("en-US", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Parse the Nigerian time string to extract components
    // Format will be: MM/DD/YYYY, HH:mm
    const [datePart, timePart] = nigerianTimeStr.split(", ");
    const [month, day, year] = datePart.split("/");
    const [hours, minutes] = timePart.split(":");

    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const isoString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;

    setNewMatch({
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      apiMatchId: f.id,
      kickoffTime: isoString,
    });
    setShowFixturePicker(false);
    setSearch("");
  };

  const openFixturePicker = () => {
    setShowFixturePicker(!showFixturePicker);
    setSearch("");
    loadFixtures();
  };

  const handleAddMatch = async () => {
    setAddMatchError(null);
    if (!newMatch.homeTeam.trim() || !newMatch.awayTeam.trim())
      return setAddMatchError("Team names are required");

    // Parse the datetime-local value as if it's Nigerian time (WAT = GMT+1)
    // Format: YYYY-MM-DDTHH:mm
    const datetimeLocal = newMatch.kickoffTime;

    // When user enters time in datetime-local, treat it as Nigerian time
    // We need to convert Nigerian time to UTC for the blockchain
    // WAT is UTC+1, so subtract 1 hour (3600 seconds)
    const [datePart, timePart] = datetimeLocal.split("T");
    const [year, month, day] = datePart.split("-");
    const [hours, minutes] = timePart.split(":");

    // Create date in Nigerian timezone
    const nigerianDate = new Date(
      `${year}-${month}-${day}T${hours}:${minutes}:00+01:00`,
    );
    const kickoffTs = Math.floor(nigerianDate.getTime() / 1000);

    if (kickoffTs <= Math.floor(Date.now() / 1000))
      return setAddMatchError("Kickoff must be in the future");
    resetAddMatch();

    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: celoSepolia.id });
      } catch {
        return;
      }
    }

    addMatchWrite({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "addMatch",
      args: [
        BigInt(eventId),
        newMatch.homeTeam.trim(),
        newMatch.awayTeam.trim(),
        newMatch.apiMatchId.trim() || `match-${Date.now()}`,
        BigInt(kickoffTs),
      ],
    });
  };

  // ── View Winners ─────────────────────────────────────────────────────────────

  const viewWinners = async (matchId: number) => {
    setWinnersMatchId(matchId);
    setWinnersLoading(true);
    try {
      const res = await fetchMatchWinners(matchId);
      setWinners(res.winners);
    } catch {
      setWinners([]);
    } finally {
      setWinnersLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

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
            onClick={() => router.push("/creator-events")}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg"
          >
            ← Back
          </button>
        </div>
      </div>
    );

  const isOpen = event.status === "OPEN";
  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />
      <main className="container mx-auto px-4 max-w-4xl mt-8">
        <button
          onClick={() => router.push("/creator-events")}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 text-sm"
        >
          ← Back
        </button>

        {/* Event banner */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 lg:p-8 mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {event.eventName}
              </h1>
              <p className="text-gray-500 text-sm mt-1 font-mono">
                Creator: {event.creator.slice(0, 6)}…{event.creator.slice(-4)}
                {isCreator && (
                  <span className="ml-2 text-orange-400 font-bold">(you)</span>
                )}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                isOpen
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/30"
              }`}
            >
              {event.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">
                Matches
              </p>
              <p className="text-white font-bold text-lg">{matches.length}/5</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1 uppercase font-semibold">
                Created
              </p>
              <p className="text-white font-medium text-sm">
                {formatDistanceToNow(new Date(event.createdAt * 1000), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          {/* Join section */}
          {!isConnected ? (
            <div className="text-center p-5 bg-gray-900/80 rounded-xl border border-gray-700">
              <p className="text-gray-400 mb-3">
                Connect wallet to join and predict
              </p>
              <button
                onClick={connectWallet}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg"
              >
                Connect Wallet
              </button>
            </div>
          ) : hasJoined ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-center font-medium">
              ✅ You have joined — predict on matches below
            </div>
          ) : !isVerified ? (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-5">
              <h3 className="text-white font-bold mb-2">
                Verification Required
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                You need to be socially verified (Twitter) to join events.
                Contact admin to verify your address.
              </p>
              <p className="text-gray-500 text-xs font-mono break-all">
                {address}
              </p>
            </div>
          ) : isOpen ? (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-5">
              <h3 className="text-white font-bold mb-3">
                Join with Invite Code
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Joining is free — you just need the invite code from the
                creator.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  placeholder="Enter invite code"
                  disabled={joinPending || joinMining}
                  className="flex-1 px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase disabled:opacity-50"
                />
                <button
                  onClick={handleJoin}
                  disabled={joinPending || joinMining}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-lg transition disabled:opacity-50"
                >
                  {joinPending
                    ? "Confirm…"
                    : joinMining
                      ? "Joining…"
                      : "Join Free"}
                </button>
              </div>
              {(joinError || joinWriteError) && (
                <p className="text-red-400 text-sm mt-2">
                  ⚠️ {joinError ?? joinWriteError?.message?.split(".")[0]}
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Matches */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Matches</h2>
            {isCreator && isOpen && matches.length < 5 && (
              <button
                onClick={() => setShowAddMatch(!showAddMatch)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition"
              >
                {showAddMatch ? "Cancel" : "+ Add Match"}
              </button>
            )}
          </div>

          {/* Add match form */}
          {showAddMatch && isCreator && (
            <div className="bg-gray-800/60 border border-orange-500/30 rounded-xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Add Match</h3>
                <button
                  type="button"
                  onClick={openFixturePicker}
                  disabled={addMatchPending || addMatchMining}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg text-sm transition disabled:opacity-50 flex items-center gap-1"
                >
                  {showFixturePicker ? "✕ Close" : "📋 Load Matches"}
                </button>
              </div>

              {/* Fixture picker */}
              {showFixturePicker && (
                <div className="bg-gray-900/50 border border-gray-600 rounded-lg overflow-hidden mb-4">
                  <div className="p-3 border-b border-gray-700">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search team or league…"
                      autoFocus
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  {fixturesLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500" />
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {filteredFixtures.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">
                          {search ? "No matches found" : "Loading matches..."}
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-700">
                          {filteredFixtures.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => selectFixture(f)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-700 transition group border-b border-gray-700/50 last:border-0"
                            >
                              <p className="text-white text-sm font-semibold group-hover:text-orange-400 transition">
                                {f.homeTeam}{" "}
                                <span className="text-gray-400">vs</span>{" "}
                                {f.awayTeam}
                              </p>
                              <p className="text-gray-400 text-xs mt-1">
                                {f.league} · {f.venue}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Team inputs */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={newMatch.homeTeam}
                  onChange={(e) =>
                    setNewMatch({ ...newMatch, homeTeam: e.target.value })
                  }
                  placeholder="Home Team"
                  disabled={addMatchPending || addMatchMining}
                  className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                />
                <input
                  type="text"
                  value={newMatch.awayTeam}
                  onChange={(e) =>
                    setNewMatch({ ...newMatch, awayTeam: e.target.value })
                  }
                  placeholder="Away Team"
                  disabled={addMatchPending || addMatchMining}
                  className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={newMatch.apiMatchId}
                  onChange={(e) =>
                    setNewMatch({ ...newMatch, apiMatchId: e.target.value })
                  }
                  placeholder="API Match ID (optional)"
                  disabled={addMatchPending || addMatchMining}
                  className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                />
                <div>
                  <input
                    type="datetime-local"
                    value={newMatch.kickoffTime}
                    onChange={(e) =>
                      setNewMatch({ ...newMatch, kickoffTime: e.target.value })
                    }
                    disabled={addMatchPending || addMatchMining}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Predictions close at kickoff
                  </p>
                </div>
              </div>
              {(addMatchError || addMatchWriteError) && (
                <p className="text-red-400 text-sm mb-3">
                  ⚠️{" "}
                  {addMatchError ?? addMatchWriteError?.message?.split(".")[0]}
                </p>
              )}
              <button
                onClick={handleAddMatch}
                disabled={addMatchPending || addMatchMining}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {addMatchPending
                  ? "Confirm in wallet…"
                  : addMatchMining
                    ? "Adding match…"
                    : "Add Match"}
              </button>
            </div>
          )}

          {matches.length === 0 ? (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
              <p className="text-gray-500">No matches yet</p>
              {isCreator && isOpen && (
                <p className="text-gray-600 text-sm mt-1">
                  Click "+ Add Match" to add matches
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((m) => {
                const kickedOff = now >= m.kickoffTime;
                const canPredict =
                  hasJoined && m.status === "OPEN" && !kickedOff;

                return (
                  <div
                    key={m.matchId}
                    className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold">
                          {m.homeTeam}
                        </span>
                        <span className="text-gray-500 text-sm">vs</span>
                        <span className="text-white font-bold">
                          {m.awayTeam}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          m.status === "OPEN"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                      <span>
                        ⏰{" "}
                        {format(new Date(m.kickoffTime * 1000), "MMM d, HH:mm")}
                      </span>
                      {kickedOff && m.status === "OPEN" && (
                        <span className="text-yellow-400 text-xs">
                          Awaiting result
                        </span>
                      )}
                    </div>

                    {/* Verified result */}
                    {m.status === "VERIFIED" && (
                      <div className="text-center text-2xl font-bold text-white mb-3">
                        {m.finalHomeScore} – {m.finalAwayScore}
                      </div>
                    )}

                    {/* Already predicted */}
                    {userPredictions[m.matchId] ? (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-2">
                        <p className="text-green-400 text-sm font-semibold mb-3">
                          ✅ Your prediction submitted
                        </p>
                        <div className="text-center text-2xl font-bold text-white mb-2">
                          {userPredictions[m.matchId].homeScore} –{" "}
                          {userPredictions[m.matchId].awayScore}
                        </div>
                        <p className="text-gray-400 text-xs">
                          Predicted on{" "}
                          {format(
                            new Date(
                              userPredictions[m.matchId].submittedAt * 1000,
                            ),
                            "MMM d, yyyy 'at' HH:mm",
                          )}
                        </p>
                      </div>
                    ) : canPredict && predictMatchId === m.matchId ? (
                      <div className="bg-gray-900/50 rounded-lg p-4 mt-2">
                        <p className="text-gray-300 text-sm font-semibold mb-3">
                          Your prediction
                        </p>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1">
                            <p className="text-gray-400 text-xs mb-1">
                              {m.homeTeam}
                            </p>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={homeScore}
                              onChange={(e) => setHomeScore(e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <span className="text-gray-500 font-bold text-xl">
                            –
                          </span>
                          <div className="flex-1">
                            <p className="text-gray-400 text-xs mb-1">
                              {m.awayTeam}
                            </p>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={awayScore}
                              onChange={(e) => setAwayScore(e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                        {(predictError || predictWriteError) && (
                          <p className="text-red-400 text-xs mb-2">
                            ⚠️{" "}
                            {predictError ??
                              predictWriteError?.message?.split(".")[0]}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePredict(m.matchId)}
                            disabled={predictPending || predictMining}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg text-sm transition disabled:opacity-50"
                          >
                            {predictPending
                              ? "Confirm…"
                              : predictMining
                                ? "Submitting…"
                                : "Submit Prediction"}
                          </button>
                          <button
                            onClick={() => {
                              setPredictMatchId(null);
                              setPredictError(null);
                              resetPredict();
                            }}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : canPredict ? (
                      <button
                        onClick={() => {
                          setPredictMatchId(m.matchId);
                          setPredictError(null);
                          setHomeScore("");
                          setAwayScore("");
                        }}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg text-sm transition mt-1"
                      >
                        🎯 Predict Score
                      </button>
                    ) : null}

                    {/* View winners */}
                    {m.status === "VERIFIED" && (
                      <button
                        onClick={() => viewWinners(m.matchId)}
                        className="w-full mt-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-bold py-2 rounded-lg text-sm transition"
                      >
                        🏆 View Winners
                      </button>
                    )}

                    {!hasJoined &&
                      m.status === "OPEN" &&
                      !kickedOff &&
                      isOpen && (
                        <p className="mt-2 text-center text-gray-500 text-xs">
                          Join the event to predict
                        </p>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Winners Modal */}
      {winnersMatchId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">🏆 Match Winners</h3>
              <button
                onClick={() => setWinnersMatchId(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {winnersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
              </div>
            ) : winners.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No winners found for this match
              </p>
            ) : (
              <>
                <p className="text-gray-400 text-sm mb-4">
                  {winners.length} correct prediction
                  {winners.length !== 1 ? "s" : ""} · sorted by earliest
                  submission
                </p>
                <div className="space-y-2">
                  {winners
                    .sort((a, b) => a.submittedAt - b.submittedAt)
                    .map((w, i) => (
                      <div
                        key={w.user}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          address?.toLowerCase() === w.user.toLowerCase()
                            ? "bg-orange-500/10 border-orange-500/30"
                            : "bg-gray-800/50 border-gray-700/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg w-6 text-center">
                            {i === 0
                              ? "🥇"
                              : i === 1
                                ? "🥈"
                                : i === 2
                                  ? "🥉"
                                  : `${i + 1}.`}
                          </span>
                          <div className="flex items-center gap-2">
                            {w.twitterAvatar && (
                              <img
                                src={w.twitterAvatar}
                                alt="Twitter avatar"
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div>
                              {w.twitterHandle ? (
                                <div className="flex items-center gap-2">
                                  <p className="text-blue-400 font-semibold text-sm">
                                    @{w.twitterHandle}
                                  </p>
                                  <span className="text-green-500 text-xs">
                                    ✓
                                  </span>
                                </div>
                              ) : (
                                <p className="text-white font-mono text-sm">
                                  {w.user.slice(0, 6)}…{w.user.slice(-4)}
                                </p>
                              )}
                              {address?.toLowerCase() ===
                                w.user.toLowerCase() && (
                                <span className="text-xs bg-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                                  YOU
                                </span>
                              )}
                              <p className="text-gray-500 text-xs">
                                Predicted{" "}
                                {formatDistanceToNow(
                                  new Date(w.submittedAt * 1000),
                                  { addSuffix: true },
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <span className="text-green-400 text-xs font-bold">
                          ✓ Correct
                        </span>
                      </div>
                    ))}
                </div>
                <p className="text-gray-600 text-xs mt-4 text-center">
                  All data is on-chain · Timestamps are immutable
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { celo } from "@/lib/wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SharePredictionButton from "@/components/SharePredictionButton";
import ShareEventButton from "@/components/ShareEventButton";
import CountdownTimer from "@/components/CountdownTimer";
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
import { formatContractError } from "@/lib/error-formatter";

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

  const [event, setEvent] = useState<CreatorEvent | null>(null);
  const [matches, setMatches] = useState<CreatorMatch[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [isVerified, setIsVerified] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [twitterAvatar, setTwitterAvatar] = useState<string | null>(null);
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

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const showToast = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      setToast({ type, message });
    },
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Creator Twitter info
  const [creatorTwitter, setCreatorTwitter] = useState<string | null>(null);
  const [creatorAvatar, setCreatorAvatar] = useState<string | null>(null);

  // Pinned tweet (creator can link their event tweet so predictors reply under it)
  const [creatorTweetId, setCreatorTweetId] = useState<string | null>(null);
  const [tweetUrlInput, setTweetUrlInput] = useState("");
  const [tweetSaving, setTweetSaving] = useState(false);
  const [tweetSaveMsg, setTweetSaveMsg] = useState<string | null>(null);

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
  const [selectedLeague, setSelectedLeague] = useState("World Cup");
  const [showFixturePicker, setShowFixturePicker] = useState(false);

  const otherLeagues = Array.from(new Set(fixtures.map((f) => f.league)))
    .filter((l) => !l.toLowerCase().includes("world cup"))
    .sort();
  const hasWorldCup = fixtures.some((f) =>
    f.league.toLowerCase().includes("world cup"),
  );
  const leagues = [
    "All",
    "Today",
    ...(hasWorldCup ? ["World Cup"] : []),
    ...otherLeagues,
  ];

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

  // wagmi — complete event (creator, < 5 matches)
  const {
    writeContract: completeEventWrite,
    data: completeEventTx,
    isPending: completeEventPending,
    error: completeEventWriteError,
    reset: resetCompleteEvent,
  } = useWriteContract();
  const { isLoading: completeEventMining, isSuccess: completeEventDone } =
    useWaitForTransactionReceipt({ hash: completeEventTx });

  const isCreator =
    event && address?.toLowerCase() === event.creator.toLowerCase();

  // On-chain verification status — set via selfVerify() on the contract.
  // joinEvent() reverts with NotVerified() if this is false, and admins can
  // revoke it after a user has already joined, so it's checked separately
  // from `isVerified` (which only reflects Twitter linkage).
  const { data: isVerifiedOnChain } = useReadContract({
    address: CREATOR_EVENT_MANAGER_ADDRESS,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: "isVerified",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

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

      // Everything below is independent — fire it all at once instead of
      // awaiting one request before starting the next.
      const creatorProfilePromise = fetch(`/api/users/profile/${ev.creator}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const participantsPromise = fetch(
        `/api/creator-events/${eventId}/participants`,
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const tweetMetaPromise = fetch(`/api/creator-events/${eventId}/tweet`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const userDataPromise = address
        ? Promise.all([
            fetchCreatorHasJoined(eventId, address),
            fetch(`/api/users/twitter/verify-status/${address}`)
              .then((r) => r.json())
              .catch(() => ({
                verified: false,
                twitterHandle: null,
                twitterAvatar: null,
              })),
            Promise.all(
              ms.map((match) =>
                fetch(
                  `/api/creator-events/match/${match.matchId}/prediction/${address}`,
                )
                  .then((r) => r.json())
                  .then((pred) => ({ matchId: match.matchId, pred }))
                  .catch(() => null),
              ),
            ),
          ])
        : null;

      const [creatorProfile, participantsData, tweetMeta, userData] =
        await Promise.all([
          creatorProfilePromise,
          participantsPromise,
          tweetMetaPromise,
          userDataPromise,
        ]);

      if (creatorProfile) {
        setCreatorTwitter(creatorProfile.twitterHandle || null);
        setCreatorAvatar(creatorProfile.twitterAvatar || null);
      }

      setParticipantCount(participantsData?.count || 0);
      setCreatorTweetId(tweetMeta?.tweetId || null);

      if (userData) {
        const [joined, verified, predictionResults] = userData;
        setHasJoined(joined.joined);
        setIsVerified(verified.verified ?? false);
        setTwitterHandle(verified.twitterHandle);
        setTwitterAvatar(verified.twitterAvatar);

        const predictions: Record<number, any> = {};
        for (const result of predictionResults) {
          if (result?.pred?.submitted) {
            predictions[result.matchId] = result.pred;
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
    if (joinMining) showToast("info", "Joining event on-chain…");
  }, [joinMining, showToast]);

  useEffect(() => {
    if (joinDone && joinTx) {
      showToast("success", "You joined! Refreshing…");
      setTimeout(() => window.location.reload(), 1500);
    }
  }, [joinDone, joinTx, showToast]);

  useEffect(() => {
    if (joinWriteError) {
      const msg = formatContractError(joinWriteError);
      setJoinError(msg);
      showToast("error", msg);
    }
  }, [joinWriteError, showToast]);

  useEffect(() => {
    if (predictMining) showToast("info", "Submitting prediction on-chain…");
  }, [predictMining, showToast]);

  useEffect(() => {
    if (predictDone) {
      showToast("success", "Prediction submitted! Refreshing…");
      setTimeout(() => window.location.reload(), 1500);
    }
  }, [predictDone, showToast]);

  useEffect(() => {
    if (predictWriteError) {
      const msg = formatContractError(predictWriteError);
      setPredictError(msg);
      showToast("error", msg);
    }
  }, [predictWriteError, showToast]);

  useEffect(() => {
    if (addMatchMining) showToast("info", "Adding match on-chain…");
  }, [addMatchMining, showToast]);

  useEffect(() => {
    if (addMatchDone) {
      showToast("success", "Match added!");
      setShowAddMatch(false);
      setNewMatch({
        homeTeam: "",
        awayTeam: "",
        apiMatchId: "",
        kickoffTime: nowPlusHours(24),
      });
      setAddMatchError(null);
      resetAddMatch();
      load();
    }
  }, [addMatchDone, load, resetAddMatch, showToast]);

  useEffect(() => {
    if (addMatchWriteError) {
      const msg = formatContractError(addMatchWriteError);
      setAddMatchError(msg);
      showToast("error", msg);
    }
  }, [addMatchWriteError, showToast]);

  useEffect(() => {
    if (completeEventMining) showToast("info", "Completing event on-chain…");
  }, [completeEventMining, showToast]);

  useEffect(() => {
    if (completeEventDone) {
      showToast("success", "Event completed! Refreshing…");
      setTimeout(() => window.location.reload(), 1500);
    }
  }, [completeEventDone, showToast]);

  useEffect(() => {
    if (completeEventWriteError) {
      showToast("error", formatContractError(completeEventWriteError));
      resetCompleteEvent();
    }
  }, [completeEventWriteError, showToast, resetCompleteEvent]);

  // ── Pin Tweet ────────────────────────────────────────────────────────────────

  const saveTweetUrl = async () => {
    if (!tweetUrlInput.trim() || !address) return;
    setTweetSaving(true);
    setTweetSaveMsg(null);
    try {
      const res = await fetch(`/api/creator-events/${eventId}/tweet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweetUrl: tweetUrlInput.trim(),
          creatorAddress: address,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatorTweetId(data.tweetId);
        setTweetUrlInput("");
        setTweetSaveMsg("Tweet linked! Users will reply under it when sharing.");
      } else {
        setTweetSaveMsg(data.message || "Failed to link tweet");
      }
    } catch {
      setTweetSaveMsg("Failed to connect to server");
    } finally {
      setTweetSaving(false);
    }
  };

  // ── Join ─────────────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    setJoinError(null);
    if (!inviteCode.trim()) return setJoinError("Enter the invite code");

    // Check verification status before attempting transaction
    if (!isVerified || !isVerifiedOnChain) {
      setJoinError(
        "🔒 You must verify your Twitter account and bind your wallet on-chain before joining creator events",
      );
      return;
    }

    resetJoin();

    // Trigger the wallet request immediately, in the same tick as the click —
    // mobile wallets (WalletConnect deep links) only auto-open when the
    // request fires inside a synchronous user-gesture chain. Awaiting
    // switchChainAsync() first breaks that chain, so the wallet app never
    // pops up. Passing chainId here lets the connector handle switching as
    // part of the same request instead of a separate round trip.
    joinWrite({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "joinEvent",
      args: [BigInt(eventId), inviteCode.trim()],
      chainId: celo.id,
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

    // Fire the wallet request synchronously (see handleJoin) so mobile
    // wallets open via deep link instead of silently doing nothing.
    predictWrite({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "submitPrediction",
      args: [BigInt(matchId), h, a],
      chainId: celo.id,
    });
  };

  // ── Add Match ────────────────────────────────────────────────────────────────

  const loadFixtures = async () => {
    if (fixturesLoaded) return;
    setFixturesLoading(true);
    try {
      const res = await fetch("/api/matches/upcoming");
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const filteredFixtures = fixtures.filter((f) => {
    let matchesLeague: boolean;
    if (selectedLeague === "All") {
      matchesLeague = true;
    } else if (selectedLeague === "Today") {
      if (!f.kickoffTime) return false;
      const d = new Date(f.kickoffTime * 1000);
      matchesLeague = d >= todayStart && d <= todayEnd;
    } else if (selectedLeague === "World Cup") {
      matchesLeague = f.league.toLowerCase().includes("world cup");
    } else {
      matchesLeague = f.league === selectedLeague;
    }
    const matchesSearch =
      search === "" ||
      f.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      f.awayTeam.toLowerCase().includes(search.toLowerCase());
    return matchesLeague && matchesSearch;
  });

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
    setSelectedLeague("World Cup");
  };

  const openFixturePicker = () => {
    setShowFixturePicker(!showFixturePicker);
    setSearch("");
    setSelectedLeague("World Cup");
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

    // Fire the wallet request synchronously (see handleJoin) so mobile
    // wallets open via deep link instead of silently doing nothing.
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
      chainId: celo.id,
    });
  };

  // ── Complete Event ───────────────────────────────────────────────────────────

  const handleCompleteEvent = () => {
    resetCompleteEvent();
    completeEventWrite({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "completeEvent",
      args: [BigInt(eventId)],
      chainId: celo.id,
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

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all max-w-sm w-[90vw] ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-gray-700 text-white border border-gray-600"
          }`}
        >
          <span>
            {toast.type === "success"
              ? "✅"
              : toast.type === "error"
                ? "❌"
                : "⏳"}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}
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
              <div className="flex items-center gap-2 mt-1">
                {creatorAvatar && (
                  <img
                    src={creatorAvatar}
                    alt="Creator"
                    className="w-5 h-5 rounded-full"
                  />
                )}
                {creatorTwitter ? (
                  <p className="text-blue-400 text-sm flex items-center gap-1.5">
                    Creator: @{creatorTwitter}
                    <span className="text-green-500 text-xs">✓</span>
                    {isCreator && (
                      <span className="ml-1 text-orange-400 font-bold">
                        (you)
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm font-mono">
                    Creator: {event.creator.slice(0, 6)}…
                    {event.creator.slice(-4)}
                    {isCreator && (
                      <span className="ml-2 text-orange-400 font-bold">
                        (you)
                      </span>
                    )}
                  </p>
                )}
              </div>
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
                Participants
              </p>
              <p className="text-white font-bold text-lg flex items-center gap-2">
                {participantCount}/200
                {participantCount >= 200 && (
                  <span className="text-red-400 text-xs">FULL</span>
                )}
                {participantCount >= 150 && participantCount < 200 && (
                  <span className="text-amber-400 text-xs">FILLING UP</span>
                )}
              </p>
            </div>
          </div>

          {/* Creator Share Section */}
          {isCreator && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white font-semibold mb-1">
                    Share Your Event
                  </p>
                  <p className="text-gray-400 text-xs">
                    Invite participants with code:{" "}
                    <span className="text-orange-400 font-bold font-mono">
                      {inviteCode}
                    </span>
                  </p>
                </div>
                <ShareEventButton
                  eventId={eventId}
                  eventName={event.eventName}
                  inviteCode={inviteCode}
                  matchCount={matches.length}
                  participantCount={participantCount}
                  creatorTwitter={creatorTwitter}
                  variant="primary"
                />
              </div>
            </div>
          )}

          {/* Pinned tweet — visible to all users when a tweet is linked */}
          {creatorTweetId && (
            <a
              href={`https://x.com/i/web/status/${creatorTweetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold">
                    Creator&apos;s Event Tweet
                  </p>
                  <p className="text-blue-400 text-xs truncate">
                    {creatorTwitter
                      ? `@${creatorTwitter} — drop your prediction as a reply!`
                      : "Drop your prediction as a reply!"}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-blue-400 text-xs font-semibold group-hover:text-blue-300 transition flex items-center gap-1">
                View on X
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </span>
            </a>
          )}

          {/* Pin Tweet section — creator only */}
          {isCreator && isOpen && (
            <div className="mb-6 p-4 bg-gray-800/40 border border-gray-700/50 rounded-xl">
              <p className="text-white font-semibold mb-1 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Pin Your Event Tweet
              </p>
              <p className="text-gray-400 text-xs mb-3">
                Paste your event tweet URL. When participants share their
                predictions they&apos;ll reply directly under your tweet.
              </p>
              {creatorTweetId && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <span className="text-green-400 text-xs">✅ Tweet pinned</span>
                  <a
                    href={`https://x.com/i/web/status/${creatorTweetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs underline ml-auto"
                  >
                    View tweet ↗
                  </a>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tweetUrlInput}
                  onChange={(e) => {
                    setTweetUrlInput(e.target.value);
                    setTweetSaveMsg(null);
                  }}
                  placeholder="https://x.com/yourhandle/status/1234567890..."
                  disabled={tweetSaving}
                  className="flex-1 min-w-0 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={saveTweetUrl}
                  disabled={tweetSaving || !tweetUrlInput.trim()}
                  className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition disabled:opacity-50"
                >
                  {tweetSaving ? "Saving…" : creatorTweetId ? "Update" : "Link"}
                </button>
              </div>
              {tweetSaveMsg && (
                <p
                  className={`text-xs mt-2 ${
                    tweetSaveMsg.startsWith("Tweet linked") ||
                    tweetSaveMsg.startsWith("Tweet pinned")
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {tweetSaveMsg}
                </p>
              )}
            </div>
          )}

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
              {isVerified && twitterHandle && (
                <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                  <span className="text-blue-400">🐦 @{twitterHandle}</span>
                  <span className="text-green-400">✓ Verified</span>
                </div>
              )}
              {!isVerifiedOnChain && (
                <p className="mt-2 text-amber-400 text-sm font-normal">
                  ⚠️ Your on-chain verification was revoked — re-verify on{" "}
                  <button
                    onClick={() => router.push("/profile")}
                    className="underline font-semibold"
                  >
                    your profile
                  </button>{" "}
                  to keep predicting.
                </p>
              )}
            </div>
          ) : !isVerified || !isVerifiedOnChain ? (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-5">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <span>🔒</span>
                Verification Required to Join
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                You need to verify your Twitter account and bind your wallet
                on-chain before you can join creator events and submit
                predictions. This helps creators know you're a real person
                and builds trust in the community.
              </p>
              <ul className="text-sm space-y-1 mb-4">
                <li
                  className={isVerified ? "text-green-400" : "text-gray-400"}
                >
                  {isVerified ? "✅" : "⬜"} Twitter account linked
                </li>
                <li
                  className={
                    isVerifiedOnChain ? "text-green-400" : "text-gray-400"
                  }
                >
                  {isVerifiedOnChain ? "✅" : "⬜"} Wallet verified on-chain
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={() => router.push("/profile")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg transition flex items-center justify-center gap-2 shrink-0"
                >
                  🐦 Go to Profile to Verify
                </button>
                <div className="flex-1 bg-gray-900/50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Your wallet:</p>
                  <p className="text-gray-400 text-xs font-mono break-all">
                    {address}
                  </p>
                </div>
              </div>
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
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  placeholder="Enter invite code"
                  disabled={joinPending || joinMining}
                  className="flex-1 min-w-0 px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase disabled:opacity-50"
                />
                <button
                  onClick={handleJoin}
                  disabled={joinPending || joinMining}
                  className="shrink-0 sm:w-32 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-lg transition disabled:opacity-50"
                >
                  {joinPending
                    ? "Confirm…"
                    : joinMining
                      ? "Joining…"
                      : "Join Free"}
                </button>
              </div>
              {joinError && (
                <p className="text-red-400 text-sm mt-2">{joinError}</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Matches */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Matches</h2>
            <div className="flex items-center gap-2">
              {isCreator && isOpen && matches.length < 5 && (
                <button
                  onClick={() => setShowAddMatch(!showAddMatch)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition"
                >
                  {showAddMatch ? "Cancel" : "+ Add Match"}
                </button>
              )}
              {/* Complete Event — shown when creator has < 5 matches and all are verified */}
              {isCreator &&
                isOpen &&
                matches.length > 0 &&
                matches.length < 5 &&
                matches.every((m) => m.status === "VERIFIED") && (
                  <button
                    onClick={handleCompleteEvent}
                    disabled={completeEventPending || completeEventMining}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    {completeEventPending
                      ? "Confirm…"
                      : completeEventMining
                        ? "Completing…"
                        : "Complete Event"}
                  </button>
                )}
            </div>
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
                  <div className="p-3 border-b border-gray-700 space-y-2">
                    {/* League filter pills */}
                    {leagues.length > 1 && (
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                        {leagues.map((league) => (
                          <button
                            key={league}
                            type="button"
                            onClick={() => {
                              setSelectedLeague(league);
                              setSearch("");
                            }}
                            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition ${
                              selectedLeague === league
                                ? "bg-orange-500 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            {league}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Search + refresh row */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search team…"
                        autoFocus
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {!fixturesLoading && fixtures.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFixturesLoaded(false);
                            setFixtures([]);
                            setSelectedLeague("All");
                            loadFixtures();
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 transition flex-shrink-0"
                          title="Refresh matches"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {filteredFixtures.length} match{filteredFixtures.length !== 1 ? "es" : ""}
                      {selectedLeague !== "All" ? ` · ${selectedLeague}` : ""}
                    </p>
                  </div>
                  {fixturesLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500" />
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {filteredFixtures.length === 0 ? (
                        <div className="text-center py-6 px-4">
                          <p className="text-gray-400 text-sm mb-2">
                            {search
                              ? "No matches found"
                              : fixtures.length === 0
                                ? "No upcoming matches available"
                                : "Loading matches..."}
                          </p>
                          {fixtures.length === 0 && !search && (
                            <p className="text-gray-500 text-xs">
                              Configure API_FOOTBALL_KEY in backend for
                              real-time data
                            </p>
                          )}
                        </div>
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
                                {f.kickoffTime && (
                                  <span className="ml-2 text-gray-500">
                                    ·{" "}
                                    {new Date(
                                      f.kickoffTime * 1000,
                                    ).toLocaleDateString()}
                                  </span>
                                )}
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
                <p className="text-red-400 text-sm mb-3">{addMatchError}</p>
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
                  hasJoined &&
                  !!isVerifiedOnChain &&
                  m.status === "OPEN" &&
                  !kickedOff;

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
                        ⏰ Kickoff:{" "}
                        {format(new Date(m.kickoffTime * 1000), "MMM d, HH:mm")}
                      </span>
                      {kickedOff && m.status === "OPEN" && (
                        <span className="text-amber-400 text-xs">
                          Awaiting result
                        </span>
                      )}
                    </div>

                    {/* Countdown Timer for matches that haven't kicked off */}
                    {!kickedOff && m.status === "OPEN" && (
                      <div className="mb-3">
                        <CountdownTimer targetTimestamp={m.kickoffTime} />
                      </div>
                    )}

                    {/* Verified result */}
                    {m.status === "VERIFIED" && (
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-3">
                        <p className="text-blue-400 text-xs font-semibold mb-2 text-center uppercase">
                          Final Score
                        </p>
                        <div className="text-center text-3xl font-bold text-white">
                          {m.finalHomeScore} – {m.finalAwayScore}
                        </div>
                      </div>
                    )}

                    {/* Already predicted */}
                    {userPredictions[m.matchId] ? (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-2">
                        <p className="text-green-400 text-sm font-semibold mb-3">
                          ✅ Your prediction submitted
                        </p>
                        <p className="text-gray-400 text-xs font-semibold mb-2 text-center uppercase">
                          Your Prediction
                        </p>
                        <div className="text-center text-3xl font-bold text-white mb-2">
                          {userPredictions[m.matchId].homeScore} –{" "}
                          {userPredictions[m.matchId].awayScore}
                        </div>
                        <p className="text-gray-400 text-xs mb-3 text-center">
                          Predicted on{" "}
                          {format(
                            new Date(
                              userPredictions[m.matchId].submittedAt * 1000,
                            ),
                            "MMM d, yyyy 'at' HH:mm",
                          )}
                        </p>
                        {/* Share Button */}
                        <div className="flex justify-center">
                          <SharePredictionButton
                            eventName={event.eventName}
                            homeTeam={m.homeTeam}
                            awayTeam={m.awayTeam}
                            homeScore={userPredictions[m.matchId].homeScore}
                            awayScore={userPredictions[m.matchId].awayScore}
                            creatorTwitter={creatorTwitter}
                            eventId={eventId}
                            matchId={m.matchId}
                            variant="secondary"
                            replyToTweetId={creatorTweetId}
                          />
                        </div>
                      </div>
                    ) : canPredict && predictMatchId === m.matchId ? (
                      <div className="bg-gray-900/50 rounded-lg p-4 mt-2">
                        {/* Deadline Warning */}
                        {!kickedOff && (
                          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <p className="text-orange-400 text-xs font-semibold flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Predictions close at kickoff
                            </p>
                          </div>
                        )}

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
                        {predictError && (
                          <p className="text-red-400 text-xs mb-2">
                            {predictError}
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
                      <div className="space-y-2 mt-1">
                        <button
                          onClick={() => {
                            setPredictMatchId(m.matchId);
                            setPredictError(null);
                            setHomeScore("");
                            setAwayScore("");
                          }}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg text-sm transition"
                        >
                          🎯 Predict Score
                        </button>
                        {!kickedOff && (
                          <p className="text-center text-gray-400 text-xs flex items-center justify-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Closes at kickoff
                          </p>
                        )}
                      </div>
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
                                Predicted on{" "}
                                {format(
                                  new Date(w.submittedAt * 1000),
                                  "MMM d, yyyy 'at' HH:mm:ss",
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

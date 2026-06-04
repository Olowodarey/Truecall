"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { keccak256, toBytes, formatEther } from "viem";
import { celoSepolia } from "@/lib/wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  CREATOR_EVENT_MANAGER_ADDRESS,
  CREATOR_EVENT_MANAGER_ABI,
} from "@/lib/creator-contracts";
import { fetchCreationFee } from "@/lib/creator-api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FixtureMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  venue: string;
  kickoffTime?: number; // Unix timestamp from backend
}

interface MatchRow {
  homeTeam: string;
  awayTeam: string;
  apiMatchId: string;
  kickoffTime: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowPlusHours(h: number) {
  const d = new Date(Date.now() + h * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

function emptyRow(offsetHours = 24): MatchRow {
  return {
    homeTeam: "",
    awayTeam: "",
    apiMatchId: "",
    kickoffTime: nowPlusHours(offsetHours),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateCreatorEventPage() {
  const router = useRouter();
  const { isConnected, connectWallet } = useWallet();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== celoSepolia.id;

  // Form state
  const [eventName, setEventName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [matches, setMatches] = useState<MatchRow[]>([emptyRow(24)]);
  const [formError, setFormError] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  // Fee from contract (in wei)
  const [feeWei, setFeeWei] = useState<bigint>(BigInt(0));
  const [feeDisplay, setFeeDisplay] = useState<string>("...");

  useEffect(() => {
    fetchCreationFee()
      .then((f) => {
        const wei = BigInt(f.amountRaw);
        setFeeWei(wei);
        setFeeDisplay(`${formatEther(wei)} CELO`);
      })
      .catch(() => setFeeDisplay("fee unavailable"));
  }, []);

  // Fixture picker state
  const [fixtures, setFixtures] = useState<FixtureMatch[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixturesLoaded, setFixturesLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [activePickerIndex, setActivePickerIndex] = useState<number | null>(
    null,
  );

  // Freeze args at submit time to avoid stale closure issues
  const pendingArgsRef = useRef<{
    eventNameTrimmed: string;
    inviteCodeHash: `0x${string}`;
    homeTeams: string[];
    awayTeams: string[];
    apiMatchIds: string[];
    kickoffTimes: bigint[];
  } | null>(null);

  // wagmi — single write, no approval needed (native CELO)
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();
  const { isLoading: mining, isSuccess: done } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const busy = isPending || mining;

  useEffect(() => {
    if (done && txHash) setSuccessTxHash(txHash);
  }, [done, txHash]);

  // ── Load fixtures ─────────────────────────────────────────────────────────

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

  const filteredFixtures = fixtures.filter(
    (f) =>
      search === "" ||
      f.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      f.awayTeam.toLowerCase().includes(search.toLowerCase()) ||
      f.league.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Match row helpers ─────────────────────────────────────────────────────

  const addMatchRow = () => {
    if (matches.length >= 5) return;
    setMatches([...matches, emptyRow(24 * (matches.length + 1))]);
  };

  const removeMatchRow = (i: number) => {
    setMatches(matches.filter((_, idx) => idx !== i));
    if (activePickerIndex === i) setActivePickerIndex(null);
  };

  const updateMatch = (i: number, field: keyof MatchRow, value: string) =>
    setMatches(
      matches.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)),
    );

  const selectFixture = (i: number, f: FixtureMatch) => {
    // Update all fields in one state update to avoid batching issues
    setMatches(
      matches.map((m, idx) => {
        if (idx !== i) return m;

        // Convert UTC timestamp to Nigerian time (WAT = GMT+1)
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

        return {
          ...m,
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          apiMatchId: f.id,
          kickoffTime: isoString,
        };
      }),
    );

    setActivePickerIndex(null);
    setSearch("");
  };

  const openPicker = (i: number) => {
    setActivePickerIndex(activePickerIndex === i ? null : i);
    setSearch("");
    loadFixtures();
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    setFormError(null);
    if (!eventName.trim()) {
      setFormError("Event name is required");
      return false;
    }
    if (!inviteCode.trim()) {
      setFormError("Invite code is required");
      return false;
    }
    if (inviteCode.trim().length < 4) {
      setFormError("Invite code must be at least 4 characters");
      return false;
    }
    if (matches.length === 0) {
      setFormError("Add at least one match");
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (!m.homeTeam.trim() || !m.awayTeam.trim()) {
        setFormError(`Match ${i + 1}: team names are required`);
        return false;
      }
      if (!m.kickoffTime) {
        setFormError(`Match ${i + 1}: kickoff time is required`);
        return false;
      }

      // Parse datetime-local as Nigerian time (WAT = UTC+1)
      const [datePart, timePart] = m.kickoffTime.split("T");
      const [year, month, day] = datePart.split("-");
      const [hours, minutes] = timePart.split(":");

      // Create date in Nigerian timezone
      const nigerianDate = new Date(
        `${year}-${month}-${day}T${hours}:${minutes}:00+01:00`,
      );
      const kickoffTs = Math.floor(nigerianDate.getTime() / 1000);

      if (kickoffTs <= now) {
        setFormError(`Match ${i + 1}: kickoff must be in the future`);
        return false;
      }
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    reset();

    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: celoSepolia.id });
      } catch {
        return;
      }
    }

    // Freeze args now
    pendingArgsRef.current = {
      eventNameTrimmed: eventName.trim(),
      inviteCodeHash: keccak256(toBytes(inviteCode.trim())),
      homeTeams: matches.map((m) => m.homeTeam.trim()),
      awayTeams: matches.map((m) => m.awayTeam.trim()),
      apiMatchIds: matches.map(
        (m) => m.apiMatchId.trim() || `match-${Date.now()}`,
      ),
      kickoffTimes: matches.map((m) => {
        // Parse datetime-local as Nigerian time (WAT = UTC+1)
        const [datePart, timePart] = m.kickoffTime.split("T");
        const [year, month, day] = datePart.split("-");
        const [hours, minutes] = timePart.split(":");

        // Create date in Nigerian timezone
        const nigerianDate = new Date(
          `${year}-${month}-${day}T${hours}:${minutes}:00+01:00`,
        );
        return BigInt(Math.floor(nigerianDate.getTime() / 1000));
      }),
    };

    const args = pendingArgsRef.current;

    // Send CELO directly — no approval needed
    writeContract({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "createEvent",
      args: [
        args.eventNameTrimmed,
        args.inviteCodeHash,
        args.homeTeams,
        args.awayTeams,
        args.apiMatchIds,
        args.kickoffTimes,
      ],
      value: feeWei, // native CELO fee
    });
  };

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!isConnected)
    return (
      <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto bg-gray-800/40 border border-gray-700/50 rounded-2xl p-10">
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Connect Wallet
            </h2>
            <p className="text-gray-400 mb-6">
              Connect your wallet to create an event
            </p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 px-8 rounded-lg hover:from-orange-600 hover:to-yellow-600 transition"
            >
              Connect Wallet
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );

  if (successTxHash)
    return (
      <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto bg-gray-800/40 border border-green-500/30 rounded-2xl p-10">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Event Created!
            </h2>
            <p className="text-green-400 font-medium mb-2">
              Transaction confirmed on Celo Sepolia
            </p>
            <p className="text-gray-400 text-sm mb-2">
              Share your invite code with participants:
            </p>
            <div className="bg-gray-900 border border-orange-500/30 rounded-lg px-4 py-3 mb-4">
              <code className="text-orange-400 font-bold text-lg">
                {inviteCode}
              </code>
            </div>
            <a
              href={`https://celo-sepolia.blockscout.com/tx/${successTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-orange-400 transition break-all block mb-6 font-mono"
            >
              {successTxHash}
            </a>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/creator-events")}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                View Events →
              </button>
              <button
                onClick={() => {
                  setEventName("");
                  setInviteCode("");
                  setMatches([emptyRow(24)]);
                  setSuccessTxHash(null);
                  reset();
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                Create Another
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <button
          onClick={() => router.push("/creator-events")}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 text-sm"
        >
          ← Back to Events
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Event</h1>
          <p className="text-gray-400 text-sm">
            Pay the creation fee in CELO · Share your invite code · Joining is
            free
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1.5">
            <span className="text-orange-400 text-sm font-bold">
              Creation fee: {feeDisplay}
            </span>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value);
                  setFormError(null);
                }}
                maxLength={64}
                placeholder="e.g. UCL Final Night"
                disabled={busy}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              />
            </div>

            {/* Invite Code */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Invite Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setFormError(null);
                }}
                placeholder="e.g. MYCODE2025"
                disabled={busy}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 font-mono uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only the hash is stored on-chain. Share this code with your
                participants.
              </p>
            </div>

            {/* Matches */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">
                  Matches <span className="text-red-400">*</span>
                  <span className="text-gray-500 font-normal ml-2">
                    ({matches.length}/5)
                  </span>
                </label>
                {matches.length < 5 && (
                  <button
                    type="button"
                    onClick={addMatchRow}
                    disabled={busy}
                    className="text-orange-400 hover:text-orange-300 text-sm font-bold transition disabled:opacity-50"
                  >
                    + Add Match
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {matches.map((m, i) => (
                  <div
                    key={i}
                    className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs font-bold uppercase">
                        Match {i + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openPicker(i)}
                          disabled={busy}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition disabled:opacity-50"
                        >
                          {activePickerIndex === i
                            ? "✕ Close"
                            : "📋 Select Match"}
                        </button>
                        {matches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMatchRow(i)}
                            disabled={busy}
                            className="text-gray-500 hover:text-red-400 text-xs transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fixture picker */}
                    {activePickerIndex === i && (
                      <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
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
                                {search
                                  ? "No matches found"
                                  : "Loading matches..."}
                              </p>
                            ) : (
                              <div className="divide-y divide-gray-700">
                                {filteredFixtures.map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => selectFixture(i, f)}
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
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={m.homeTeam}
                        onChange={(e) =>
                          updateMatch(i, "homeTeam", e.target.value)
                        }
                        placeholder="Home Team"
                        disabled={busy}
                        className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={m.awayTeam}
                        onChange={(e) =>
                          updateMatch(i, "awayTeam", e.target.value)
                        }
                        placeholder="Away Team"
                        disabled={busy}
                        className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                      />
                    </div>

                    {/* API ID + Kickoff */}
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={m.apiMatchId}
                        onChange={(e) =>
                          updateMatch(i, "apiMatchId", e.target.value)
                        }
                        placeholder="API Match ID (auto-filled)"
                        disabled={busy}
                        className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                      />
                      <div>
                        <input
                          type="datetime-local"
                          value={m.kickoffTime}
                          onChange={(e) =>
                            updateMatch(i, "kickoffTime", e.target.value)
                          }
                          disabled={busy}
                          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Kickoff (predictions close here)
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {(formError || writeError) && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
                <span>⚠️</span>
                <span>
                  {formError ??
                    writeError?.message?.split(".")[0] ??
                    "Transaction failed"}
                </span>
              </div>
            )}

            {/* Status */}
            {busy && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm text-center">
                {isPending
                  ? "⏳ Confirm in wallet…"
                  : "⏳ Waiting for confirmation…"}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy || feeWei === BigInt(0)}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                  Creating event…
                </>
              ) : (
                `Create Event · ${feeDisplay}`
              )}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

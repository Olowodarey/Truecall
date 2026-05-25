"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
  useReadContract,
} from "wagmi";
import { keccak256, toBytes, parseUnits } from "viem";
import { celoSepolia } from "@/lib/wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  CREATOR_EVENT_MANAGER_ADDRESS,
  CREATOR_EVENT_MANAGER_ABI,
  ERC20_APPROVE_ABI,
} from "@/lib/creator-contracts";
import { fetchCreationFee } from "@/lib/creator-api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowPlusHours(h: number) {
  const d = new Date(Date.now() + h * 3600 * 1000);
  return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateCreatorEventPage() {
  const router = useRouter();
  const { isConnected, address, connectWallet } = useWallet();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== celoSepolia.id;

  // Form state
  const [eventName, setEventName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [matches, setMatches] = useState([
    {
      homeTeam: "",
      awayTeam: "",
      apiMatchId: "",
      kickoffTime: nowPlusHours(24),
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "approving" | "creating">("idle");
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  // Fee config from backend
  const [feeConfig, setFeeConfig] = useState<{
    token: string;
    amount: string;
    amountRaw: string;
  } | null>(null);

  useEffect(() => {
    fetchCreationFee()
      .then(setFeeConfig)
      .catch(() => {});
  }, []);

  const isNativeFee = !feeConfig || feeConfig.token === ZERO_ADDRESS;
  const feeAmount = feeConfig ? BigInt(feeConfig.amountRaw) : BigInt(0);

  // wagmi hooks
  const {
    writeContract: approve,
    data: approveTx,
    isPending: approvePending,
    reset: resetApprove,
  } = useWriteContract();
  const { isLoading: approveMining, isSuccess: approveDone } =
    useWaitForTransactionReceipt({ hash: approveTx });

  const {
    writeContract: createEvent,
    data: createTx,
    isPending: createPending,
    error: createError,
    reset: resetCreate,
  } = useWriteContract();
  const { isLoading: createMining, isSuccess: createDone } =
    useWaitForTransactionReceipt({ hash: createTx });

  const busy = approvePending || approveMining || createPending || createMining;

  // After approval confirmed → send createEvent
  useEffect(() => {
    if (approveDone) {
      setStep("creating");
      sendCreateEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveDone]);

  useEffect(() => {
    if (createDone && createTx) {
      setSuccessTxHash(createTx);
    }
  }, [createDone, createTx]);

  // ── Match helpers ────────────────────────────────────────────────────────────

  const addMatchRow = () => {
    if (matches.length >= 5) return;
    setMatches([
      ...matches,
      {
        homeTeam: "",
        awayTeam: "",
        apiMatchId: "",
        kickoffTime: nowPlusHours(24 * (matches.length + 1)),
      },
    ]);
  };

  const removeMatchRow = (i: number) => {
    setMatches(matches.filter((_, idx) => idx !== i));
  };

  const updateMatch = (i: number, field: string, value: string) => {
    setMatches(
      matches.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)),
    );
  };

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = () => {
    setFormError(null);
    if (!eventName.trim())
      return (setFormError("Event name is required"), false);
    if (!inviteCode.trim())
      return (setFormError("Invite code is required"), false);
    if (inviteCode.trim().length < 4)
      return (setFormError("Invite code must be at least 4 characters"), false);
    if (matches.length === 0)
      return (setFormError("Add at least one match"), false);

    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (!m.homeTeam.trim() || !m.awayTeam.trim())
        return (setFormError(`Match ${i + 1}: team names are required`), false);
      if (!m.kickoffTime)
        return (
          setFormError(`Match ${i + 1}: kickoff time is required`),
          false
        );
      const kickoffTs = Math.floor(new Date(m.kickoffTime).getTime() / 1000);
      if (kickoffTs <= now)
        return (
          setFormError(`Match ${i + 1}: kickoff must be in the future`),
          false
        );
    }
    return true;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const sendCreateEvent = () => {
    const inviteCodeHash = keccak256(toBytes(inviteCode.trim()));
    const homeTeams = matches.map((m) => m.homeTeam.trim());
    const awayTeams = matches.map((m) => m.awayTeam.trim());
    const apiMatchIds = matches.map(
      (m) => m.apiMatchId.trim() || `match-${Date.now()}`,
    );
    const kickoffTimes = matches.map((m) =>
      BigInt(Math.floor(new Date(m.kickoffTime).getTime() / 1000)),
    );

    createEvent({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "createEvent",
      args: [
        eventName.trim(),
        inviteCodeHash,
        homeTeams,
        awayTeams,
        apiMatchIds,
        kickoffTimes,
      ],
      ...(isNativeFee && { value: feeAmount }),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    resetApprove();
    resetCreate();

    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: celoSepolia.id });
      } catch {
        return;
      }
    }

    if (isNativeFee) {
      // Native CELO — send directly
      setStep("creating");
      sendCreateEvent();
    } else {
      // ERC-20 — approve first
      setStep("approving");
      approve({
        address: feeConfig!.token as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [CREATOR_EVENT_MANAGER_ADDRESS, feeAmount],
      });
    }
  };

  // ── Guards ───────────────────────────────────────────────────────────────────

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
            <p className="text-green-400 font-medium mb-1">
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
                  setMatches([
                    {
                      homeTeam: "",
                      awayTeam: "",
                      apiMatchId: "",
                      kickoffTime: nowPlusHours(24),
                    },
                  ]);
                  setSuccessTxHash(null);
                  setStep("idle");
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
            Pay the creation fee · Share your invite code · Joining is free
          </p>
          {feeConfig && (
            <div className="mt-3 inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1.5">
              <span className="text-orange-400 text-sm font-bold">
                Creation fee: {feeConfig.amount}{" "}
                {feeConfig.token === ZERO_ADDRESS ? "CELO" : "tokens"}
              </span>
            </div>
          )}
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
                  setInviteCode(e.target.value);
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
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={m.apiMatchId}
                          onChange={(e) =>
                            updateMatch(i, "apiMatchId", e.target.value)
                          }
                          placeholder="API Match ID (optional)"
                          disabled={busy}
                          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                        />
                      </div>
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
            {(formError || createError) && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
                <span>⚠️</span>
                <span>
                  {formError ??
                    createError?.message?.split(".")[0] ??
                    "Transaction failed"}
                </span>
              </div>
            )}

            {/* Status */}
            {busy && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm text-center">
                {step === "approving"
                  ? approvePending
                    ? "⏳ Confirm token approval in wallet…"
                    : "⏳ Waiting for approval confirmation…"
                  : createPending
                    ? "⏳ Confirm event creation in wallet…"
                    : "⏳ Waiting for transaction confirmation…"}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                  {step === "approving" ? "Approving…" : "Creating event…"}
                </>
              ) : (
                `Create Event${feeConfig ? ` · ${feeConfig.amount} ${feeConfig.token === ZERO_ADDRESS ? "CELO" : "tokens"}` : ""}`
              )}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

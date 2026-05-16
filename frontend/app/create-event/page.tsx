"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── Config ───────────────────────────────────────────────────────────────────

const ADMIN = "0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b";

const EVENT_MANAGER = (process.env.NEXT_PUBLIC_EVENT_MANAGER ??
  "0xc76C9f0Bb031245ce145c0b7B822E2d0A1267e89") as `0x${string}`;

const ABI = [
  {
    type: "function",
    name: "createPublicEvent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventName", type: "string" },
      { name: "startDate", type: "uint256" },
      { name: "endDate", type: "uint256" },
      { name: "entryFee", type: "uint256" },
      { name: "scoringRule", type: "uint8" },
    ],
    outputs: [{ name: "eventId", type: "uint256" }],
  },
] as const;

const SCORING_RULES = [
  { value: 0, label: "Exact Score Only", desc: "5 pts for correct score" },
  { value: 1, label: "Outcome Only", desc: "3 pts for correct W/D/L" },
  {
    value: 2,
    label: "Both (Score + Outcome)",
    desc: "Up to 8 pts per match — most flexible",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function parseWriteError(err: Error): string {
  const msg = err.message ?? "";
  if (msg.includes("User rejected") || msg.includes("user rejected"))
    return "Transaction rejected in wallet";
  if (msg.includes("insufficient funds"))
    return "Insufficient CELO for gas fees";
  if (msg.includes("OnlyOwner") || msg.includes("Ownable"))
    return "Only the contract owner can create events";
  if (msg.includes("StartDateInPast"))
    return "Start date must be in the future";
  if (msg.includes("EndDateBeforeStart"))
    return "End date must be after start date";
  if (msg.includes("FeeTooLow"))
    return "Entry fee is too low — minimum is 1 cUSD";
  return "Transaction failed — check your wallet and try again";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateEventPage() {
  const router = useRouter();
  const { isConnected, address, connectWallet } = useWallet();

  // Separate date + time state for each field
  const [startDateVal, setStartDateVal] = useState(""); // "YYYY-MM-DD"
  const [startTimeVal, setStartTimeVal] = useState("09:00");
  const [endDateVal, setEndDateVal] = useState(""); // "YYYY-MM-DD"
  const [endTimeVal, setEndTimeVal] = useState("23:00");

  const [eventName, setEventName] = useState("");
  const [entryFee, setEntryFee] = useState("1");
  const [scoringRule, setScoringRule] = useState(2);
  const [formError, setFormError] = useState<string | null>(null);

  // Wagmi
  const {
    writeContract,
    data: txHash,
    isPending: signing,
    error: writeError,
    status: writeStatus,
  } = useWriteContract();
  const busy = signing;

  // Log transaction when sent
  useEffect(() => {
    if (txHash) {
      console.log("✅ Transaction Hash:", txHash);
      console.log(
        "🔗 Blockscout Link:",
        `https://celo-sepolia.blockscout.com/tx/${txHash}`,
      );
    }
  }, [txHash]);

  // Log write errors
  useEffect(() => {
    if (writeError) {
      console.error("❌ Write Error:", writeError);
    }
  }, [writeError]);

  // Log write status
  useEffect(() => {
    if (writeStatus) {
      console.log("📝 Write Status:", writeStatus);
    }
  }, [writeStatus]);

  // Combined ISO strings for display + conversion
  const startISO = startDateVal ? `${startDateVal}T${startTimeVal}` : "";
  const endISO = endDateVal ? `${endDateVal}T${endTimeVal}` : "";

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    setFormError(null);
    if (!eventName.trim()) {
      setFormError("Event name is required");
      return false;
    }
    if (eventName.trim().length > 64) {
      setFormError("Event name must be 64 characters or less");
      return false;
    }
    if (!startDateVal) {
      setFormError("Start date is required");
      return false;
    }
    if (!endDateVal) {
      setFormError("End date is required");
      return false;
    }

    const fee = parseFloat(entryFee);
    if (isNaN(fee) || fee < 1) {
      setFormError("Entry fee must be at least 1 cUSD");
      return false;
    }

    const startTs = Math.floor(new Date(startISO).getTime() / 1000);
    const endTs = Math.floor(new Date(endISO).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);

    if (startTs <= now) {
      setFormError("Start date must be in the future");
      return false;
    }
    if (endTs <= startTs) {
      setFormError("End date must be after the start date");
      return false;
    }

    return true;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const startTs = Math.floor(new Date(startISO).getTime() / 1000);
    const endTs = Math.floor(new Date(endISO).getTime() / 1000);
    const feeBigInt = parseUnits(entryFee, 18);

    console.log("=== Creating Event ===");
    console.log("Event Name:", eventName.trim());
    console.log(
      "Start Timestamp:",
      startTs,
      new Date(startTs * 1000).toISOString(),
    );
    console.log("End Timestamp:", endTs, new Date(endTs * 1000).toISOString());
    console.log("Entry Fee (wei):", feeBigInt.toString());
    console.log("Scoring Rule:", scoringRule);
    console.log("Contract Address:", EVENT_MANAGER);
    console.log("Function: createPublicEvent");
    console.log("Args:", [
      eventName.trim(),
      BigInt(startTs),
      BigInt(endTs),
      feeBigInt,
      scoringRule,
    ]);

    writeContract({
      address: EVENT_MANAGER,
      abi: ABI,
      functionName: "createPublicEvent",
      args: [
        eventName.trim(),
        BigInt(startTs),
        BigInt(endTs),
        feeBigInt,
        scoringRule,
      ],
    });
  };

  const displayError =
    formError ?? (writeError ? parseWriteError(writeError) : null);

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!isConnected)
    return (
      <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto bg-gray-800/40 border border-gray-700/50 rounded-2xl p-10">
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-white mb-3">Admin Access</h2>
            <p className="text-gray-400 mb-6">
              Connect your admin wallet to create events
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

  if (address?.toLowerCase() !== ADMIN.toLowerCase())
    return (
      <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto bg-red-900/20 border border-red-900/50 rounded-2xl p-10">
            <div className="text-5xl mb-4">🚫</div>
            <h2 className="text-red-400 font-bold text-xl mb-4">
              Unauthorized
            </h2>
            <p className="text-gray-400 text-sm mb-2">Connected as:</p>
            <code className="text-gray-500 text-xs break-all block mb-4">
              {address}
            </code>
            <p className="text-gray-500 text-sm">
              Only the contract owner can create events.
            </p>
            <p className="text-gray-600 text-xs mt-2 break-all">
              Owner: {ADMIN}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );

  if (txHash)
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
              Transaction submitted to Celo Sepolia
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Check the transaction on Blockscout to confirm it was mined
            </p>
            {txHash && (
              <a
                href={`https://celo-sepolia.blockscout.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-orange-400 hover:text-orange-300 transition break-all block mb-6 font-mono"
              >
                {txHash}
              </a>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/events")}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                View Events →
              </button>
              <button
                onClick={() => {
                  setEventName("");
                  setStartDateVal("");
                  setStartTimeVal("09:00");
                  setEndDateVal("");
                  setEndTimeVal("23:00");
                  setEntryFee("1");
                  setScoringRule(2);
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

  // ── Main form ────────────────────────────────────────────────────────────────

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            Create Public Event
          </h1>
          <p className="text-gray-400 text-sm">
            Admin only · Calls{" "}
            <code className="text-orange-400">createPublicEvent</code> on Celo
            Sepolia
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8">
          <form onSubmit={handleCreate} className="space-y-6">
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
                placeholder="e.g. Premier League Week 10"
                disabled={busy}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                {eventName.length}/64 characters
              </p>
            </div>

            {/* Start Date + Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date & Time <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={startDateVal}
                  onChange={(e) => {
                    setStartDateVal(e.target.value);
                    setFormError(null);
                  }}
                  min={todayStr()}
                  disabled={busy}
                  className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition [color-scheme:dark]"
                />
                <input
                  type="time"
                  value={startTimeVal}
                  onChange={(e) => {
                    setStartTimeVal(e.target.value);
                    setFormError(null);
                  }}
                  disabled={busy}
                  className="w-32 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition [color-scheme:dark]"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Users can join before this time
              </p>
            </div>

            {/* End Date + Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date & Time <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={endDateVal}
                  onChange={(e) => {
                    setEndDateVal(e.target.value);
                    setFormError(null);
                  }}
                  min={startDateVal || todayStr()}
                  disabled={busy}
                  className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition [color-scheme:dark]"
                />
                <input
                  type="time"
                  value={endTimeVal}
                  onChange={(e) => {
                    setEndTimeVal(e.target.value);
                    setFormError(null);
                  }}
                  disabled={busy}
                  className="w-32 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition [color-scheme:dark]"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                All matches must finish before this time
              </p>
            </div>

            {/* Entry Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entry Fee (cUSD) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  min={1}
                  step={0.5}
                  disabled={busy}
                  className="w-full pl-8 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum 1 cUSD · ONE-TIME per user
              </p>
            </div>

            {/* Scoring Rule */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Scoring Rule
              </label>
              <div className="space-y-2">
                {SCORING_RULES.map((rule) => (
                  <label
                    key={rule.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      scoringRule === rule.value
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-gray-600 bg-gray-700/30 hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="scoringRule"
                      value={rule.value}
                      checked={scoringRule === rule.value}
                      onChange={() => setScoringRule(rule.value)}
                      disabled={busy}
                      className="accent-orange-500"
                    />
                    <div>
                      <p
                        className={`text-sm font-semibold ${scoringRule === rule.value ? "text-orange-400" : "text-white"}`}
                      >
                        {rule.label}
                      </p>
                      <p className="text-xs text-gray-400">{rule.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="text-gray-400 font-medium text-xs uppercase tracking-wider mb-2">
                Preview
              </p>
              <div className="flex justify-between">
                <span className="text-gray-500">Starts</span>
                <span className="text-white">
                  {startISO
                    ? new Date(startISO).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ends</span>
                <span className="text-white">
                  {endISO
                    ? new Date(endISO).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Entry Fee</span>
                <span className="text-orange-400 font-semibold">
                  {entryFee} cUSD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Max Points/Match</span>
                <span className="text-white">
                  {scoringRule === 0
                    ? "5 pts"
                    : scoringRule === 1
                      ? "3 pts"
                      : "8 pts"}
                </span>
              </div>
            </div>

            {/* Error */}
            {displayError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{displayError}</span>
              </div>
            )}

            {/* Status */}
            {signing && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm text-center">
                ⏳ Waiting for wallet confirmation…
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
                  Confirm in wallet…
                </>
              ) : (
                "Create Event On-Chain"
              )}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── Config ───────────────────────────────────────────────────────────────────

const ADMIN = "0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b";

// Token options on Celo Sepolia
const TOKENS = [
  {
    value: "native",
    label: "CELO",
    symbol: "CELO",
  },
  {
    value: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    label: "cUSD",
    symbol: "cUSD",
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
  const [entryToken, setEntryToken] = useState<string>(TOKENS[0].value);
  const [scoringRule, setScoringRule] = useState(2);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

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

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    const startTs = Math.floor(new Date(startISO).getTime() / 1000);
    const endTs = Math.floor(new Date(endISO).getTime() / 1000);

    console.log("=== Creating Event via Backend ===");
    console.log("Event Name:", eventName.trim());
    console.log(
      "Start Timestamp:",
      startTs,
      new Date(startTs * 1000).toISOString(),
    );
    console.log("End Timestamp:", endTs, new Date(endTs * 1000).toISOString());
    console.log("Entry Token:", entryToken);
    console.log("Entry Fee:", entryFee);
    console.log("Scoring Rule:", scoringRule);

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: eventName.trim(),
            startDate: startTs,
            endDate: endTs,
            entryToken,
            entryFee,
            scoringRule,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        setFormError(error.message || "Failed to create event");
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      console.log("✅ Event created successfully:", result);
      setSuccessTxHash(result.transactionHash);

      // Show success screen
      setEventName("");
      setStartDateVal("");
      setEndDateVal("");
      setEntryFee("1");
      setScoringRule(2);

      // Redirect to events page after 2 seconds
      setTimeout(() => router.push("/events"), 2000);
    } catch (error) {
      console.error("❌ Error creating event:", error);
      setFormError("Failed to create event. Check console for details.");
      setIsLoading(false);
    }
  };

  const displayError = formError;
  const busy = isLoading;

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!isConnected)
    return (
      <div className="relative pt-20 min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900">
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
              className="bg-linear-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 px-8 rounded-lg hover:from-orange-600 hover:to-yellow-600 transition"
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
      <div className="relative pt-20 min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900">
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

  if (successTxHash)
    return (
      <div className="relative pt-20 min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900">
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
            {successTxHash && (
              <a
                href={`https://celo-sepolia.blockscout.com/tx/${successTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-orange-400 hover:text-orange-300 transition break-all block mb-6 font-mono"
              >
                {successTxHash}
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
                  setSuccessTxHash(null);
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
    <div className="relative pt-20 min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900">
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
                  className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition scheme-dark"
                />
                <input
                  type="time"
                  value={startTimeVal}
                  onChange={(e) => {
                    setStartTimeVal(e.target.value);
                    setFormError(null);
                  }}
                  disabled={busy}
                  className="w-32 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition scheme-dark"
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
                  className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition scheme-dark"
                />
                <input
                  type="time"
                  value={endTimeVal}
                  onChange={(e) => {
                    setEndTimeVal(e.target.value);
                    setFormError(null);
                  }}
                  disabled={busy}
                  className="w-32 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition scheme-dark"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                All matches must finish before this time
              </p>
            </div>

            {/* Entry Token */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Entry Token <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {TOKENS.map((token) => (
                  <label
                    key={token.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      entryToken === token.value
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-gray-600 bg-gray-700/30 hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="entryToken"
                      value={token.value}
                      checked={entryToken === token.value}
                      onChange={() => {
                        setEntryToken(token.value);
                        setFormError(null);
                      }}
                      disabled={busy}
                      className="accent-orange-500"
                    />
                    <div>
                      <p
                        className={`text-sm font-semibold ${entryToken === token.value ? "text-orange-400" : "text-white"}`}
                      >
                        {token.label}
                      </p>
                      <p className="text-xs text-gray-400">{token.symbol}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Entry Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entry Fee ({TOKENS.find((t) => t.value === entryToken)?.symbol}){" "}
                <span className="text-red-400">*</span>
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
                <span className="text-gray-500">Entry Token</span>
                <span className="text-orange-400 font-semibold">
                  {TOKENS.find((t) => t.value === entryToken)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Entry Fee</span>
                <span className="text-orange-400 font-semibold">
                  {entryFee}{" "}
                  {TOKENS.find((t) => t.value === entryToken)?.symbol}
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
            {busy && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm text-center">
                ⏳ Creating event…
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-linear-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                  Creating event…
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

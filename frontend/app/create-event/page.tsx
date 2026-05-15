"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Admin-only: owner address on Celo Sepolia
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

export default function CreateEventPage() {
  const router = useRouter();
  const { isConnected, address, connectWallet } = useWallet();

  const [eventName, setEventName] = useState("");
  const [startOffset, setStartOffset] = useState(60); // minutes from now
  const [durationDays, setDurationDays] = useState(7);
  const [entryFee, setEntryFee] = useState("1"); // cUSD
  const [scoringRule, setScoringRule] = useState(2); // 0=EXACT, 1=OUTCOME, 2=BOTH
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: pending, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!eventName.trim()) {
      setError("Event name is required");
      return;
    }
    const fee = parseFloat(entryFee);
    if (isNaN(fee) || fee < 1) {
      setError("Entry fee must be at least 1 cUSD");
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const startDate = now + startOffset * 60;
    const endDate = startDate + durationDays * 86400;
    const feeBigInt = BigInt(Math.round(fee * 1e18));

    writeContract({
      address: EVENT_MANAGER,
      abi: ABI,
      functionName: "createPublicEvent",
      args: [
        eventName.trim(),
        BigInt(startDate),
        BigInt(endDate),
        feeBigInt,
        scoringRule,
      ],
    });
  };

  if (!isConnected)
    return (
      <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto bg-gray-800/40 border border-gray-700/50 rounded-2xl p-10">
            <p className="text-gray-400 mb-6">
              Connect your admin wallet to create events
            </p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 px-8 rounded-lg"
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
            <h2 className="text-red-400 font-bold text-xl mb-4">
              Unauthorized
            </h2>
            <p className="text-gray-300 text-sm mb-2">Connected as:</p>
            <code className="text-gray-400 text-xs break-all">{address}</code>
            <p className="text-gray-500 text-sm mt-4">
              Only the contract owner can create events.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            Create Public Event
          </h1>
          <p className="text-gray-400">
            Admin only · Calls{" "}
            <code className="text-orange-400">createPublicEvent</code> on Celo
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-8">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-green-400 font-bold text-xl mb-2">
                Event Created!
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Transaction confirmed on Celo Sepolia
              </p>
              <button
                onClick={() => router.push("/events")}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg"
              >
                View Events →
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  maxLength={64}
                  placeholder="e.g. Premier League Week 10"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Starts in (minutes)
                  </label>
                  <input
                    type="number"
                    value={startOffset}
                    onChange={(e) => setStartOffset(Number(e.target.value))}
                    min={5}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Users can join before this
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    min={1}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Entry Fee (cUSD)
                </label>
                <input
                  type="number"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  min={1}
                  step={0.5}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scoring Rule
                </label>
                <select
                  value={scoringRule}
                  onChange={(e) => setScoringRule(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={0}>Exact Score Only (5 pts)</option>
                  <option value={1}>Outcome Only (3 pts)</option>
                  <option value={2}>
                    Both — Score + Outcome (up to 8 pts)
                  </option>
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
              >
                {pending ? "Waiting for wallet…" : "Create Event On-Chain"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

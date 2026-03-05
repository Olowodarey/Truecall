"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openContractCall } from "@stacks/connect";
import { STACKS_TESTNET } from "@stacks/network";
import { uintCV, stringAsciiCV, boolCV } from "@stacks/transactions";
import { CONTRACTS, HIRO_API, DEPLOYER } from "@/lib/contracts";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const [pmAddr, pmName] = CONTRACTS.PREDICTION_MARKET.split(".");

export default function CreateEventPage() {
  const router = useRouter();
  const { isConnected, connectWallet, userAddress } = useWallet();

  // Form state
  const [title, setTitle] = useState("");
  const [closeBlockOffset, setCloseBlockOffset] = useState(144); // ~24h of blocks
  const [entryFeeStx, setEntryFeeStx] = useState(1); // STX
  const [useSbtc, setUseSbtc] = useState(false);
  const [daoApproved, setDaoApproved] = useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Event title is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Fetch current block height to compute close-block
      const resp = await fetch(`${HIRO_API}/v2/info`);
      const info = await resp.json();
      const currentBlock = info.stacks_tip_height ?? 0;
      const closeBlock = currentBlock + closeBlockOffset;
      const entryFeeMicro = Math.round(entryFeeStx * 1_000_000);

      await openContractCall({
        contractAddress: pmAddr,
        contractName: pmName,
        functionName: "create-event",
        functionArgs: [
          stringAsciiCV(title.trim().slice(0, 64)),
          boolCV(daoApproved),
          uintCV(closeBlock),
          uintCV(entryFeeMicro),
          boolCV(useSbtc),
        ],
        network: STACKS_TESTNET,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        anchorMode: 3, // AnchorMode.Any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postConditionMode: 1, // PostConditionMode.Allow
        appDetails: { name: "TrueCall", icon: "/favicon.ico" },
        onFinish: (data: any) => {
          console.log("create-event tx:", data.txId);
          setSuccess(true);
          setTimeout(() => router.push("/events"), 2500);
        },
        onCancel: () => {
          setCreating(false);
          setError("Transaction cancelled");
        },
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to create event");
      setCreating(false);
    }
  };

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="absolute inset-0 w-full h-full z-0 opacity-10">
        <svg
          className="w-full h-full"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M100,200 Q300,100 500,200 T900,200"
            stroke="url(#g)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M200,500 Q400,350 700,500 T1000,450"
            stroke="url(#g)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-3">
              Create Prediction Event
            </h1>
            <p className="text-gray-300">
              Admin-only · Calls{" "}
              <code className="text-orange-400">create-event</code> on-chain
            </p>
          </div>

          {!isConnected ? (
            <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
              <p className="text-gray-400 mb-4">
                Connect your admin wallet to create events
              </p>
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 px-8 rounded-lg"
              >
                Connect Wallet
              </button>
            </div>
          ) : userAddress !== DEPLOYER ? (
            <div className="text-center py-16 bg-red-900/20 rounded-xl border border-red-900/50">
              <h2 className="text-red-400 font-bold text-xl mb-4">
                Unauthorized Address
              </h2>
              <p className="text-gray-300 mb-6">
                You are connected as{" "}
                <code className="bg-black/30 px-2 py-1 rounded text-sm text-gray-400">
                  {userAddress}
                </code>
                .
                <br />
                <br />
                Only the contract deployer can create events on-chain:
                <br />
                <code className="bg-black/30 px-2 py-1 rounded text-orange-400 text-sm mt-2 inline-block">
                  {DEPLOYER}
                </code>
              </p>
              <button
                onClick={connectWallet}
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-lg border border-gray-600 transistion-colors"
              >
                Switch Account in Wallet
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 space-y-6"
            >
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={creating}
                  maxLength={64}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                  placeholder="e.g., BTC Q1 2025 Price Race"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {title.length}/64 characters
                </p>
              </div>

              {/* Close Block Offset */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (blocks) · ~
                  {Math.round((closeBlockOffset * 10) / 60)}min at 10 blocks/min
                </label>
                <input
                  type="number"
                  value={closeBlockOffset}
                  onChange={(e) => setCloseBlockOffset(Number(e.target.value))}
                  disabled={creating}
                  min={10}
                  max={52560}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                />
              </div>

              {/* Entry Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Entry Fee ({useSbtc ? "sats" : "STX"})
                </label>
                <input
                  type="number"
                  value={entryFeeStx}
                  onChange={(e) => setEntryFeeStx(Number(e.target.value))}
                  disabled={creating}
                  min={0}
                  step={useSbtc ? 1000 : 0.1}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSbtc}
                    onChange={(e) => setUseSbtc(e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-gray-300 text-sm">Use sBTC</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={daoApproved}
                    onChange={(e) => setDaoApproved(e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-gray-300 text-sm">DAO Approved</span>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                  Event created on-chain! Redirecting to events page…
                </div>
              )}

              <button
                id="create-event-submit"
                type="submit"
                disabled={creating || !title.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Waiting for wallet…" : "Create Event On-Chain"}
              </button>
            </form>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

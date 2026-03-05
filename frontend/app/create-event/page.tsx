"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { openContractCall } from "@stacks/connect";
import { STACKS_TESTNET } from "@stacks/network";
import { uintCV, stringAsciiCV, boolCV } from "@stacks/transactions";
import { CONTRACTS, HIRO_API, DEPLOYER } from "@/lib/contracts";
import { useWallet } from "@/contexts/WalletContext";
import {
  getAllEvents,
  getMarketsForEvent,
  proposeResult,
  overrideResult,
  closeEvent,
} from "@/lib/stacks";
import type { ChainEvent, ChainMarket } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const [pmAddr, pmName] = CONTRACTS.PREDICTION_MARKET.split(".");

export default function CreateEventPage() {
  const router = useRouter();
  const { isConnected, connectWallet, userAddress } = useWallet();

  // Admin Tabs
  const [activeTab, setActiveTab] = useState<
    "create-event" | "add-market" | "manage-markets"
  >("create-event");
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [eventMarkets, setEventMarkets] = useState<
    Record<number, ChainMarket[]>
  >({});
  const [currentBlock, setCurrentBlock] = useState(0);
  const [oracleContract, setOracleContract] = useState(
    "STWJM45K4YAEZJ6H6HFT1GABBD6EVDV5MGEV7ECA.mock-pyth",
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Form state - Create Event
  const [title, setTitle] = useState("");
  const [closeBlockOffset, setCloseBlockOffset] = useState(144); // ~24h of blocks
  const [entryFeeStx, setEntryFeeStx] = useState(1); // STX
  const [useSbtc, setUseSbtc] = useState(false);
  const [daoApproved, setDaoApproved] = useState(false);

  // Form state - Add Market
  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [marketQuestion, setMarketQuestion] = useState("");
  const [marketTargetPrice, setMarketTargetPrice] = useState<number>(100000); // USD Cents

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isConnected && userAddress === DEPLOYER) {
      // Fetch events + current block
      getAllEvents()
        .then((evs) => {
          setEvents(evs);
          // Also load markets per event for the Manage tab
          const allMarkets: Record<number, ChainMarket[]> = {};
          Promise.all(
            evs.map(async (ev) => {
              allMarkets[ev.id] = await getMarketsForEvent(ev.id);
            }),
          ).then(() => setEventMarkets({ ...allMarkets }));
        })
        .catch(console.error);

      fetch(`${HIRO_API}/v2/info`)
        .then((r) => r.json())
        .then((info) => setCurrentBlock(info.stacks_tip_height ?? 0))
        .catch(console.error);
    }
  }, [isConnected, userAddress]);

  const handleCreateEvent = async (e: React.FormEvent) => {
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

  const handleAddMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketQuestion.trim() || selectedEventId === 0) {
      setError("Event and question are required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await openContractCall({
        contractAddress: pmAddr,
        contractName: pmName,
        functionName: "add-market",
        functionArgs: [
          uintCV(selectedEventId),
          stringAsciiCV(marketQuestion.trim().slice(0, 128)),
          uintCV(marketTargetPrice),
        ],
        network: STACKS_TESTNET,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        anchorMode: 3, // AnchorMode.Any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postConditionMode: 1, // PostConditionMode.Allow
        appDetails: { name: "TrueCall", icon: "/favicon.ico" },
        onFinish: (data: any) => {
          console.log("add-market tx:", data.txId);
          setSuccess(true);
          setTimeout(() => router.push("/events"), 2500);
        },
        onCancel: () => {
          setCreating(false);
          setError("Transaction cancelled");
        },
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to add market");
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
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
              <div className="flex border-b border-gray-700">
                <button
                  onClick={() => setActiveTab("create-event")}
                  className={`flex-1 py-4 text-center font-semibold transition-colors ${
                    activeTab === "create-event"
                      ? "bg-gray-700/50 text-white border-b-2 border-orange-500"
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
                  }`}
                >
                  Create Event
                </button>
                <button
                  onClick={() => setActiveTab("add-market")}
                  className={`flex-1 py-4 text-center font-semibold transition-colors ${
                    activeTab === "add-market"
                      ? "bg-gray-700/50 text-white border-b-2 border-orange-500"
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
                  }`}
                >
                  Add Market
                </button>
                <button
                  onClick={() => setActiveTab("manage-markets")}
                  className={`flex-1 py-4 text-center font-semibold transition-colors ${
                    activeTab === "manage-markets"
                      ? "bg-gray-700/50 text-white border-b-2 border-orange-500"
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
                  }`}
                >
                  Manage Markets
                </button>
              </div>

              <div className="p-8">
                {activeTab === "create-event" ? (
                  <form onSubmit={handleCreateEvent} className="space-y-6">
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
                        {Math.round((closeBlockOffset * 10) / 60)}min at 10
                        blocks/min
                      </label>
                      <input
                        type="number"
                        value={closeBlockOffset}
                        onChange={(e) =>
                          setCloseBlockOffset(Number(e.target.value))
                        }
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
                        <span className="text-gray-300 text-sm">
                          DAO Approved
                        </span>
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
                      {creating
                        ? "Waiting for wallet…"
                        : "Create Event On-Chain"}
                    </button>
                  </form>
                ) : activeTab === "add-market" ? (
                  <form onSubmit={handleAddMarket} className="space-y-6">
                    {/* Event Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Select Event *
                      </label>
                      <select
                        value={selectedEventId}
                        onChange={(e) =>
                          setSelectedEventId(Number(e.target.value))
                        }
                        disabled={creating || events.length === 0}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      >
                        <option value={0} disabled>
                          -- Choose an Event --
                        </option>
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            #{ev.id} | {ev.title} ({ev.finalizedMarketCount}/
                            {ev.marketCount} markets)
                          </option>
                        ))}
                      </select>
                      {events.length === 0 && (
                        <p className="text-xs text-orange-400 mt-2">
                          Loading events... (make sure you have created one)
                        </p>
                      )}
                    </div>

                    {/* Market Question */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Market Question * (Binary YES/NO)
                      </label>
                      <input
                        type="text"
                        value={marketQuestion}
                        onChange={(e) => setMarketQuestion(e.target.value)}
                        disabled={creating}
                        maxLength={128}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        placeholder="e.g., Will BTC be above $100k by close?"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {marketQuestion.length}/128 characters
                      </p>
                    </div>

                    {/* Target Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Target BTC Price (USD Cents)
                      </label>
                      <input
                        type="number"
                        value={marketTargetPrice}
                        onChange={(e) =>
                          setMarketTargetPrice(Number(e.target.value))
                        }
                        disabled={creating}
                        min={0}
                        step={1}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Example: 10000000 = $100,000.00
                      </p>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                        Market transaction sent! Redirecting…
                      </div>
                    )}

                    <button
                      id="add-market-submit"
                      type="submit"
                      disabled={
                        creating ||
                        !marketQuestion.trim() ||
                        selectedEventId === 0
                      }
                      className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? "Waiting for wallet…" : "Add Market To Event"}
                    </button>
                  </form>
                ) : activeTab === "manage-markets" ? (
                  <div className="space-y-6">
                    {/* Oracle contract input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Oracle Contract (for Propose Result)
                      </label>
                      <input
                        type="text"
                        value={oracleContract}
                        onChange={(e) => setOracleContract(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="ADDR.contract-name"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Current block: #{currentBlock}
                      </p>
                    </div>

                    {events.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">
                        No events on-chain yet.
                      </p>
                    ) : (
                      events.map((event) => {
                        const mks = eventMarkets[event.id] ?? [];
                        const allFinal =
                          event.marketCount > 0 &&
                          event.finalizedMarketCount === event.marketCount;
                        return (
                          <div
                            key={event.id}
                            className="border border-gray-700 rounded-xl p-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-semibold text-white">
                                  {event.title}
                                  <span className="text-gray-500 text-xs ml-2">#{event.id}</span>
                                </p>
                                <p className="text-xs text-gray-400">
                                  {event.finalizedMarketCount}/{event.marketCount} finalized
                                  {" · "}closes #{event.closeBlock}
                                  {" · "}
                                  <span className={event.isActive ? "text-green-400" : "text-gray-500"}>
                                    {event.isActive ? "OPEN" : "CLOSED"}
                                  </span>
                                </p>
                              </div>
                              {/* Close Event button */}
                              {event.isActive && allFinal && (
                                <button
                                  disabled={pendingAction === `close-${event.id}`}
                                  onClick={async () => {
                                    setPendingAction(`close-${event.id}`);
                                    await closeEvent(event.id, {
                                      onFinish: () => {
                                        setPendingAction(null);
                                        getAllEvents().then((evs) => setEvents(evs)).catch(console.error);
                                      },
                                      onCancel: () => setPendingAction(null),
                                    });
                                  }}
                                  className="ml-3 text-xs px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50 shrink-0"
                                >
                                  {pendingAction === `close-${event.id}` ? "Wait…" : "🔒 Close Event"}
                                </button>
                              )}
                            </div>

                            {mks.length === 0 ? (
                              <p className="text-xs text-gray-500 pl-1">No markets yet.</p>
                            ) : (
                              <ul className="space-y-2">
                                {mks.map((market) => (
                                  <li
                                    key={market.id}
                                    className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2 text-sm gap-3"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white truncate">{market.question}</p>
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        <span
                                          className={
                                            market.status === "open" ? "text-green-400"
                                            : market.status === "pending" ? "text-yellow-400"
                                            : market.status === "disputed" ? "text-red-400"
                                            : "text-blue-400"
                                          }
                                        >
                                          {market.status}
                                        </span>
                                        {" · "}Close #{market.closeBlock}
                                      </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      {market.status === "open" && currentBlock >= market.closeBlock && (
                                        <button
                                          disabled={pendingAction === `propose-${market.id}`}
                                          onClick={async () => {
                                            setPendingAction(`propose-${market.id}`);
                                            await proposeResult(market.id, oracleContract, {
                                              onFinish: () => setPendingAction(null),
                                              onCancel: () => setPendingAction(null),
                                            });
                                          }}
                                          className="text-xs px-2 py-1 rounded bg-orange-500/10 border border-orange-500/40 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition whitespace-nowrap"
                                        >
                                          {pendingAction === `propose-${market.id}` ? "Wait…" : "Propose Result"}
                                        </button>
                                      )}
                                      {market.status === "disputed" && (
                                        <button
                                          disabled={pendingAction === `override-${market.id}`}
                                          onClick={async () => {
                                            setPendingAction(`override-${market.id}`);
                                            await overrideResult(market.id, {
                                              onFinish: () => setPendingAction(null),
                                              onCancel: () => setPendingAction(null),
                                            });
                                          }}
                                          className="text-xs px-2 py-1 rounded bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition whitespace-nowrap"
                                        >
                                          {pendingAction === `override-${market.id}` ? "Wait…" : "Override Result"}
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { openContractCall } from "@stacks/connect";
import { HIRO_API, DEPLOYER } from "@/lib/contracts";
import { useWallet } from "@/contexts/WalletContext";
import {
  getAllEvents,
  getQuestionsForEvent,
  createEventTxOptions,
  addQuestionTxOptions,
  closeEventTxOptions,
  finalizeQuestionTxOptions,
  pushPythPriceTxOptions,
} from "@/lib/stacks";
import type { ChainEvent, ChainQuestion } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CreateEventPage() {
  const router = useRouter();
  const { isConnected, connectWallet, userAddress } = useWallet();

  // Admin Tabs
  const [activeTab, setActiveTab] = useState<
    "create-event" | "add-question" | "manage-questions"
  >("create-event");
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [eventQuestions, setEventQuestions] = useState<
    Record<number, ChainQuestion[]>
  >({});
  const [currentBlock, setCurrentBlock] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Form state - Create Event
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(1440); // default 24 hours (1440 minutes)
  const [entryFeeStx, setEntryFeeStx] = useState(1); // STX

  // Form state - Add Question
  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [marketQuestion, setMarketQuestion] = useState("");
  const [marketTargetPrice, setMarketTargetPrice] = useState<number>(100000); // USD
  const [questionDurationMinutes, setQuestionDurationMinutes] = useState(1440);

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
          const allQuestions: Record<number, ChainQuestion[]> = {};
          Promise.all(
            evs.map(async (ev) => {
              allQuestions[ev.id] = await getQuestionsForEvent(ev.id);
            }),
          ).then(() => setEventQuestions({ ...allQuestions }));
        })
        .catch(console.error);

      fetch(`${HIRO_API}/v2/info`)
        .then((r) => r.json())
        .then((info) => setCurrentBlock(info.burn_block_height ?? 0))
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
      // Fetch current block height to compute blocks
      const resp = await fetch(`${HIRO_API}/v2/info`);
      const info = await resp.json();
      const currentBlock = info.burn_block_height ?? 0;
      const startBlock = currentBlock;
      // 1 Bitcoin block = ~10 minutes
      const blocksToAdd = Math.ceil(durationMinutes / 10);
      const endBlock = currentBlock + blocksToAdd;
      const entryFeeMicro = Math.round(entryFeeStx * 1_000_000);

      await openContractCall({
        ...createEventTxOptions(
          title.trim().slice(0, 64),
          startBlock,
          endBlock,
          entryFeeMicro
        ),
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

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketQuestion.trim() || selectedEventId === 0) {
      setError("Event and question are required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const event = events.find((e) => e.id === selectedEventId);
      if (!event) {
        setError("Selected event not found in current list.");
        setCreating(false);
        return;
      }

      const resp = await fetch(`${HIRO_API}/v2/info`);
      const info = await resp.json();
      const currentBlock = info.burn_block_height ?? 0;
      
      if (currentBlock >= event.endBlock) {
        setError(`Event #${event.id} has already ended at block ${event.endBlock}.`);
        setCreating(false);
        return;
      }

      // 1 Bitcoin block = ~10 minutes
      const blocksToAdd = Math.ceil(questionDurationMinutes / 10);
      const maxAllowedBlocks = event.endBlock - currentBlock;
      
      if (blocksToAdd > maxAllowedBlocks) {
        const maxMins = maxAllowedBlocks * 10;
        setError(`Question duration exceeds the event's remaining time. Max allowed is ${maxMins} minute(s).`);
        setCreating(false);
        return;
      }
      
      const closeBlock = currentBlock + blocksToAdd;
      
      // Ensure the string is strictly ASCII to prevent contract errors
      const asciiTrimmedQuestion = marketQuestion
        .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters like special symbols or emojis
        .trim()
        .slice(0, 128); // 128-byte limit

      await openContractCall({
        ...addQuestionTxOptions(
          selectedEventId,
          asciiTrimmedQuestion,
          marketTargetPrice,
          closeBlock
        ),
        appDetails: { name: "TrueCall", icon: "/favicon.ico" },
        onFinish: (data: any) => {
          console.log("add-question tx:", data.txId);
          setSuccess(true);
          setTimeout(() => router.push("/events"), 2500);
        },
        onCancel: () => {
          setCreating(false);
          setError("Transaction cancelled");
        },
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to add question");
      setCreating(false);
    }
  };

  // BTC/USD price feed id on Pyth
  const PYTH_BTC_FEED_ID =
    "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

  const handlePushPrice = async (questionId: number) => {
    const key = `push-${questionId}`;
    setPendingAction(key);
    setError(null);
    try {
      // 1. Fetch a fresh signed price update (PNAU) from Pyth Hermes v2
      //    The v2 endpoint returns binary data[] in base64 encoding.
      const hermesUrl =
        `https://hermes.pyth.network/v2/updates/price/latest` +
        `?ids[]=${PYTH_BTC_FEED_ID}&encoding=base64`;
      const hermesRes = await fetch(hermesUrl);
      if (!hermesRes.ok)
        throw new Error(`Hermes API error: ${hermesRes.status} ${hermesRes.statusText}`);
      const hermesData = await hermesRes.json();

      // v2 response: { binary: { encoding: "base64", data: ["..."] }, parsed: [...] }
      const b64Raw: string | undefined = hermesData?.binary?.data?.[0];
      if (!b64Raw) throw new Error("No price update data returned from Hermes.");

      // Log the live BTC price so admin can see it in the console
      const parsedPrice = hermesData?.parsed?.[0]?.price;
      if (parsedPrice) {
        const usd = Number(parsedPrice.price) / Math.pow(10, -parsedPrice.expo);
        console.log(`[TrueCall] Live BTC price from Pyth: $${usd.toFixed(2)}`);
      }

      // 2. Decode base64 → Uint8Array
      //    Hermes returns URL-safe base64 (uses - and _ instead of + and /).
      //    Standard atob() ONLY handles standard base64, so we must convert first.
      const b64Standard = b64Raw
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const binaryStr = atob(b64Standard);
      const vaaBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        vaaBytes[i] = binaryStr.charCodeAt(i);
      }

      console.log(`[TrueCall] VAA bytes length: ${vaaBytes.length}`);

      // 3. Call pyth-oracle-v4 on-chain directly (1 uSTX Pyth fee applies)
      await openContractCall({
        ...pushPythPriceTxOptions(vaaBytes),
        appDetails: { name: "TrueCall", icon: "/favicon.ico" },
        onFinish: () => {
          setPendingAction(null);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 5000);
        },
        onCancel: () => setPendingAction(null),
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to push Pyth price");
      setPendingAction(null);
    }
  };

  const handleFinalize = async (questionId: number) => {
    const key = `finalize-${questionId}`;
    setPendingAction(key);
    setError(null);
    try {
      // Simply call our truecall-v2 contract to read the price and finalize
      await openContractCall({
        ...finalizeQuestionTxOptions(questionId),
        appDetails: { name: "TrueCall", icon: "/favicon.ico" },
        onFinish: async () => {
          setPendingAction(null);
          // Refresh questions + events
          const allQuestions: Record<number, ChainQuestion[]> = { ...eventQuestions };
          await Promise.all(
            events.map(async (ev) => {
              allQuestions[ev.id] = await getQuestionsForEvent(ev.id);
            })
          );
          setEventQuestions({ ...allQuestions });
          const refreshed = await getAllEvents();
          setEvents(refreshed);
        },
        onCancel: () => setPendingAction(null),
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to finalize question");
      setPendingAction(null);
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
                  onClick={() => setActiveTab("add-question")}
                  className={`flex-1 py-4 text-center font-semibold transition-colors ${
                    activeTab === "add-question"
                      ? "bg-gray-700/50 text-white border-b-2 border-orange-500"
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
                  }`}
                >
                  Add Question
                </button>
                <button
                  onClick={() => setActiveTab("manage-questions")}
                  className={`flex-1 py-4 text-center font-semibold transition-colors ${
                    activeTab === "manage-questions"
                      ? "bg-gray-700/50 text-white border-b-2 border-orange-500"
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
                  }`}
                >
                  Manage Questions
                </button>
              </div>

              <div className="p-8">
                {activeTab === "create-event" ? (
                  <form onSubmit={handleCreateEvent} className="space-y-6">
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
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        value={durationMinutes}
                        onChange={(e) =>
                          setDurationMinutes(Number(e.target.value))
                        }
                        disabled={creating}
                        min={0}
                        max={3153600}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Entry Fee (STX)
                      </label>
                      <input
                        type="number"
                        value={entryFeeStx}
                        onChange={(e) => setEntryFeeStx(Number(e.target.value))}
                        disabled={creating}
                        min={0}
                        step={0.1}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      />
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
                ) : activeTab === "add-question" ? (
                  <form onSubmit={handleAddQuestion} className="space-y-6">
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
                            #{ev.id} | {ev.title} ({ev.finalizedQuestionCount}/
                            {ev.questionCount} questions)
                          </option>
                        ))}
                      </select>
                    </div>

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
                        placeholder="e.g., Will BTC be at or above $100,000 when this question is resolved?"
                      />
                      <p className="text-xs text-orange-400/80 mt-2">
                        <strong>Standard Format:</strong> Will BTC be at or above $[Target] when this question is resolved?
                      </p>
                    </div>

                    {/* Target Price + Close Time — inline side-by-side row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Target Price (USD)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                          <input
                            type="number"
                            value={marketTargetPrice}
                            onChange={(e) =>
                              setMarketTargetPrice(Number(e.target.value))
                            }
                            disabled={creating}
                            min={0}
                            step={1}
                            className="w-full pl-7 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                            placeholder="100000"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          e.g. 100000 = $100,000
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Close Time (Minutes)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={questionDurationMinutes}
                            onChange={(e) =>
                              setQuestionDurationMinutes(Number(e.target.value))
                            }
                            disabled={creating}
                            min={10}
                            max={3153600}
                            step={10}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 pr-16"
                            placeholder="1440"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
                            min
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          ≈ {Math.ceil(questionDurationMinutes / 10)} BTC block{Math.ceil(questionDurationMinutes / 10) !== 1 ? "s" : ""} from now
                          {currentBlock > 0 && (
                            <span className="text-orange-400/70 ml-1">
                              (close block ~{currentBlock + Math.ceil(questionDurationMinutes / 10)})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                        Question transaction sent! Redirecting…
                      </div>
                    )}

                    <button
                      id="add-question-submit"
                      type="submit"
                      disabled={
                        creating ||
                        !marketQuestion.trim() ||
                        selectedEventId === 0
                      }
                      className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? "Waiting for wallet…" : "Add Question To Event"}
                    </button>
                  </form>
                ) : activeTab === "manage-questions" ? (
                  <div className="space-y-6">
                    {events.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">
                        No events on-chain yet.
                      </p>
                    ) : (
                      events.map((event) => {
                        const mks = eventQuestions[event.id] ?? [];
                        const allFinal =
                          event.questionCount > 0 &&
                          event.finalizedQuestionCount === event.questionCount;
                        return (
                          <div
                            key={event.id}
                            className="border border-gray-700 rounded-xl p-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-semibold text-white">
                                  {event.title}
                                  <span className="text-gray-500 text-xs ml-2">
                                    #{event.id}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-400">
                                  {event.finalizedQuestionCount}/
                                  {event.questionCount} finalized
                                  {" · "}closes #{event.endBlock}
                                  {" · "}
                                  <span
                                    className={
                                      event.isActive
                                        ? "text-green-400"
                                        : "text-gray-500"
                                    }
                                  >
                                    {event.isActive ? "OPEN" : "CLOSED"}
                                  </span>
                                </p>
                              </div>
                              {event.isActive && allFinal && (
                                <button
                                  disabled={
                                    pendingAction === `close-${event.id}`
                                  }
                                  onClick={async () => {
                                    setPendingAction(`close-${event.id}`);
                                    await openContractCall({
                                      ...closeEventTxOptions(event.id),
                                      onFinish: () => {
                                        setPendingAction(null);
                                        getAllEvents()
                                          .then((evs) => setEvents(evs))
                                          .catch(console.error);
                                      },
                                      onCancel: () => setPendingAction(null),
                                    });
                                  }}
                                  className="ml-3 text-xs px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50 shrink-0"
                                >
                                  {pendingAction === `close-${event.id}`
                                    ? "Wait…"
                                    : "🔒 Close Event"}
                                </button>
                              )}
                            </div>

                            {mks.length === 0 ? (
                              <p className="text-xs text-gray-500 pl-1">
                                No questions yet.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {mks.map((question) => {
                                  const isPastClose =
                                    currentBlock > 0 &&
                                    currentBlock >= question.closeBlock;
                                  const canFinalize =
                                    question.status === "open" && isPastClose;
                                  const isFinalizing =
                                    pendingAction === `finalize-${question.id}`;

                                  return (
                                    <li
                                      key={question.id}
                                      className="flex items-start justify-between bg-gray-900/50 rounded-lg px-3 py-3 text-sm gap-3"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-white truncate font-medium">
                                          {question.question}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-2">
                                          <span
                                            className={
                                              question.status === "open"
                                                ? canFinalize
                                                  ? "text-yellow-400"
                                                  : "text-green-400"
                                                : "text-blue-400"
                                            }
                                          >
                                            {question.status === "open"
                                              ? canFinalize
                                                ? "⏰ Ready to Finalize"
                                                : "🟢 Open"
                                              : "✅ Final"}
                                          </span>
                                          <span>Close #{question.closeBlock}</span>
                                          {question.status === "final" && question.oraclePrice > 0 && (
                                            <span className="text-orange-400">
                                              Oracle: ${question.oraclePrice.toLocaleString()}
                                              {" · "}
                                              <span
                                                className={
                                                  question.finalOutcome
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                                }
                                              >
                                                {question.finalOutcome ? "YES ✓" : "NO ✗"}
                                              </span>
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                      <div className="flex flex-col gap-2 shrink-0 items-end">
                                        {canFinalize ? (
                                          <>
                                            <button
                                              disabled={pendingAction === `push-${question.id}`}
                                              onClick={() => handlePushPrice(question.id)}
                                              className="text-xs px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/40 text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-50"
                                            >
                                              {pendingAction === `push-${question.id}`
                                                ? "Pushing…"
                                                : "1. Push Oracle Price"}
                                            </button>
                                            <button
                                              disabled={isFinalizing}
                                              onClick={() => handleFinalize(question.id)}
                                              className="text-xs px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/40 text-orange-400 hover:bg-orange-500/20 transition disabled:opacity-50"
                                            >
                                              {isFinalizing
                                                ? "Finalizing…"
                                                : "2. Finalize Question"}
                                            </button>
                                          </>
                                        ) : question.status === "final" ? (
                                          <span className="text-xs text-blue-400/70 italic">Finalized</span>
                                        ) : (
                                          <span className="text-xs text-gray-500 italic">Awaiting close</span>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
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

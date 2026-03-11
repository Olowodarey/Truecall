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
  const [durationHours, setDurationHours] = useState(24); // default 24 hours
  const [entryFeeStx, setEntryFeeStx] = useState(1); // STX

  // Form state - Add Question
  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [marketQuestion, setMarketQuestion] = useState("");
  const [marketTargetPrice, setMarketTargetPrice] = useState<number>(100000); // USD
  const [questionDurationHours, setQuestionDurationHours] = useState(24);

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
      // Fetch current block height to compute blocks
      const resp = await fetch(`${HIRO_API}/v2/info`);
      const info = await resp.json();
      const currentBlock = info.burn_block_height ?? 0;
      const startBlock = currentBlock;
      // 1 Bitcoin block = ~10 minutes, so 6 blocks per hour
      const blocksToAdd = Math.ceil(durationHours * 6);
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

      // 1 Bitcoin block = ~10 minutes, so 6 blocks per hour
      const blocksToAdd = Math.ceil(questionDurationHours * 6);
      const maxAllowedBlocks = event.endBlock - currentBlock;
      
      if (blocksToAdd > maxAllowedBlocks) {
        const maxHours = Math.floor(maxAllowedBlocks / 6);
        setError(`Question duration exceeds the event's remaining time. Max allowed is ${maxHours} hour(s).`);
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
                        Duration (Hours)
                      </label>
                      <input
                        type="number"
                        value={durationHours}
                        onChange={(e) =>
                          setDurationHours(Number(e.target.value))
                        }
                        disabled={creating}
                        min={1}
                        max={52560}
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
                        placeholder="e.g., Will BTC be above $100k by close?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Target BTC Price (Whole USD)
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
                        Example: 100000 = $100,000
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Question Duration (Hours)
                      </label>
                      <input
                        type="number"
                        value={questionDurationHours}
                        onChange={(e) =>
                          setQuestionDurationHours(Number(e.target.value))
                        }
                        disabled={creating}
                        min={1}
                        max={52560}
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
                                {mks.map((question) => (
                                  <li
                                    key={question.id}
                                    className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2 text-sm gap-3"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white truncate">
                                        {question.question}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        <span
                                          className={
                                            question.status === "open"
                                              ? "text-green-400"
                                              : "text-blue-400"
                                          }
                                        >
                                          {question.status}
                                        </span>
                                        {" · "}Close #{question.closeBlock}
                                      </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      <span className="text-xs text-gray-500 italic">VAA required to finalize</span>
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

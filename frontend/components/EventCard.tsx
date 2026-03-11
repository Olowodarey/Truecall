"use client";

import { useState, useEffect } from "react";
import type { ChainEvent, ChainQuestion, ChainParticipant } from "@/lib/types";
import { claimPointsTxOptions, claimWinningsTxOptions, joinEventTxOptions, getParticipant } from "@/lib/stacks";
import { openContractCall } from "@stacks/connect";

interface EventCardProps {
  event: ChainEvent;
  questions?: ChainQuestion[];
  currentBlock?: number;
  userAddress?: string | null;
  onJoinEvent: (event: ChainEvent) => void;
  onRefresh?: () => void;
}

export default function EventCard({
  event,
  questions,
  currentBlock = 0,
  userAddress,
  onJoinEvent, // this will now open the prediction modal!
  onRefresh,
}: EventCardProps) {
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [participant, setParticipant] = useState<ChainParticipant | null>(null);

  useEffect(() => {
    if (userAddress) {
      getParticipant(event.id, userAddress).then(setParticipant).catch(console.error);
    }
  }, [event.id, userAddress]);

  const isOpen = event.isActive;
  const statusLabel = event.isActive ? "OPEN" : "CLOSED";
  const statusColor = event.isActive
    ? "bg-green-500/20 text-green-400 border-green-500/50"
    : "bg-gray-500/20 text-gray-400 border-gray-500/50";

  const allFinalized =
    event.questionCount > 0 && event.finalizedQuestionCount === event.questionCount;
  const poolStx = (event.totalPool / 1_000_000).toFixed(2);
  const feeLabel = `${(event.entryFee / 1_000_000).toFixed(2)} STX`;

  const setBusy = (key: string, v: boolean) =>
    setPending((p) => ({ ...p, [key]: v }));

  const handleJoin = async () => {
    if (!userAddress) return;
    const key = `join-${event.id}`;
    setBusy(key, true);
    await openContractCall({
      ...joinEventTxOptions(event.id),
      onFinish: () => {
        setBusy(key, false);
        onRefresh?.();
      },
      onCancel: () => setBusy(key, false),
    });
  };

  const handleClaimPoints = async (questionId: number) => {
    const key = `points-${questionId}`;
    setBusy(key, true);
    await openContractCall({
      ...claimPointsTxOptions(questionId),
      onFinish: () => {
        setBusy(key, false);
        onRefresh?.();
      },
      onCancel: () => setBusy(key, false),
    });
  };

  const handleClaimWinnings = async () => {
    const key = `winnings-${event.id}`;
    setBusy(key, true);
    await openContractCall({
        ...claimWinningsTxOptions(event.id),
        onFinish: () => {
          setBusy(key, false);
          onRefresh?.();
        },
        onCancel: () => setBusy(key, false),
    });
  };

  const getQuestionActions = (q: ChainQuestion) => {
    if (q.status === "final" && userAddress && participant?.joined) {
      return (
        <button
          disabled={!!pending[`points-${q.id}`]}
          onClick={() => handleClaimPoints(q.id)}
          className="mt-2 w-full text-xs py-1.5 px-3 rounded-md border border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-50"
        >
          {pending[`points-${q.id}`] ? "Waiting…" : "🏆 Claim Points"}
        </button>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-white truncate flex-1 pr-2">
          {event.title}
        </h3>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Entry Fee</p>
          <p className="text-white font-semibold">{feeLabel}</p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Prize Pool</p>
          <p className="text-orange-400 font-semibold">{poolStx} STX</p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Questions</p>
          <p className="text-white font-semibold">
            {event.finalizedQuestionCount}/{event.questionCount} finalized
          </p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Ends At Block</p>
          <p className="text-white font-semibold">#{event.endBlock}</p>
        </div>
      </div>

      {questions && questions.length > 0 && (
        <div className="mb-5">
          <h4 className="font-semibold text-orange-400 text-sm mb-2">
            Questions
          </h4>
          <ul className="space-y-2">
            {questions.map((q) => {
              const isQuestionOpen = q.status === "open";
              return (
                <li key={q.id}>
                  <div
                    className={`p-3 rounded-lg text-sm border transition-all ${
                      isQuestionOpen && isOpen
                        ? "border-orange-500/40 bg-orange-500/5"
                        : "border-gray-700/50 bg-gray-800/60"
                    }`}
                  >
                    <p className="font-medium text-white">{q.question}</p>
                    <div className="flex justify-between items-center mt-2 text-gray-400">
                      <span>Target: ${q.targetPrice.toLocaleString()}</span>
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full border text-xs ${
                          q.status === "open"
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                    {getQuestionActions(q)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isOpen && userAddress && !participant?.joined ? (
        <button
          id={`join-event-${event.id}`}
          disabled={!!pending[`join-${event.id}`]}
          onClick={handleJoin}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
        >
          {pending[`join-${event.id}`] ? "Waiting..." : `Join Event (${feeLabel})`}
        </button>
      ) : isOpen && userAddress && participant?.joined ? (
         <button
          onClick={() => onJoinEvent(event)}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/50"
        >
          Make Predictions →
        </button>
      ) : allFinalized && userAddress ? (
        <button
          id={`claim-winnings-${event.id}`}
          disabled={!!pending[`winnings-${event.id}`]}
          onClick={handleClaimWinnings}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
        >
          {pending[`winnings-${event.id}`]
            ? "Waiting for wallet…"
            : `🎉 Claim Winnings (STX)`}
        </button>
      ) : allFinalized ? (
        <div className="w-full bg-green-500/10 text-green-400 font-semibold py-3 px-6 rounded-lg text-center border border-green-500/30">
          Event Settled ✓
        </div>
      ) : !isOpen ? (
        <div className="w-full bg-gray-700/50 text-gray-400 font-semibold py-3 px-6 rounded-lg text-center">
          Awaiting Finalization
        </div>
      ) : (
        <div className="w-full bg-gray-700/50 text-gray-400 font-semibold py-3 px-6 rounded-lg text-center">
          Connect Wallet to Participate
        </div>
      )}
    </div>
  );
}

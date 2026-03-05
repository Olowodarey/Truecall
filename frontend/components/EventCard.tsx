"use client";

import { useState } from "react";
import type { ChainEvent, ChainMarket } from "@/lib/types";
import {
  disputeResult,
  finalizeMarket,
  claimPoints,
  claimWinningsStx,
  claimWinningsSbtc,
} from "@/lib/stacks";
import { CONTRACTS } from "@/lib/contracts";

const DISPUTE_WINDOW = 12; // burn blocks (~2 hours)

interface EventCardProps {
  event: ChainEvent;
  markets?: ChainMarket[];
  currentBlock?: number;
  userAddress?: string | null;
  onJoinEvent: (event: ChainEvent) => void;
  onRefresh?: () => void;
}

export default function EventCard({
  event,
  markets,
  currentBlock = 0,
  userAddress,
  onJoinEvent,
  onRefresh,
}: EventCardProps) {
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const isOpen = event.isActive;
  const statusLabel = event.isActive ? "OPEN" : "CLOSED";
  const statusColor = event.isActive
    ? "bg-green-500/20 text-green-400 border-green-500/50"
    : "bg-gray-500/20 text-gray-400 border-gray-500/50";

  const allFinalized =
    event.marketCount > 0 && event.finalizedMarketCount === event.marketCount;
  const poolStx = (event.totalPool / 1_000_000).toFixed(2);
  const feeMicro = event.entryFee;
  const feeLabel = event.useSbtc
    ? `${feeMicro} sats`
    : `${(feeMicro / 1_000_000).toFixed(2)} STX`;

  const setBusy = (key: string, v: boolean) =>
    setPending((p) => ({ ...p, [key]: v }));

  const handleDispute = async (marketId: number) => {
    const key = `dispute-${marketId}`;
    setBusy(key, true);
    await disputeResult(marketId, {
      onFinish: () => {
        setBusy(key, false);
        onRefresh?.();
      },
      onCancel: () => setBusy(key, false),
    });
  };

  const handleFinalize = async (marketId: number) => {
    const key = `finalize-${marketId}`;
    setBusy(key, true);
    await finalizeMarket(marketId, {
      onFinish: () => {
        setBusy(key, false);
        onRefresh?.();
      },
      onCancel: () => setBusy(key, false),
    });
  };

  const handleClaimPoints = async (marketId: number) => {
    const key = `points-${marketId}`;
    setBusy(key, true);
    await claimPoints(marketId, {
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
    if (event.useSbtc) {
      await claimWinningsSbtc(event.id, CONTRACTS.MOCK_SBTC ?? "", {
        onFinish: () => {
          setBusy(key, false);
          onRefresh?.();
        },
        onCancel: () => setBusy(key, false),
      });
    } else {
      await claimWinningsStx(event.id, {
        onFinish: () => {
          setBusy(key, false);
          onRefresh?.();
        },
        onCancel: () => setBusy(key, false),
      });
    }
  };

  const getMarketActions = (market: ChainMarket) => {
    const disputeDeadline = market.proposalBlock + DISPUTE_WINDOW;
    const withinDisputeWindow = currentBlock < disputeDeadline;
    const disputeWindowPassed = currentBlock >= disputeDeadline;

    if (market.status === "pending") {
      if (withinDisputeWindow && userAddress) {
        // Within window: user with position can dispute
        return (
          <button
            disabled={!!pending[`dispute-${market.id}`]}
            onClick={() => handleDispute(market.id)}
            className="mt-2 w-full text-xs py-1.5 px-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition disabled:opacity-50"
          >
            {pending[`dispute-${market.id}`] ? "Waiting…" : "⚠ Dispute Result"}
          </button>
        );
      }
      if (disputeWindowPassed) {
        // Window passed: anyone can finalize
        return (
          <button
            disabled={!!pending[`finalize-${market.id}`]}
            onClick={() => handleFinalize(market.id)}
            className="mt-2 w-full text-xs py-1.5 px-3 rounded-md border border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition disabled:opacity-50"
          >
            {pending[`finalize-${market.id}`]
              ? "Waiting…"
              : "✓ Finalize Market"}
          </button>
        );
      }
    }

    if (market.status === "final" && userAddress) {
      return (
        <button
          disabled={!!pending[`points-${market.id}`]}
          onClick={() => handleClaimPoints(market.id)}
          className="mt-2 w-full text-xs py-1.5 px-3 rounded-md border border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-50"
        >
          {pending[`points-${market.id}`] ? "Waiting…" : "🏆 Claim Points"}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
      {/* Header */}
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
          {event.daoApproved && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400 border border-purple-500/50">
              DAO ✓
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Entry Fee</p>
          <p className="text-white font-semibold">{feeLabel}</p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Prize Pool</p>
          <p className="text-orange-400 font-semibold">
            {event.useSbtc ? `${event.totalPool} sats` : `${poolStx} STX`}
          </p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Markets</p>
          <p className="text-white font-semibold">
            {event.finalizedMarketCount}/{event.marketCount} finalized
          </p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Closes Block</p>
          <p className="text-white font-semibold">#{event.closeBlock}</p>
        </div>
      </div>

      {/* Markets List */}
      {markets && markets.length > 0 && (
        <div className="mb-5">
          <h4 className="font-semibold text-orange-400 text-sm mb-2">
            Prediction Markets
          </h4>
          <ul className="space-y-2">
            {markets.map((market) => {
              const isMarketOpen = market.status === "open";
              return (
                <li key={market.id}>
                  <div
                    className={`p-3 rounded-lg text-sm border transition-all ${
                      isMarketOpen && isOpen
                        ? "border-orange-500/40 bg-orange-500/5 cursor-pointer hover:bg-orange-500/10"
                        : "border-gray-700/50 bg-gray-800/60"
                    }`}
                    onClick={() => isMarketOpen && isOpen && onJoinEvent(event)}
                  >
                    <p className="font-medium text-white">{market.question}</p>
                    <div className="flex justify-between items-center mt-2 text-gray-400">
                      <span>
                        Target: ${(market.targetPrice / 100).toLocaleString()}
                      </span>
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full border text-xs ${
                          market.status === "open"
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : market.status === "pending"
                              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                              : market.status === "disputed"
                                ? "bg-red-500/10 border-red-500/30 text-red-400"
                                : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        }`}
                      >
                        {market.status}
                      </span>
                    </div>
                    {isMarketOpen && isOpen && (
                      <p className="text-orange-400 text-xs mt-1 font-medium">
                        Click to predict →
                      </p>
                    )}
                    {market.status === "pending" &&
                      market.proposalBlock > 0 && (
                        <p className="text-yellow-400/70 text-xs mt-1">
                          Dispute deadline: block #
                          {market.proposalBlock + DISPUTE_WINDOW}
                          {currentBlock > 0 &&
                            ` (${Math.max(0, market.proposalBlock + DISPUTE_WINDOW - currentBlock)} blocks left)`}
                        </p>
                      )}
                    {getMarketActions(market)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Event Level Actions */}
      {isOpen ? (
        <button
          id={`join-event-${event.id}`}
          onClick={() => onJoinEvent(event)}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/50"
        >
          Predict → Win {feeLabel}
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
            : `🎉 Claim Winnings (${event.useSbtc ? "sBTC" : "STX"})`}
        </button>
      ) : allFinalized ? (
        <div className="w-full bg-green-500/10 text-green-400 font-semibold py-3 px-6 rounded-lg text-center border border-green-500/30">
          Event Settled ✓
        </div>
      ) : !isOpen ? (
        <div className="w-full bg-gray-700/50 text-gray-400 font-semibold py-3 px-6 rounded-lg text-center">
          Awaiting Market Finalization
        </div>
      ) : null}
    </div>
  );
}

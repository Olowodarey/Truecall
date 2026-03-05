"use client";

import type { ChainEvent } from "@/lib/types";

interface EventCardProps {
  event: ChainEvent;
  onJoinEvent: (event: ChainEvent) => void;
}

export default function EventCard({ event, onJoinEvent }: EventCardProps) {
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

      {/* Action */}
      {isOpen ? (
        <button
          id={`join-event-${event.id}`}
          onClick={() => onJoinEvent(event)}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/50"
        >
          Predict → Win {feeLabel}
        </button>
      ) : allFinalized ? (
        <button
          id={`claim-event-${event.id}`}
          onClick={() => onJoinEvent(event)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 px-6 rounded-lg transition-all"
        >
          Claim Winnings
        </button>
      ) : (
        <div className="w-full bg-gray-700/50 text-gray-400 font-semibold py-3 px-6 rounded-lg text-center">
          Predictions Closed
        </div>
      )}
    </div>
  );
}

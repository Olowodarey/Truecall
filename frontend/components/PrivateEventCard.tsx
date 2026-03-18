"use client";

import type { ChainPrivateEvent } from "@/lib/types";
import { deriveStatusLabel } from "@/lib/private-event-utils";

interface PrivateEventCardProps {
  event: ChainPrivateEvent;
  isCreator: boolean;
  isJoined: boolean;
  onClick: () => void;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

export default function PrivateEventCard({
  event,
  isCreator,
  isJoined,
  onClick,
}: PrivateEventCardProps) {
  const status = deriveStatusLabel(event.isActive, event.ended);

  const statusColor =
    status === "Active"
      ? "bg-green-500/20 text-green-400 border-green-500/50"
      : status === "Pending"
        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
        : "bg-gray-500/20 text-gray-400 border-gray-500/50";

  const entryFeeStx = (event.entryFee / 1_000_000).toFixed(2);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
    >
      {/* Header row: title + status badge */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-white truncate flex-1 pr-2">
          {event.title}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${statusColor}`}
        >
          {status}
        </span>
      </div>

      {/* Creator address */}
      <p className="text-gray-400 text-sm mb-4">
        <span className="text-gray-500">Creator: </span>
        <span className="font-mono text-gray-300">
          {truncateAddress(event.creator)}
        </span>
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Entry Fee</p>
          <p className="text-white font-semibold">{entryFeeStx} STX</p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Participants</p>
          <p className="text-white font-semibold">{event.participantCount}</p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3 col-span-2">
          <p className="text-gray-400 text-xs mb-1">Round Progress</p>
          <p className="text-white font-semibold">
            {event.currentRound} / {event.maxRounds}
          </p>
        </div>
      </div>

      {/* Badges row */}
      {(isCreator || isJoined) && (
        <div className="flex gap-2 flex-wrap">
          {isCreator && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/50">
              Your Event
            </span>
          )}
          {isJoined && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/50">
              Joined
            </span>
          )}
        </div>
      )}
    </div>
  );
}

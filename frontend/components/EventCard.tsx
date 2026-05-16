"use client";

import { useRouter } from "next/navigation";
import type { TrueCallEvent } from "@/lib/types";
import { formatTimestamp, getTokenSymbol } from "@/lib/utils";

interface EventCardProps {
  event: TrueCallEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const tokenSymbol = getTokenSymbol(event.entryToken);

  const statusColor =
    event.status === "OPEN"
      ? "bg-green-500/20 text-green-400 border-green-500/50"
      : event.status === "RESOLVED"
        ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
        : "bg-gray-500/20 text-gray-400 border-gray-500/50";

  return (
    <div
      onClick={() => router.push(`/events/${event.eventId}`)}
      className="bg-linear-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 flex flex-col justify-between cursor-pointer"
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-white truncate flex-1 pr-2">
            {event.eventName}
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${statusColor}`}
          >
            {event.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
          <div className="bg-gray-700/30 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Entry Fee</p>
            <p className="text-white font-semibold">
              {event.entryFee} {tokenSymbol}
            </p>
          </div>
          <div className="bg-gray-700/30 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Prize Pool</p>
            <p className="text-orange-400 font-semibold">
              {event.prizePool} {tokenSymbol}
            </p>
          </div>
          <div className="bg-gray-700/30 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Type</p>
            <p className="text-white font-semibold">{event.eventType}</p>
          </div>
          <div className="bg-gray-700/30 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Ends</p>
            <p className="text-white font-semibold text-xs">
              {formatTimestamp(event.endDate)}
            </p>
          </div>
        </div>
      </div>

      <button className="w-full bg-linear-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300">
        View Event →
      </button>
    </div>
  );
}

"use client";

import { Event, EventStatus, MatchResult } from "@/lib/types";
import { format } from "date-fns";

interface EventCardProps {
  event: Event;
  onJoinEvent: (event: Event) => void;
}

export default function EventCard({ event, onJoinEvent }: EventCardProps) {
  const { match } = event;

  if (!match) {
    return null;
  }

  const matchDate = new Date(match.matchTime);
  const isOpen = event.status === EventStatus.OPEN;
  const isClosed = event.status === EventStatus.CLOSED;
  const isSettled = event.status === EventStatus.SETTLED;

  const getStatusColor = () => {
    switch (event.status) {
      case EventStatus.OPEN:
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case EventStatus.CLOSED:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case EventStatus.SETTLED:
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getResultText = () => {
    if (!match.result) return null;

    switch (match.result) {
      case MatchResult.HOME_WIN:
        return `${match.homeTeam} Won`;
      case MatchResult.DRAW:
        return "Draw";
      case MatchResult.AWAY_WIN:
        return `${match.awayTeam} Won`;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
      {/* Event Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-white">{event.eventName}</h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor()}`}
        >
          {event.status.toUpperCase()}
        </span>
      </div>

      {/* Match Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-lg font-semibold text-white">{match.homeTeam}</p>
          </div>
          <div className="px-4 text-gray-400 font-bold">VS</div>
          <div className="flex-1 text-right">
            <p className="text-lg font-semibold text-white">{match.awayTeam}</p>
          </div>
        </div>

        {/* Match Time */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{format(matchDate, "PPP p")}</span>
        </div>

        {/* Match Status */}
        <div className="text-center">
          <span className="text-sm text-gray-500">
            Status:{" "}
            <span className="text-gray-300 font-medium">{match.status}</span>
          </span>
        </div>

        {/* Result if settled */}
        {isSettled && match.result && (
          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-center text-blue-400 font-semibold">
              Result: {getResultText()}
            </p>
            {match.homeScore !== null && match.awayScore !== null && (
              <p className="text-center text-gray-400 text-sm mt-1">
               match  Score: {match.homeScore} - {match.awayScore}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      {isOpen && (
        <button
          onClick={() => onJoinEvent(event)}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/50"
        >
          Join Event & Predict
        </button>
      )}

      {isClosed && (
        <div className="w-full bg-gray-700/50 text-gray-400 font-semibold py-3 px-6 rounded-lg text-center">
          Predictions Closed
        </div>
      )}

      {isSettled && (
        <div className="w-full bg-blue-500/20 text-blue-400 font-semibold py-3 px-6 rounded-lg text-center border border-blue-500/30">
          Event Settled
        </div>
      )}
    </div>
  );
}

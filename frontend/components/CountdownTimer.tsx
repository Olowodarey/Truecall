"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetTimestamp: number; // Unix timestamp in seconds
  onExpire?: () => void;
}

export default function CountdownTimer({
  targetTimestamp,
  onExpire,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const difference = targetTimestamp - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
        });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(difference / (60 * 60 * 24));
      const hours = Math.floor((difference % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((difference % (60 * 60)) / 60);
      const seconds = difference % 60;

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp, onExpire]);

  if (timeLeft.expired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg">
        <span className="text-red-400 text-sm font-bold">
          ⏰ Prediction Closed
        </span>
      </div>
    );
  }

  // Format time units
  const formatUnit = (value: number, label: string) => {
    if (value === 0) return null;
    return (
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-white">
          {String(value).padStart(2, "0")}
        </span>
        <span className="text-xs text-gray-400 uppercase">{label}</span>
      </div>
    );
  };

  // Show appropriate time units based on time left
  const showDays = timeLeft.days > 0;
  const showHours = timeLeft.days > 0 || timeLeft.hours > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
        <span>Prediction deadline at kickoff</span>
      </div>

      <div className="flex items-center gap-2 bg-gray-900/80 border border-orange-500/30 rounded-lg p-3">
        {showDays && (
          <>
            {formatUnit(timeLeft.days, "Days")}
            <span className="text-xl text-gray-600 font-bold">:</span>
          </>
        )}
        {showHours && (
          <>
            {formatUnit(timeLeft.hours, "Hours")}
            <span className="text-xl text-gray-600 font-bold">:</span>
          </>
        )}
        {formatUnit(timeLeft.minutes, "Min")}
        <span className="text-xl text-gray-600 font-bold">:</span>
        {formatUnit(timeLeft.seconds, "Sec")}
      </div>
    </div>
  );
}

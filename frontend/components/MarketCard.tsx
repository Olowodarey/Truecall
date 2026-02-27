"use client";

import { useState } from "react";

export interface MarketAsset {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  "24hChange": number;
  targetPrice: number;
  endTime: string;
  category: "Crypto" | "Stock" | "Commodity";
  totalPool: string;
}

export default function MarketCard({ asset }: { asset: MarketAsset }) {
  const [prediction, setPrediction] = useState<"UP" | "DOWN" | null>(null);

  const isPositive = asset["24hChange"] >= 0;

  return (
    <div className="bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6 hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10 flex flex-col h-full relative overflow-hidden group">
      {/* Category Badge */}
      <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-bl-lg border-b border-l border-blue-500/20">

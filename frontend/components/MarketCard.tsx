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
        {asset.category}
      </div>

      <div className="flex items-center gap-4 mb-6 mt-2">
        <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center text-xl font-bold border border-gray-600/50 shadow-inner">
          {asset.symbol.substring(0, 1)}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white leading-tight">{asset.name}</h3>
          <p className="text-sm font-medium text-gray-400">{asset.symbol}</p>

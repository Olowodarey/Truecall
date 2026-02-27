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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-gray-900/50 border border-gray-800/50">
        <div>
          <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Current Price</p>
          <p className="text-lg font-bold text-white">${asset.currentPrice.toLocaleString()}</p>
          <p className={`text-xs font-bold mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(asset["24hChange"])}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Target Price</p>
          <p className="text-lg font-bold text-white">${asset.targetPrice.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">By {asset.endTime}</p>
        </div>
      </div>

      <div className="mt-auto space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Total Pool</span>
          <span className="font-bold text-white">{asset.totalPool}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setPrediction("DOWN")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${prediction === "DOWN" ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'}`}
          >
            <span>↓</span> Down
          </button>
          <button 
            onClick={() => setPrediction("UP")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${prediction === "UP" ? 'bg-green-500 text-white shadow-lg shadow-green-500/25' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'}`}
          >

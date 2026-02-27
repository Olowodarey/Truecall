"use client";

import { useState } from "react";
import MarketCard, { MarketAsset } from "./MarketCard";

const MOCK_MARKETS: MarketAsset[] = [
  {
    id: "btc-100k",
    name: "Bitcoin",
    symbol: "BTC",
    currentPrice: 94250.00,
    "24hChange": 2.4,
    targetPrice: 100000.00,
    endTime: "End of Month",
    category: "Crypto",
    totalPool: "1,250 STX"
  },
  {
    id: "eth-4k",
    name: "Ethereum",
    symbol: "ETH",
    currentPrice: 3820.50,
    "24hChange": -1.2,
    targetPrice: 4000.00,
    endTime: "End of Week",
    category: "Crypto",
    totalPool: "840 STX"
  },
  {
    id: "tsla-250",
    name: "Tesla",
    symbol: "TSLA",
    currentPrice: 235.40,
    "24hChange": 5.1,
    targetPrice: 250.00,
    endTime: "Friday Close",
    category: "Stock",
    totalPool: "520 STX"
  },
  {
    id: "gold-2500",
    name: "Gold",
    symbol: "XAU",
    currentPrice: 2480.90,
    "24hChange": 0.3,
    targetPrice: 2500.00,
    endTime: "End of Month",
    category: "Commodity",
    totalPool: "2,100 STX"
  },
  {
    id: "nvda-1200",
    name: "Nvidia",
    symbol: "NVDA",
    currentPrice: 1150.20,
    "24hChange": 3.8,
    targetPrice: 1200.00,
    endTime: "Friday Close",
    category: "Stock",
    totalPool: "3,400 STX"
  },
  {
    id: "sol-200",
    name: "Solana",
    symbol: "SOL",
    currentPrice: 185.30,
    "24hChange": 8.4,
    targetPrice: 200.00,
    endTime: "Sunday Midnight",
    category: "Crypto",
    totalPool: "1,890 STX"
  }
];

export default function MarketsSection() {
  const [filter, setFilter] = useState<"All" | "Crypto" | "Stock" | "Commodity">("All");

  const filteredMarkets = filter === "All" 
    ? MOCK_MARKETS 
    : MOCK_MARKETS.filter(m => m.category === filter);

  const categories = ["All", "Crypto", "Stock", "Commodity"];

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat as any)}
            className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${
              filter === cat 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white border border-gray-700/50'
            }`}
          >
            {cat}

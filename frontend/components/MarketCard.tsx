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

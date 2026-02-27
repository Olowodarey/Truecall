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

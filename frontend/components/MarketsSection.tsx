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

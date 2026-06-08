"use client";

import { useWallet } from "@/contexts/WalletContext";
import { useEffect, useState } from "react";

export default function WalletButton() {
  const { isConnected, address, connectWallet, disconnectWallet, isConnecting } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fmt = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!mounted) {
    return (
      <button
        disabled
        className="bg-orange-500/50 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-not-allowed"
      >
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:block px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 font-mono">
          {fmt(address)}
        </div>
        <button
          onClick={disconnectWallet}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

"use client";

import { useWallet } from "@/contexts/WalletContext";

export default function WalletButton() {
  const { isConnected, stxAddress, connectWallet, disconnectWallet } =
    useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && stxAddress) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:block px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-300">
          {formatAddress(stxAddress)}
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
      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
    >
      Connect Wallet
    </button>
  );
}

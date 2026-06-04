"use client";

import React, { createContext, useContext } from "react";
import { useAccount, useConnect, useDisconnect, useConnectors } from "wagmi";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();

  const connectWallet = async () => {
    if (isPending) return; // prevent double-click
    try {
      const connector = connectors[0];
      if (!connector) {
        alert("No wallet found. Please install MetaMask or another Web3 wallet.");
        return;
      }
      await connectAsync({ connector });
    } catch (e: any) {
      // Ignore "already processing" errors — user just needs to approve in MetaMask
      if (e?.message?.includes("already processing")) return;
      console.error("Wallet connection failed", e);
      alert(e?.shortMessage || e?.message || "Wallet connection failed");
    }
  };

  const disconnectWallet = () => disconnect();

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address: address ?? null,
        connectWallet,
        disconnectWallet,
        isConnecting: isPending,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const {
  connect,
  disconnect: stacksDisconnect,
  isConnected: stacksIsConnected,
 
} = require("@stacks/connect") as any;

interface WalletContextType {

  isConnected: boolean;
  stxAddress: string | null;
  btcAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [stxAddress, setStxAddress] = useState<string | null>(null);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);

  useEffect(() => {
    if (stacksIsConnected()) {
      const { getLocalStorage } = require("@stacks/connect") as any;
      const cached = getLocalStorage();
      const stx = cached?.addresses?.stx?.[0]?.address ?? null;
      const btc = cached?.addresses?.btc?.[0]?.address ?? null;
      setStxAddress(stx);
      setBtcAddress(btc);
      setConnected(true);
    }
  }, []);

  const connectWallet = async () => {
    try {
      const response = await connect({
        appDetails: {
          name: "TrueCall",
          icon:
            typeof window !== "undefined"
              ? `${window.location.origin}/favicon.ico`
              : "",
        },
      });

      const stx =
        response.addresses.find(
          (a: { symbol?: string; address: string }) =>
            a.symbol === "STX" || a.address?.startsWith("S"),
        )?.address ?? null;
      const btc =
        response.addresses.find(
          (a: { symbol?: string; address: string }) =>
            a.symbol === "BTC" || (!a.address?.startsWith("S") && a.address),
        )?.address ?? null;

      setStxAddress(stx);
      setBtcAddress(btc);
      setConnected(true);
    } catch (e) {
      console.error("Wallet connection failed", e);
    }
  };

  const disconnectWallet = () => {
    stacksDisconnect();
    setConnected(false);
    setStxAddress(null);
    setBtcAddress(null);
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected: connected,
        stxAddress,
        btcAddress,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

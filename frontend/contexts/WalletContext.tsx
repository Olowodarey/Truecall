"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AppConfig, UserSession } from "@stacks/connect";
import { connect as stacksConnect } from "@stacks/connect";

interface WalletContextType {
  userSession: UserSession;
  isConnected: boolean;
  userAddress: string | null;
  connectWallet: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const appConfig = new AppConfig(["store_write", "publish_data"]);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [userSession] = useState(() => new UserSession({ appConfig }));
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setIsConnected(true);
      setUserAddress(userData.profile.stxAddress.testnet);
    }
  }, [userSession]);

  const connectWallet = async () => {
    try {
      const response = await stacksConnect({
        userSession,
      });

      if (response && userSession.isUserSignedIn()) {
        const userData = userSession.loadUserData();
        setIsConnected(true);
        setUserAddress(userData.profile.stxAddress.testnet);
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  const disconnect = () => {
    userSession.signUserOut();
    setIsConnected(false);
    setUserAddress(null);
  };

  return (
    <WalletContext.Provider
      value={{
        userSession,
        isConnected,
        userAddress,
        connectWallet,
        disconnect,
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

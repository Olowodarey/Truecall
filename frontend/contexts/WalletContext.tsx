"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AppConfig, UserSession, showConnect } from "@stacks/connect";

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
    // Check if user is returning from authentication
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setIsConnected(true);
        setUserAddress(userData.profile.stxAddress.testnet);
      });
    } else if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setIsConnected(true);
      setUserAddress(userData.profile.stxAddress.testnet);
    }
  }, [userSession]);

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: "TrueCall",
        icon:
          typeof window !== "undefined"
            ? `${window.location.origin}/favicon.ico`
            : "",
      },
      userSession,
      onFinish: () => {
        if (userSession.isUserSignedIn()) {
          const userData = userSession.loadUserData();
          setIsConnected(true);
          setUserAddress(userData.profile.stxAddress.testnet);
        }
      },
      onCancel: () => {
        console.log("Wallet connection cancelled");
      },
    });
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

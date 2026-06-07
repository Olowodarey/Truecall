"use client";

import React, { createContext, useContext, useState } from "react";
import { useAccount, useConnect, useDisconnect, useConnectors } from "wagmi";
import type { Connector } from "wagmi";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
  showConnectorModal: boolean;
  setShowConnectorModal: (show: boolean) => void;
  availableConnectors: readonly Connector[];
  connectWithConnector: (connector: Connector) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const [showConnectorModal, setShowConnectorModal] = useState(false);

  const isMobile =
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const connectWallet = async () => {
    if (isPending) return;

    try {
      // On mobile, check if we're in a wallet browser
      const hasInjectedProvider =
        typeof window !== "undefined" && window.ethereum;

      if (isMobile && !hasInjectedProvider) {
        // Mobile without injected wallet - show options
        setShowConnectorModal(true);
        return;
      }

      // Desktop or mobile with injected wallet - try injected first
      const injectedConnector = connectors.find((c) => c.type === "injected");

      if (injectedConnector) {
        await connectAsync({ connector: injectedConnector });
      } else {
        // No injected, show all options
        setShowConnectorModal(true);
      }
    } catch (e: any) {
      if (e?.message?.includes("already processing")) return;

      // User rejected or other error
      if (e?.message?.includes("User rejected")) {
        console.log("User rejected wallet connection");
        return;
      }

      console.error("Wallet connection failed", e);

      // Show modal as fallback
      setShowConnectorModal(true);
    }
  };

  const connectWithConnector = async (connector: Connector) => {
    if (isPending) return;

    try {
      await connectAsync({ connector });
      setShowConnectorModal(false);
    } catch (e: any) {
      if (e?.message?.includes("already processing")) return;

      if (e?.message?.includes("User rejected")) {
        console.log("User rejected wallet connection");
        return;
      }

      console.error("Wallet connection failed", e);
      alert(
        e?.shortMessage ||
          e?.message ||
          "Wallet connection failed. Please try again.",
      );
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setShowConnectorModal(false);
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address: address ?? null,
        connectWallet,
        disconnectWallet,
        isConnecting: isPending,
        showConnectorModal,
        setShowConnectorModal,
        availableConnectors: connectors,
        connectWithConnector,
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

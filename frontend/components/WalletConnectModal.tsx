"use client";

import { useWallet } from "@/contexts/WalletContext";
import type { Connector } from "wagmi";

export default function WalletConnectModal() {
  const {
    showConnectorModal,
    setShowConnectorModal,
    availableConnectors,
    connectWithConnector,
    isConnecting,
  } = useWallet();

  if (!showConnectorModal) return null;

  const getConnectorName = (connector: Connector) => {
    if (connector.type === "injected") return "Browser Wallet";
    if (connector.type === "walletConnect") return "WalletConnect";
    return connector.name;
  };

  const getConnectorIcon = (connector: Connector) => {
    if (connector.type === "injected") {
      return (
        <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
          <path
            d="M10 14L20 4L30 14M10 26L20 36L30 26"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    if (connector.type === "walletConnect") {
      return (
        <svg className="w-8 h-8" viewBox="0 0 40 40" fill="currentColor">
          <path d="M8.52 13.98c5.77-5.64 15.13-5.64 20.9 0l.69.68a.72.72 0 0 1 0 1.03l-2.36 2.31a.38.38 0 0 1-.53 0l-.96-.94c-4.03-3.94-10.56-3.94-14.59 0l-1.02 1a.38.38 0 0 1-.53 0l-2.36-2.31a.72.72 0 0 1 0-1.03l.76-.74Zm25.81 4.78 2.1 2.05c.3.29.3.76 0 1.05l-9.46 9.25a.76.76 0 0 1-1.06 0l-6.72-6.57a.19.19 0 0 0-.26 0l-6.72 6.57a.76.76 0 0 1-1.06 0l-9.46-9.25a.72.72 0 0 1 0-1.05l2.1-2.05a.76.76 0 0 1 1.06 0l6.72 6.57c.07.07.19.07.26 0l6.72-6.57a.76.76 0 0 1 1.06 0l6.72 6.57c.07.07.19.07.26 0l6.72-6.57a.76.76 0 0 1 1.06 0Z" />
        </svg>
      );
    }
    return null;
  };

  const getConnectorDescription = (connector: Connector) => {
    if (connector.type === "injected") {
      return "MetaMask, Valora, or other browser wallet";
    }
    if (connector.type === "walletConnect") {
      return "Scan with mobile wallet app";
    }
    return "";
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-xl">Connect Wallet</h3>
          <button
            onClick={() => setShowConnectorModal(false)}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          Choose how you want to connect your wallet
        </p>

        <div className="space-y-3">
          {availableConnectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connectWithConnector(connector)}
              disabled={isConnecting}
              className="w-full bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-orange-500/50 rounded-xl p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-4">
                <div className="text-orange-400 group-hover:text-orange-300 transition-colors">
                  {getConnectorIcon(connector)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-semibold">
                    {getConnectorName(connector)}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {getConnectorDescription(connector)}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-600 group-hover:text-orange-400 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Mobile Instructions */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-xs">
            <strong>💡 Mobile Users:</strong> If you don't have a wallet,
            download Valora, MetaMask Mobile, or Rainbow Wallet from your app
            store.
          </p>
        </div>

        {/* Desktop Instructions */}
        <div className="mt-3 p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
          <p className="text-gray-400 text-xs">
            <strong>🖥️ Desktop Users:</strong> Install MetaMask browser
            extension or use WalletConnect to scan with your mobile wallet.
          </p>
        </div>
      </div>
    </div>
  );
}

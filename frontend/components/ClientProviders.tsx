"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletProvider } from "@/contexts/WalletContext";
import WalletConnectModal from "./WalletConnectModal";

const queryClient = new QueryClient();

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          {children}
          <WalletConnectModal />
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

"use client";

import { WalletProvider } from "@/contexts/WalletContext";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletProvider>{children}</WalletProvider>;
}

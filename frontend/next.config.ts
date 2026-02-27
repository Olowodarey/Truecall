import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@stacks/connect",
    "@stacks/network",
    "@stacks/transactions",
    "@stacks/auth",
    "@stacks/storage",
    "@stacks/wallet-sdk",
  ],
};

export default nextConfig;

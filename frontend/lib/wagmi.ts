import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

// Celo Sepolia testnet
export const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_CELO_RPC ??
          "https://forno.celo-sepolia.celo-testnet.org",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [celoSepolia],
  connectors: [injected()],
  transports: {
    [celoSepolia.id]: http(
      process.env.NEXT_PUBLIC_CELO_RPC ??
        "https://forno.celo-sepolia.celo-testnet.org",
    ),
  },
  ssr: true,
});

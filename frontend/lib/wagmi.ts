import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { defineChain } from "viem";
import { injected, walletConnect } from "wagmi/connectors";

// Celo Mainnet
export const celo = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CELO_RPC ?? "https://forno.celo.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Celoscan",
      url: "https://celoscan.io",
    },
  },
  testnet: false,
});

// Keep testnet export for backward compatibility (but not in config)
export const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://forno.celo-sepolia.celo-testnet.org"],
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

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID";

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId,
      metadata: {
        name: "TrueCall",
        description: "Blockchain-powered football predictions",
        url: "https://truecall.xyz",
        icons: ["https://truecall.xyz/logo.png"],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [celo.id]: http(
      process.env.NEXT_PUBLIC_CELO_RPC ?? "https://forno.celo.org",
    ),
  },
  ssr: true,
  storage: createStorage({
    storage:
      typeof window !== "undefined" ? window.localStorage : cookieStorage,
  }),
});

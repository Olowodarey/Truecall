import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import { celo } from "@reown/appkit/networks";

export { celo };

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const networks = [celo] as [typeof celo, ...typeof celo[]];

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: celo,
  metadata: {
    name: "TrueCall",
    description: "Blockchain-powered football predictions",
    url: "https://truecall.xyz",
    icons: ["https://truecall.xyz/logo.png"],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-color-mix": "#f97316",
    "--w3m-color-mix-strength": 20,
    "--w3m-accent": "#f97316",
    "--w3m-border-radius-master": "8px",
  },
});

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import { celo } from "@reown/appkit/networks";
import { cookieStorage, createStorage } from "wagmi";

export { celo };

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const networks = [celo] as [typeof celo, ...typeof celo[]];

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks,
  // Persist the connection in a cookie rather than only in-memory. On iOS,
  // tapping "connect" deep-links to the wallet app and Safari unloads the
  // backgrounded tab; on return the page reloads and an in-memory session is
  // lost. cookieStorage survives that reload so the wallet stays connected.
  //
  // Cast: the adapter bundles its own @wagmi/core copy, so wagmi's createStorage
  // return type and the adapter's expected Storage type are structurally equal
  // but nominally distinct. Identical at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: createStorage({ storage: cookieStorage }) as any,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// WalletConnect verifies metadata.url against the real page origin. A mismatch
// makes iOS wallets show a "cannot verify domain" warning or refuse to connect,
// so derive it from the live origin instead of hardcoding.
const appOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://truecall.vercel.app";

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: celo,
  metadata: {
    name: "TrueCall",
    description: "Blockchain-powered football predictions",
    url: appOrigin,
    icons: [`${appOrigin}/logo.png`],
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

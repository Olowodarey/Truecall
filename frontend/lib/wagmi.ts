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
  // Persist the connection in a cookie so it survives the page reload iOS
  // Safari does when returning from a wallet-app deep link. Paired with
  // cookieToInitialState in layout.tsx/ClientProviders so the server-rendered
  // state matches the cookie on the very first paint — without that, the
  // client flips from "disconnected" to a stale "connected" state after
  // mount, which confuses AppKit's modal into showing the Account/Disconnect
  // view instead of the wallet picker.
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

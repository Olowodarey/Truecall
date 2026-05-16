import { formatDistanceToNow } from "date-fns";

/** Convert a unix timestamp to a human-readable relative time string */
export function formatTimestamp(ts: number): string {
  return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true });
}

/** Shorten an EVM address */
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Get token symbol from address */
export function getTokenSymbol(address: string): string {
  const normalized = address.toLowerCase();

  // Native CELO
  if (normalized === "0x0000000000000000000000000000000000000000") {
    return "CELO";
  }

  // cUSD token on Celo Sepolia
  if (normalized === "0x874069fa1eb16d44d622f2e0ca25eea172369bc1") {
    return "cUSD";
  }

  // Default: show shortened address
  return shortAddress(address);
}

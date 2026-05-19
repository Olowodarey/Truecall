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

/** Check if an address is the admin wallet */
export function isAdminAddress(address: string | undefined): boolean {
  if (!address) return false;
  return (
    address.toLowerCase() ===
    "0xab26c86b78dedb488bf0cb4face11b048ddefE5b".toLowerCase()
  );
}

/** Format a number as currency with token symbol */
export function formatCurrency(amount: string, tokenSymbol: string): string {
  return `${amount} ${tokenSymbol}`;
}

/** Validate if a string is a valid Ethereum address */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/** Convert seconds to human-readable duration */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/** Check if a timestamp is in the past */
export function isPast(timestamp: number): boolean {
  return timestamp * 1000 < Date.now();
}

/** Check if a timestamp is in the future */
export function isFuture(timestamp: number): boolean {
  return timestamp * 1000 > Date.now();
}

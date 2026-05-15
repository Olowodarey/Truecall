import { formatDistanceToNow } from "date-fns";

/** Convert a unix timestamp to a human-readable relative time string */
export function formatTimestamp(ts: number): string {
  return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true });
}

/** Shorten an EVM address */
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

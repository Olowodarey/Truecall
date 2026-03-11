export function formatEstimatedTime(
  targetBlock: number,
  currentBlock: number,
  questionStatus?: string
): string {
  if (currentBlock <= 0) return "Loading...";
  const blocksLeft = Math.max(0, targetBlock - currentBlock);
  if (blocksLeft === 0) {
    // If on-chain status is still open, the close block passed but admin hasn't finalized yet
    if (questionStatus === "open") return "Awaiting Finalization";
    return "Passed";
  }
  
  // Stacks block time is ~10 minutes
  const msLeft = blocksLeft * 10 * 60 * 1000;
  const date = new Date(Date.now() + msLeft);
  const formatted = date.toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  
  // toLocaleString leaves a comma before the time, e.g. "Mar 11, 03:42 PM"
  return `${formatted} UTC`;
}

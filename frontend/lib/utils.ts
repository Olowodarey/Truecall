export function formatEstimatedTime(targetBlock: number, currentBlock: number): string {
  if (currentBlock <= 0) return "Loading...";
  const blocksLeft = Math.max(0, targetBlock - currentBlock);
  if (blocksLeft === 0) return "Passed";
  
  // Stacks block time is ~10 minutes
  const msLeft = blocksLeft * 10 * 60 * 1000;
  return new Date(Date.now() + msLeft).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

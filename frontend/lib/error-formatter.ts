/**
 * Format blockchain/contract errors into user-friendly messages
 */

export function formatContractError(error: any): string {
  if (!error) return "An unknown error occurred";

  const errorMessage = error.message || error.toString();

  // Insufficient funds for gas
  if (
    errorMessage.includes("insufficient funds") ||
    errorMessage.includes("balance") ||
    errorMessage.includes("gas")
  ) {
    return "⛽ Insufficient CELO for gas fees. Please add more CELO to your wallet.";
  }

  // User rejected transaction
  if (
    errorMessage.includes("user rejected") ||
    errorMessage.includes("User denied") ||
    errorMessage.includes("user denied")
  ) {
    return "❌ Transaction cancelled by user";
  }

  // Network errors
  if (errorMessage.includes("network") || errorMessage.includes("connection")) {
    return "🌐 Network error. Please check your connection and try again.";
  }

  // Wrong network
  if (
    errorMessage.includes("chain") ||
    errorMessage.includes("Chain") ||
    errorMessage.includes("network")
  ) {
    return "🔗 Please switch to Celo Mainnet in your wallet";
  }

  // Contract reverts with specific reasons
  if (errorMessage.includes("InvalidInviteCode")) {
    return "🔑 Invalid invite code. Please check the code and try again.";
  }

  if (errorMessage.includes("AlreadyJoined")) {
    return "✅ You have already joined this event";
  }

  if (errorMessage.includes("EventNotOpen")) {
    return "🔒 This event is no longer accepting participants";
  }

  if (errorMessage.includes("MatchLocked") || errorMessage.includes("closed")) {
    return "⏰ Match predictions are closed. Kickoff has passed.";
  }

  if (
    errorMessage.includes("NotJoined") ||
    errorMessage.includes("not joined")
  ) {
    return "❌ You must join the event before making predictions";
  }

  if (errorMessage.includes("AlreadyPredicted")) {
    return "✅ You have already submitted a prediction for this match";
  }

  if (errorMessage.includes("InvalidScore")) {
    return "⚽ Invalid score. Please enter scores between 0-20";
  }

  if (errorMessage.includes("OnlyCreator") || errorMessage.includes("owner")) {
    return "🚫 Only the event creator can perform this action";
  }

  if (errorMessage.includes("NotVerified")) {
    return "🔒 You must verify your Twitter account to join creator events";
  }

  if (errorMessage.includes("InsufficientFee")) {
    return "💰 Insufficient fee sent. Please check the creation fee amount.";
  }

  if (errorMessage.includes("TooManyMatches")) {
    return "📊 Maximum 5 matches per event reached";
  }

  if (errorMessage.includes("InvalidKickoffTime")) {
    return "⏰ Kickoff time must be in the future";
  }

  // Execution reverted (generic contract error)
  if (errorMessage.includes("execution reverted")) {
    // Try to extract the revert reason if available
    const reasonMatch = errorMessage.match(/reason: (.+?)(?:\n|$)/);
    if (reasonMatch) {
      return `❌ ${reasonMatch[1]}`;
    }
    return "❌ Transaction failed. Please check your inputs and try again.";
  }

  // Transaction timeout
  if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
    return "⏱️ Transaction took too long. It may still complete. Check your wallet activity.";
  }

  // Nonce errors (usually from pending transactions)
  if (errorMessage.includes("nonce")) {
    return "⚠️ You have a pending transaction. Please wait for it to complete.";
  }

  // Gas estimation failed
  if (errorMessage.includes("gas estimation")) {
    return "⛽ Unable to estimate gas. Transaction will likely fail. Please check your inputs.";
  }

  // Generic fallback - show first sentence only
  const firstSentence = errorMessage.split(/[.!?\n]/)[0];
  if (firstSentence && firstSentence.length < 100) {
    return `❌ ${firstSentence}`;
  }

  // Last resort
  return "❌ Transaction failed. Please try again or contact support.";
}

/**
 * Extract short transaction hash for display
 */
export function formatTxHash(hash: string): string {
  if (!hash || hash.length < 10) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/**
 * Format wei amount to CELO with proper decimals
 */
export function formatCelo(weiAmount: bigint | string, decimals = 4): string {
  const wei = typeof weiAmount === "string" ? BigInt(weiAmount) : weiAmount;
  const celo = Number(wei) / 1e18;
  return celo.toFixed(decimals);
}

import type { ChainRoundAnswer, LeaderboardEntry } from "./types";

// Stacks testnet averages ~2.5 min per block
const MINS_PER_BLOCK = 2.5;

// Convert a block count to a human-readable duration string
export function blocksToTime(blocks: number): string {
  const totalMins = Math.round(blocks * MINS_PER_BLOCK);
  if (totalMins < 60) return `~${totalMins}m`;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (mins === 0) return `~${hours}h`;
  return `~${hours}h ${mins}m`;
}

// Convert a future block number to a relative time string ("in ~2h 30m" or "X blocks ago")
export function blockToRelativeTime(
  targetBlock: number,
  currentBlock: number,
): string {
  const diff = targetBlock - currentBlock;
  if (diff <= 0) {
    const ago = Math.abs(diff);
    return ago === 0 ? "now" : `${blocksToTime(ago)} ago`;
  }
  return `in ${blocksToTime(diff)}`;
}

// SHA-256 hash of an invite code via Web Crypto API
export async function hashInviteCode(code: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(code);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(hashBuffer);
}

// UTF-8 encode an invite code for on-chain submission
export function encodeInviteCode(code: string): Uint8Array {
  return new TextEncoder().encode(code);
}

// Convert minutes from now to an absolute burn block height
export function minutesToAbsoluteBlock(
  minutes: number,
  currentBlock: number,
): number {
  return currentBlock + Math.ceil(minutes / 10);
}

// Convert STX to microSTX
export function stxToMicroStx(stx: number): number {
  return Math.round(stx * 1_000_000);
}

// Derive a human-readable status label from event flags
export function deriveStatusLabel(
  isActive: boolean,
  ended: boolean,
): "Pending" | "Active" | "Ended" {
  if (isActive) return "Active";
  if (ended) return "Ended";
  return "Pending";
}

// Derive creator and joined badge state
export function deriveBadges(
  wallet: string | null,
  creator: string,
  isMember: boolean,
): { isCreator: boolean; isJoined: boolean } {
  return {
    isCreator: wallet === creator,
    isJoined: isMember,
  };
}

// Determine whether the join form should be visible
export function deriveJoinFormVisible(s: {
  isParticipant: boolean;
  isActive: boolean;
  ended: boolean;
  currentBlock: number;
  joinDeadline: number;
  currentRound: number;
}): boolean {
  return (
    !s.isParticipant &&
    s.isActive &&
    !s.ended &&
    s.currentRound === 0 &&
    s.currentBlock < s.joinDeadline
  );
}

// Derive the set of action buttons visible for the current user/round state
export function deriveVisibleActions(s: {
  status: string;
  isCreator: boolean;
  isParticipant: boolean;
  submitter: string;
  wallet: string | null;
  currentBlock: number;
  submissionOpenBlock: number;
  submissionDeadline: number;
  answerCloseBlock: number;
  hasAnswered: boolean;
  pointsClaimed: boolean;
}): string[] {
  const submissionWindowOpen =
    s.currentBlock >= s.submissionOpenBlock &&
    s.currentBlock <= s.submissionDeadline;

  // Submitter gets to post the question while the window is open
  if (
    s.status === "pending-sub" &&
    s.isParticipant &&
    s.wallet === s.submitter &&
    submissionWindowOpen
  ) {
    return ["submitQuestion"];
  }
  // Creator can skip only after the submission deadline has passed
  if (
    s.status === "pending-sub" &&
    s.isCreator &&
    s.currentBlock > s.submissionDeadline
  ) {
    return ["skip"];
  }
  if (
    s.status === "open-answer" &&
    s.isParticipant &&
    !s.hasAnswered &&
    s.currentBlock <= s.answerCloseBlock
  ) {
    return ["answer"];
  }
  if (
    s.status === "open-answer" &&
    s.isCreator &&
    s.currentBlock > s.answerCloseBlock
  ) {
    return ["resolve"];
  }
  if (s.status === "final" && s.isParticipant && !s.pointsClaimed) {
    return ["claimPoints"];
  }
  return [];
}

// Derive the claim state for a round answer
export function deriveClaimState(
  answer: ChainRoundAnswer,
): "claimable" | "claimed" | "none" {
  if (answer.pointsClaimed) return "claimed";
  if (answer.prediction !== undefined) return "claimable";
  return "none";
}

// Derive which payout button (if any) should be shown
export function derivePayoutButtons(s: {
  ended: boolean;
  refundMode: boolean;
  isParticipant: boolean;
  refundClaimed: boolean;
}): "winnings" | "refund" | "refundClaimed" | null {
  if (s.refundClaimed) return "refundClaimed";
  if (s.ended && !s.refundMode && s.isParticipant) return "winnings";
  if (s.ended && s.refundMode && s.isParticipant && !s.refundClaimed)
    return "refund";
  return null;
}

// Render leaderboard entries with a "isMe" flag for the connected wallet
export function renderLeaderboard(
  entries: LeaderboardEntry[],
  wallet: string | null,
): Array<LeaderboardEntry & { isMe: boolean }> {
  return entries.map((entry) => ({
    ...entry,
    isMe: wallet !== null && entry.user === wallet,
  }));
}

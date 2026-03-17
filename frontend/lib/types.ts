// On-chain types — fields map 1:1 to Clarity contract tuple keys

export interface ChainEvent {
  id: number;
  title: string;
  creator: string;
  startBlock: number;
  endBlock: number;
  entryFee: number; // in microSTX
  questionCount: number;
  finalizedQuestionCount: number;
  participantCount: number;
  totalPool: number;
  isActive: boolean;
  feeBooked: boolean;
  refundMode: boolean;
}

export interface ChainQuestion {
  id: number;
  eventId: number;
  question: string;
  targetPrice: number; // BTC price in whole dollars
  closeBlock: number;
  resolveBlock: number;
  status: "open" | "final";
  oraclePrice: number;
  finalOutcome: boolean | null;
}

export interface ChainAnswer {
  prediction: boolean; // true = YES, false = NO
  pointsClaimed: boolean;
}

export interface ChainParticipant {
  joined: boolean;
  refundClaimed: boolean;
}

// Private event types
export interface ChainPrivateEvent {
  id: number;
  creator: string;
  title: string;
  inviteHash: string;
  entryFee: number;
  joinDeadline: number;
  maxRounds: number;
  intervalBlocks: number;
  submissionWindow: number;
  answerWindow: number;
  participantCount: number;
  totalPool: number;
  currentRound: number;
  completedRounds: number;
  nextSubmitterIndex: number;
  isActive: boolean;
  ended: boolean;
  feeBooked: boolean;
  refundMode: boolean;
}

export interface ChainRound {
  eventId: number;
  roundNumber: number;
  submitter: string;
  question: string | null;
  targetPrice: number;
  submissionOpenBlock: number;
  submissionDeadline: number;
  answerCloseBlock: number;
  status: "pending-sub" | "open-answer" | "final" | "skipped";
  oraclePrice: number;
  finalOutcome: boolean | null;
}

export interface ChainPrivateParticipant {
  joined: boolean;
  index: number;
  refundClaimed: boolean;
}

export interface ChainRoundAnswer {
  prediction: boolean;
  pointsClaimed: boolean;
}

// UI helpers
export type EventFilter = "all" | "open" | "closed" | "settled";
export type QuestionStatus = ChainQuestion["status"];

export interface LeaderboardEntry {
  user: string;
  points: number;
}

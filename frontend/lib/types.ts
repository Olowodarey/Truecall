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

// UI helpers
export type EventFilter = "all" | "open" | "closed" | "settled";
export type QuestionStatus = ChainQuestion["status"];

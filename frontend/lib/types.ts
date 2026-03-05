// On-chain types — fields map 1:1 to Clarity contract tuple keys

export interface ChainEvent {
  id: number;
  title: string;
  creator: string;
  daoApproved: boolean;
  closeBlock: number;
  entryFee: number; // microSTX or sBTC sats
  useSbtc: boolean;
  marketCount: number;
  finalizedMarketCount: number;
  isActive: boolean;
  totalPool: number;
}

export interface ChainMarket {
  id: number;
  eventId: number;
  question: string;
  targetPrice: number; // BTC price in USD cents
  closeBlock: number;
  status: "open" | "pending" | "disputed" | "final";
  oraclePrice: number;
  finalOutcome: boolean | null;
}

export interface ChainPosition {
  prediction: boolean; // true = YES, false = NO
  amount: number;
  claimed: boolean;
}

export interface ChainStakeInfo {
  stxBalance: number;
  stxStakedAt: number;
  lockedUntil: number;
}

export interface ChainProposal {
  id: number;
  proposer: string;
  title: string;
  question: string;
  targetPrice: number;
  entryFee: number;
  blocksOpen: number;
  useSbtc: boolean;
  createdAt: number;
  voteEndBlock: number;
  status:
    | "active"
    | "approved"
    | "rejected"
    | "executed"
    | "cancelled"
    | "expired";
  yesVotes: number;
  noVotes: number;
  eventId: number;
}

// UI helpers
export type EventFilter = "all" | "open" | "closed" | "settled";
export type MarketStatus = ChainMarket["status"];

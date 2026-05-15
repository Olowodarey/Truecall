import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, http, formatUnits } from 'viem';
import { EVENT_MANAGER_ABI } from '../abi/EventManager.abi';
import { LEADERBOARD_ABI } from '../abi/Leaderboard.abi';

// Celo Sepolia chain definition
const celoSepolia = {
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
    public: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
  },
} as const;

// ─── Status label helpers ─────────────────────────────────────────────────────

const EVENT_STATUS = ['OPEN', 'RESOLVED', 'CANCELLED'] as const;
const MATCH_STATUS = ['OPEN', 'LOCKED', 'VERIFIED', 'DISPUTED'] as const;
const EVENT_TYPE = ['PUBLIC', 'PRIVATE'] as const;
const OUTCOME_LABEL = ['HOME_WIN', 'DRAW', 'AWAY_WIN'] as const;

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private client: ReturnType<typeof createPublicClient>;
  private eventManagerAddress: `0x${string}`;
  private leaderboardAddress: `0x${string}`;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const rpcUrl = this.config.get<string>('CELO_RPC_URL')!;
    this.eventManagerAddress = this.config.get<string>(
      'EVENT_MANAGER_ADDRESS',
    )! as `0x${string}`;
    this.leaderboardAddress = this.config.get<string>(
      'LEADERBOARD_ADDRESS',
    )! as `0x${string}`;

    this.client = createPublicClient({
      chain: celoSepolia,
      transport: http(rpcUrl),
    }) as any;

    this.logger.log(`Connected to Celo Sepolia`);
    this.logger.log(`EventManager: ${this.eventManagerAddress}`);
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  async getEvent(eventId: number) {
    const ev = await this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'getEvent',
      args: [BigInt(eventId)],
    });

    return {
      eventId: Number(ev.eventId),
      eventType: EVENT_TYPE[ev.eventType] ?? ev.eventType,
      creator: ev.creator,
      eventName: ev.eventName,
      startDate: Number(ev.startDate),
      endDate: Number(ev.endDate),
      entryFee: formatUnits(ev.entryFee, 18),
      prizePool: formatUnits(ev.prizePool, 18),
      maxParticipants: Number(ev.maxParticipants),
      status: EVENT_STATUS[ev.status] ?? ev.status,
    };
  }

  async getTotalEvents(): Promise<number> {
    const next = await this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'nextEventId',
    });
    return Number(next);
  }

  async getAllEvents() {
    const total = await this.getTotalEvents();
    const events = await Promise.all(
      Array.from({ length: total }, (_, i) => this.getEvent(i)),
    );
    return events;
  }

  // ─── Matches ───────────────────────────────────────────────────────────────

  async getMatch(matchId: number) {
    const m = await this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'getMatch',
      args: [BigInt(matchId)],
    });

    return {
      matchId: Number(m.matchId),
      eventId: Number(m.eventId),
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      apiMatchId: m.apiMatchId,
      kickoffTime: Number(m.kickoffTime),
      predictionDeadline: Number(m.predictionDeadline),
      status: MATCH_STATUS[m.status] ?? m.status,
      finalHomeScore: m.finalHomeScore,
      finalAwayScore: m.finalAwayScore,
      verifiedAt: Number(m.verifiedAt),
      allowScorePrediction: m.allowScorePrediction,
      allowOutcomePrediction: m.allowOutcomePrediction,
    };
  }

  async getEventMatches(eventId: number) {
    const matchIds = await this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'getEventMatches',
      args: [BigInt(eventId)],
    });

    return Promise.all(
      (matchIds as bigint[]).map((id) => this.getMatch(Number(id))),
    );
  }

  // ─── Participants ──────────────────────────────────────────────────────────

  async getParticipants(eventId: number): Promise<string[]> {
    const participants = await this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'getParticipants',
      args: [BigInt(eventId)],
    });
    return participants as string[];
  }

  async getParticipantCount(eventId: number): Promise<number> {
    const count = await this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'getParticipantCount',
      args: [BigInt(eventId)],
    });
    return Number(count);
  }

  async hasJoined(eventId: number, user: string): Promise<boolean> {
    return this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'hasJoined',
      args: [BigInt(eventId), user as `0x${string}`],
    }) as Promise<boolean>;
  }

  // ─── Predictions ───────────────────────────────────────────────────────────

  async getPrediction(matchId: number, user: string) {
    const p = (await this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'getPrediction',
      args: [BigInt(matchId), user as `0x${string}`],
    })) as unknown as any[];

    return {
      homeScore: p[0],
      awayScore: p[1],
      hasScorePrediction: p[2],
      outcome: OUTCOME_LABEL[p[3]] ?? p[3],
      hasOutcomePrediction: p[4],
      submittedAt: Number(p[5]),
      scorePointsEarned: Number(p[6]),
      outcomePointsEarned: Number(p[7]),
      totalPoints: Number(p[6]) + Number(p[7]),
    };
  }

  // ─── Winners ───────────────────────────────────────────────────────────────

  async getWinners(eventId: number): Promise<string[]> {
    const winners = (await this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'getWinners',
      args: [BigInt(eventId)],
    })) as unknown as string[];
    return winners.filter(
      (w) => w !== '0x0000000000000000000000000000000000000000',
    );
  }

  async getClaimable(eventId: number, user: string): Promise<string> {
    const amount = (await this.client.readContract({
      address: this.eventManagerAddress,
      abi: EVENT_MANAGER_ABI,
      functionName: 'claimable',
      args: [BigInt(eventId), user as `0x${string}`],
    })) as bigint;
    return formatUnits(amount, 18);
  }

  // ─── Leaderboard ───────────────────────────────────────────────────────────

  async getEventLeaderboard(eventId: number, limit = 10) {
    const entries = (await this.client.readContract({
      address: this.leaderboardAddress,
      abi: LEADERBOARD_ABI,
      functionName: 'getTopN',
      args: [BigInt(eventId), BigInt(limit)],
    })) as any[];

    return entries.map((e, i) => ({
      rank: i + 1,
      user: e.user,
      points: Number(e.points),
      firstSubmission: Number(e.firstSubmission),
    }));
  }

  async getUserEventRank(eventId: number, user: string) {
    const result = (await this.client.readContract({
      address: this.leaderboardAddress,
      abi: LEADERBOARD_ABI,
      functionName: 'getUserEventRank',
      args: [BigInt(eventId), user as `0x${string}`],
    })) as [bigint, bigint];

    return { rank: Number(result[0]), points: Number(result[1]) };
  }

  async getGlobalLeaderboard(limit = 10) {
    const entries = (await this.client.readContract({
      address: this.leaderboardAddress,
      abi: LEADERBOARD_ABI,
      functionName: 'getGlobalTopN',
      args: [BigInt(limit)],
    })) as any[];

    return entries.map((e, i) => ({
      rank: i + 1,
      user: e.user,
      points: Number(e.points),
    }));
  }

  async getGlobalPoints(user: string): Promise<number> {
    const points = (await this.client.readContract({
      address: this.leaderboardAddress,
      abi: LEADERBOARD_ABI,
      functionName: 'getGlobalPoints',
      args: [user as `0x${string}`],
    })) as bigint;
    return Number(points);
  }
}

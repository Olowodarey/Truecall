import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  keccak256,
  toBytes,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CREATOR_EVENT_MANAGER_ABI } from '../abi/CreatorEventManager.abi';

const celoSepolia = {
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
    public: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
  },
} as const;

const EVENT_STATUS = ['OPEN', 'CANCELLED'] as const;
const MATCH_STATUS = ['OPEN', 'VERIFIED'] as const;

@Injectable()
export class CreatorEventsService implements OnModuleInit {
  private readonly logger = new Logger(CreatorEventsService.name);
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private contractAddress: `0x${string}`;
  private account: ReturnType<typeof privateKeyToAccount>;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const rpcUrl = this.config.get<string>('CELO_RPC_URL')!;
    const privateKey = this.config.get<string>('PRIVATE_KEY')! as `0x${string}`;

    this.contractAddress = this.config.get<string>(
      'CREATOR_EVENT_MANAGER_ADDRESS',
    )! as `0x${string}`;

    this.account = privateKeyToAccount(privateKey);

    this.publicClient = createPublicClient({
      chain: celoSepolia,
      transport: http(rpcUrl),
    }) as any;

    this.walletClient = createWalletClient({
      chain: celoSepolia,
      transport: http(rpcUrl),
      account: this.account,
    }) as any;

    this.logger.log(`CreatorEventManager: ${this.contractAddress}`);
  }

  // ─── Reads ─────────────────────────────────────────────────────────────────

  async getEvent(eventId: number) {
    const ev = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'getEvent',
      args: [BigInt(eventId)],
    });

    return {
      eventId: Number(ev.eventId),
      creator: ev.creator,
      eventName: ev.eventName,
      createdAt: Number(ev.createdAt),
      status: EVENT_STATUS[ev.status] ?? String(ev.status),
    };
  }

  async getAllEvents() {
    const total = Number(
      await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CREATOR_EVENT_MANAGER_ABI,
        functionName: 'nextEventId',
      }),
    );
    if (total === 0) return [];
    return Promise.all(
      Array.from({ length: total }, (_, i) => this.getEvent(i)),
    );
  }

  async getMatch(matchId: number) {
    const m = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
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
      status: MATCH_STATUS[m.status] ?? String(m.status),
      finalHomeScore: m.finalHomeScore,
      finalAwayScore: m.finalAwayScore,
      verifiedAt: Number(m.verifiedAt),
    };
  }

  async getEventMatches(eventId: number) {
    const ids = (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'getEventMatches',
      args: [BigInt(eventId)],
    })) as bigint[];

    return Promise.all(ids.map((id) => this.getMatch(Number(id))));
  }

  async getMatchWinners(matchId: number) {
    const winners = (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'getMatchWinners',
      args: [BigInt(matchId)],
    })) as Array<{ user: string; submittedAt: bigint }>;

    return winners.map((w) => ({
      user: w.user,
      submittedAt: Number(w.submittedAt),
    }));
  }

  async getParticipants(eventId: number) {
    return (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'getParticipants',
      args: [BigInt(eventId)],
    })) as string[];
  }

  async getParticipantCount(eventId: number) {
    return Number(
      await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CREATOR_EVENT_MANAGER_ABI,
        functionName: 'getParticipantCount',
        args: [BigInt(eventId)],
      }),
    );
  }

  async hasJoined(eventId: number, user: string) {
    return (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'hasJoined',
      args: [BigInt(eventId), user as `0x${string}`],
    })) as boolean;
  }

  async isVerified(user: string) {
    return (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'isVerified',
      args: [user as `0x${string}`],
    })) as boolean;
  }

  async getPrediction(matchId: number, user: string) {
    const p = (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'getPrediction',
      args: [BigInt(matchId), user as `0x${string}`],
    })) as unknown as [number, number, boolean, bigint];

    return {
      homeScore: p[0],
      awayScore: p[1],
      submitted: p[2],
      submittedAt: Number(p[3]),
    };
  }

  async getCreationFee() {
    const fee = (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'creationFee',
    })) as unknown as [string, bigint];

    return {
      token: fee[0],
      amount: formatUnits(fee[1], 18),
      amountRaw: fee[1].toString(),
    };
  }

  // ─── Writes ────────────────────────────────────────────────────────────────

  async verifyAddress(user: string) {
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoSepolia,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'verifyAddress',
      args: [user as `0x${string}`],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return { success: true, transactionHash: receipt.transactionHash, user };
  }

  async verifyAddressBatch(users: string[]) {
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoSepolia,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'verifyAddressBatch',
      args: [users as `0x${string}`[]],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return { success: true, transactionHash: receipt.transactionHash, users };
  }

  async unverifyAddress(user: string) {
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoSepolia,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'unverifyAddress',
      args: [user as `0x${string}`],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return { success: true, transactionHash: receipt.transactionHash, user };
  }

  async withdrawFees(token: string) {
    const tokenAddress =
      token === 'native'
        ? '0x0000000000000000000000000000000000000000'
        : (token as `0x${string}`);

    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoSepolia,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'withdrawFees',
      args: [tokenAddress],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return { success: true, transactionHash: receipt.transactionHash };
  }

  async submitMatchResult(
    matchId: number,
    homeScore: number,
    awayScore: number,
  ) {
    this.logger.log(
      `Submitting result for match ${matchId}: ${homeScore}-${awayScore}`,
    );
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoSepolia,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'submitMatchResult',
      args: [BigInt(matchId), homeScore, awayScore],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    this.logger.log(`Result submitted: ${receipt.transactionHash}`);
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      matchId,
      homeScore,
      awayScore,
    };
  }
}

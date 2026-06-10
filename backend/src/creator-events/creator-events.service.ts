import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CREATOR_EVENT_MANAGER_ABI } from '../abi/CreatorEventManager.abi';

const celoMainnet = {
  id: 42220,
  name: 'Celo',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo.org'] },
    public: { http: ['https://forno.celo.org'] },
  },
} as const;

const EVENT_STATUS = ['OPEN', 'COMPLETED', 'CANCELLED'] as const;
const MATCH_STATUS = ['OPEN', 'VERIFIED'] as const;

/**
 * Short-lived in-memory cache for on-chain reads. The chain stays the source
 * of truth — a cold cache (e.g. right after a redeploy) just means the next
 * request takes the normal RPC round-trip, nothing is lost or goes stale long.
 */
class TTLCache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

// How long cached on-chain reads stay fresh. Event/match/participant data only
// changes via on-chain txs (join, predict, addMatch, oracle results), so a
// short TTL hides RPC latency on repeat page loads without noticeable staleness.
const TTL = {
  EVENT: 30_000,
  EVENT_LIST: 20_000,
  MATCH: 30_000,
  EVENT_MATCHES: 30_000,
  WINNERS: 30_000,
  PARTICIPANTS: 20_000,
  FEE: 5 * 60_000,
  VERIFIED: 60_000,
};

@Injectable()
export class CreatorEventsService implements OnModuleInit {
  private readonly logger = new Logger(CreatorEventsService.name);
  private readonly cache = new TTLCache();
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private contractAddress: `0x${string}`;
  private account: ReturnType<typeof privateKeyToAccount>;

  private async cached<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const hit = this.cache.get<T>(key);
    if (hit !== undefined) return hit;
    const value = await fn();
    this.cache.set(key, value, ttlMs);
    return value;
  }

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const rpcUrl = this.config.get<string>('CELO_RPC_URL')!;
    const rawPrivateKey = this.config.get<string>('PRIVATE_KEY')!;

    this.contractAddress = this.config.get<string>(
      'CREATOR_EVENT_MANAGER_ADDRESS',
    )! as `0x${string}`;

    // Ensure private key has 0x prefix
    const privateKey = this.ensureHexPrefix(rawPrivateKey);

    // Validate private key format
    if (!this.isValidPrivateKey(privateKey)) {
      this.logger.warn(
        '⚠️ Invalid or placeholder PRIVATE_KEY - admin features disabled',
      );

      // Create read-only client
      this.publicClient = createPublicClient({
        chain: celoMainnet,
        transport: http(rpcUrl),
      }) as any;

      this.logger.log(
        `CreatorEventManager: ${this.contractAddress} (read-only)`,
      );
      return;
    }

    this.account = privateKeyToAccount(privateKey);

    this.publicClient = createPublicClient({
      chain: celoMainnet,
      transport: http(rpcUrl),
    }) as any;

    this.walletClient = createWalletClient({
      chain: celoMainnet,
      transport: http(rpcUrl),
      account: this.account,
    }) as any;

    this.logger.log(`CreatorEventManager: ${this.contractAddress}`);
    this.logger.log(`Admin Account: ${this.account.address}`);
  }

  /**
   * Ensure hex prefix on private key
   */
  private ensureHexPrefix(value: string): `0x${string}` {
    if (!value) return '0x' as `0x${string}`;
    return value.startsWith('0x')
      ? (value as `0x${string}`)
      : (`0x${value}` as `0x${string}`);
  }

  /**
   * Check if private key is valid (not a placeholder)
   */
  private isValidPrivateKey(privateKey: string): boolean {
    if (
      !privateKey ||
      privateKey === '0x' ||
      privateKey.includes('YOUR_') ||
      privateKey.includes('PRIVATE_KEY_HERE')
    ) {
      return false;
    }
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    return hexPattern.test(privateKey);
  }

  /**
   * Check if wallet client is available
   */
  private checkWalletAvailable() {
    if (!this.walletClient) {
      throw new Error(
        'Wallet not available - PRIVATE_KEY not configured in environment',
      );
    }
  }

  // ─── Reads ─────────────────────────────────────────────────────────────────

  async getEvent(eventId: number) {
    return this.cached(`event:${eventId}`, TTL.EVENT, async () => {
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
    });
  }

  async getAllEvents() {
    return this.cached('allEvents', TTL.EVENT_LIST, async () => {
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
    });
  }

  async getMatch(matchId: number) {
    return this.cached(`match:${matchId}`, TTL.MATCH, async () => {
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
    });
  }

  async getEventMatches(eventId: number) {
    return this.cached(`eventMatches:${eventId}`, TTL.EVENT_MATCHES, async () => {
      const ids = (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CREATOR_EVENT_MANAGER_ABI,
        functionName: 'getEventMatches',
        args: [BigInt(eventId)],
      })) as bigint[];

      return Promise.all(ids.map((id) => this.getMatch(Number(id))));
    });
  }

  /**
   * Flat list of all OPEN matches across every event, with the event name
   * attached — used by the admin dashboard to pick a match to submit a
   * result for, without hunting down eventId/matchId manually.
   */
  async getOpenMatches() {
    return this.cached('openMatches', TTL.MATCH, async () => {
      const events = await this.getAllEvents();
      const matchesPerEvent = await Promise.all(
        events.map((ev) => this.getEventMatches(ev.eventId)),
      );

      const open: any[] = [];
      events.forEach((ev, i) => {
        for (const m of matchesPerEvent[i]) {
          if (m.status === 'OPEN') {
            open.push({ ...m, eventName: ev.eventName });
          }
        }
      });

      return open.sort((a, b) => a.kickoffTime - b.kickoffTime);
    });
  }

  async getMatchWinners(matchId: number) {
    return this.cached(`winners:${matchId}`, TTL.WINNERS, async () => {
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
    });
  }

  async getParticipants(eventId: number) {
    return this.cached(`participants:${eventId}`, TTL.PARTICIPANTS, async () => {
      return (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CREATOR_EVENT_MANAGER_ABI,
        functionName: 'getParticipants',
        args: [BigInt(eventId)],
      })) as string[];
    });
  }

  async getParticipantCount(eventId: number) {
    return this.cached(`participantCount:${eventId}`, TTL.PARTICIPANTS, async () => {
      return Number(
        await this.publicClient.readContract({
          address: this.contractAddress,
          abi: CREATOR_EVENT_MANAGER_ABI,
          functionName: 'getParticipantCount',
          args: [BigInt(eventId)],
        }),
      );
    });
  }

  async hasJoined(eventId: number, user: string) {
    // Not cached: writes (joinEvent) go directly through the user's wallet,
    // bypassing the backend, so a cache here could show stale "not joined"
    // right after the user's own action.
    return (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'hasJoined',
      args: [BigInt(eventId), user as `0x${string}`],
    })) as boolean;
  }

  async isVerified(user: string) {
    const key = `verified:${user.toLowerCase()}`;
    return this.cached(key, TTL.VERIFIED, async () => {
      return (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CREATOR_EVENT_MANAGER_ABI,
        functionName: 'isVerified',
        args: [user as `0x${string}`],
      })) as boolean;
    });
  }

  async getPrediction(matchId: number, user: string) {
    // Not cached: writes (submitPrediction) go directly through the user's
    // wallet, so a cache here could show a stale "not submitted" right after
    // the user's own action.
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
    return this.cached('creationFee', TTL.FEE, async () => {
      const fee = (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CREATOR_EVENT_MANAGER_ABI,
        functionName: 'creationFee',
      })) as bigint;

      return {
        amount: formatUnits(fee, 18), // e.g. "0.1"
        amountRaw: fee.toString(), // wei string for frontend BigInt conversion
      };
    });
  }

  // ─── Writes ────────────────────────────────────────────────────────────────

  async verifyAddress(user: string) {
    this.checkWalletAvailable();
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoMainnet,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'verifyAddress',
      args: [user as `0x${string}`],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    this.cache.delete(`verified:${user.toLowerCase()}`);
    return { success: true, transactionHash: receipt.transactionHash, user };
  }

  async verifyAddressBatch(users: string[]) {
    this.checkWalletAvailable();
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoMainnet,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'verifyAddressBatch',
      args: [users as `0x${string}`[]],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    for (const u of users) this.cache.delete(`verified:${u.toLowerCase()}`);
    return { success: true, transactionHash: receipt.transactionHash, users };
  }

  async unverifyAddress(user: string) {
    this.checkWalletAvailable();
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoMainnet,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'unverifyAddress',
      args: [user as `0x${string}`],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    this.cache.delete(`verified:${user.toLowerCase()}`);
    return { success: true, transactionHash: receipt.transactionHash, user };
  }

  async withdrawFees(recipient: string) {
    this.checkWalletAvailable();
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoMainnet,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'withdrawFees',
      args: [recipient as `0x${string}`],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      recipient,
    };
  }

  async submitMatchResult(
    matchId: number,
    homeScore: number,
    awayScore: number,
  ) {
    this.checkWalletAvailable();
    this.logger.log(
      `Submitting result for match ${matchId}: ${homeScore}-${awayScore}`,
    );
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: celoMainnet,
      address: this.contractAddress,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: 'submitMatchResult',
      args: [BigInt(matchId), homeScore, awayScore],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    this.logger.log(`Result submitted: ${receipt.transactionHash}`);
    // Submitting a result can flip match status to VERIFIED and may
    // auto-complete the event — clear everything rather than tracking the
    // exact dependency chain. This only runs when the oracle posts a result
    // (a handful of times per event), so the cost is negligible.
    this.cache.clear();
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      matchId,
      homeScore,
      awayScore,
    };
  }
}

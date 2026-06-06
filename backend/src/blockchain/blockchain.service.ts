import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Celo Mainnet chain definition
const celoMainnet = {
  id: 42220,
  name: 'Celo',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo.org'] },
    public: { http: ['https://forno.celo.org'] },
  },
} as const;

/**
 * Blockchain Service - Basic Celo Mainnet connection
 *
 * Note: This service now only provides basic blockchain client access.
 * For Creator Events, use CreatorEventsService which has its own contract client.
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  public publicClient: ReturnType<typeof createPublicClient>;
  public walletClient: ReturnType<typeof createWalletClient>;
  private account: ReturnType<typeof privateKeyToAccount>;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const rpcUrl = this.config.get<string>('CELO_RPC_URL')!;
    const rawPrivateKey = this.config.get<string>('PRIVATE_KEY')!;

    const eventManagerAddress = this.config.get<string>(
      'EVENT_MANAGER_ADDRESS',
    );

    // Ensure private key has 0x prefix
    const privateKey = this.ensureHexPrefix(rawPrivateKey);

    // Validate private key format
    if (!this.isValidPrivateKey(privateKey)) {
      this.logger.warn(
        '⚠️ Invalid or placeholder PRIVATE_KEY in .env - wallet features disabled',
      );
      this.logger.warn(
        'To enable blockchain writes, set PRIVATE_KEY to your admin wallet private key',
      );

      // Create clients without wallet (read-only mode)
      this.publicClient = createPublicClient({
        chain: celoMainnet,
        transport: http(rpcUrl),
      }) as any;

      this.logger.log(`Connected to Celo Mainnet (read-only mode)`);
      if (eventManagerAddress) {
        this.logger.log(`EventManager: ${eventManagerAddress}`);
      }
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

    this.logger.log(`Connected to Celo Mainnet`);
    if (eventManagerAddress) {
      this.logger.log(`EventManager: ${eventManagerAddress}`);
    }
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
    // Check if it's a placeholder
    if (
      !privateKey ||
      privateKey === '0x' ||
      privateKey.includes('YOUR_') ||
      privateKey.includes('PRIVATE_KEY_HERE')
    ) {
      return false;
    }

    // Check if it's valid hex format (0x + 64 hex characters)
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    return hexPattern.test(privateKey);
  }

  getAccount() {
    return this.account;
  }
}

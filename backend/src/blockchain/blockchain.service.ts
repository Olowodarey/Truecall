import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

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

/**
 * Blockchain Service - Basic Celo Sepolia connection
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
    const privateKey = this.config.get<string>('PRIVATE_KEY')! as `0x${string}`;

    const eventManagerAddress = this.config.get<string>(
      'EVENT_MANAGER_ADDRESS',
    );

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

    this.logger.log(`Connected to Celo Sepolia`);
    if (eventManagerAddress) {
      this.logger.log(`EventManager: ${eventManagerAddress}`);
    }
    this.logger.log(`Admin Account: ${this.account.address}`);
  }

  getAccount() {
    return this.account;
  }
}

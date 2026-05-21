export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Blockchain configuration
  blockchain: {
    rpcUrl:
      process.env.CELO_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org',
    privateKey: process.env.PRIVATE_KEY,
    eventManagerAddress: process.env.EVENT_MANAGER_ADDRESS,
    leaderboardAddress: process.env.LEADERBOARD_ADDRESS,
    chainId: parseInt(process.env.CHAIN_ID || '11142220', 10),
  },

  // API configuration
  api: {
    prefix: 'api',
    version: 'v1',
    timeout: 30000,
  },

  // Database configuration (if needed in future)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'truecall',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'json',
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
});

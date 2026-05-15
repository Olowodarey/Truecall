import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}

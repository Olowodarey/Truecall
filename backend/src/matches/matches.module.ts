import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [MatchesController],
})
export class MatchesModule {}

import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { ApiFootballService } from './api-football.service';

@Module({
  imports: [BlockchainModule],
  controllers: [MatchesController],
  providers: [MatchesService, ApiFootballService],
  exports: [MatchesService, ApiFootballService],
})
export class MatchesModule {}

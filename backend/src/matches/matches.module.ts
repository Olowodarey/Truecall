import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MatchesController } from './matches.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { WorldCupApiService } from './world-cup-api.service';
import { DatabaseCacheService } from './database-cache.service';
import { ApiKeyRotatorService } from './api-key-rotator.service';
import { MatchCache, ApiCallLog } from './entities/match-cache.entity';

@Module({
  imports: [
    BlockchainModule,
    TypeOrmModule.forFeature([MatchCache, ApiCallLog]),
    ScheduleModule.forRoot(),
  ],
  controllers: [MatchesController],
  providers: [
    ApiKeyRotatorService,
    WorldCupApiService,
    DatabaseCacheService,
  ],
  exports: [DatabaseCacheService],
})
export class MatchesModule {}

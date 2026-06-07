import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { ApiFootballService } from './api-football.service';
import { WorldCupApiService } from './world-cup-api.service';
import { DatabaseCacheService } from './database-cache.service';
import { MatchCache, ApiCallLog } from './entities/match-cache.entity';

@Module({
  imports: [
    BlockchainModule,
    TypeOrmModule.forFeature([MatchCache, ApiCallLog]),
    ScheduleModule.forRoot(),
  ],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    ApiFootballService,
    WorldCupApiService,
    DatabaseCacheService,
  ],
  exports: [MatchesService, ApiFootballService, DatabaseCacheService],
})
export class MatchesModule {}

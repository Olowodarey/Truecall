import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './blockchain/blockchain.module';
import { MatchesModule } from './matches/matches.module';
import { CreatorEventsModule } from './creator-events/creator-events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BlockchainModule,
    MatchesModule,
    CreatorEventsModule,
  ],
})
export class AppModule {}

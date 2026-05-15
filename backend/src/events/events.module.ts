import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [EventsController],
})
export class EventsModule {}

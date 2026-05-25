import { Module } from '@nestjs/common';
import { CreatorEventsController } from './creator-events.controller';
import { CreatorEventsService } from './creator-events.service';

@Module({
  controllers: [CreatorEventsController],
  providers: [CreatorEventsService],
  exports: [CreatorEventsService],
})
export class CreatorEventsModule {}

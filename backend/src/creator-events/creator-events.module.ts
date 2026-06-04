import { Module, forwardRef } from '@nestjs/common';
import { CreatorEventsController } from './creator-events.controller';
import { CreatorEventsService } from './creator-events.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [CreatorEventsController],
  providers: [CreatorEventsService],
  exports: [CreatorEventsService],
})
export class CreatorEventsModule {}

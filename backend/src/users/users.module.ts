import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreatorEventsModule } from '../creator-events/creator-events.module';

@Module({
  imports: [forwardRef(() => CreatorEventsModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

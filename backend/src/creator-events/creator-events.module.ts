import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatorEventsController } from './creator-events.controller';
import { CreatorEventsService } from './creator-events.service';
import { EventMeta } from './event-meta.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventMeta]),
    forwardRef(() => UsersModule),
  ],
  controllers: [CreatorEventsController],
  providers: [CreatorEventsService],
  exports: [CreatorEventsService],
})
export class CreatorEventsModule {}

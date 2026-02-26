import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { FootballApiModule } from '../football-api/football-api.module';

@Module({
  imports: [FootballApiModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}

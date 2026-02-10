import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { FootballApiModule } from '../football-api/football-api.module';
import { OracleModule } from '../oracle/oracle.module';

@Module({
  imports: [FootballApiModule, OracleModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FootballApiService } from '../football-api/football-api.service';
import { MatchStatus } from '../database/entities';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly footballApiService: FootballApiService) {}

  /**
   * Sync matches from API every 10 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncMatches() {
    this.logger.log('Running scheduled match sync');

    try {
      const matches = await this.footballApiService.fetchUpcomingMatches();
      this.logger.log(`Synced ${matches.length} matches from API`);
    } catch (error) {
      this.logger.error(`Error syncing matches: ${error.message}`);
    }
  }
}

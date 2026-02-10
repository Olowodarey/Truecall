import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FootballApiService } from '../football-api/football-api.service';
import { OracleService } from '../oracle/oracle.service';
import { MatchStatus } from '../database/entities';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly footballApiService: FootballApiService,
    private readonly oracleService: OracleService,
  ) {}

  /**
   * Check for completed matches every 30 minutes
   * and submit results to the contract
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkAndSubmitResults() {
    this.logger.log('Running scheduled check for completed matches');

    try {
      // Get all completed matches that haven't been submitted
      const completedMatches =
        await this.footballApiService.getCompletedMatches();

      this.logger.log(
        `Found ${completedMatches.length} completed matches to submit`,
      );

      for (const match of completedMatches) {
        try {
          // Only submit if match has an associated event
          if (!match.eventId) {
            this.logger.warn(`Match ${match.id} has no event, skipping`);
            continue;
          }

          this.logger.log(
            `Submitting result for match ${match.id}: ${match.homeTeam} vs ${match.awayTeam}`,
          );

          const result = await this.oracleService.submitResult(match.id);

          this.logger.log(
            `Successfully submitted result for match ${match.id}, tx: ${result.transactionId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to submit result for match ${match.id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error in scheduled result check: ${error.message}`);
    }
  }

  /**
   * Sync matches from API every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncMatches() {
    this.logger.log('Running scheduled match sync');

    try {
      const matches = await this.footballApiService.fetchUpcomingMatches();
      this.logger.log(`Synced ${matches.length} matches from API`);
    } catch (error) {
      this.logger.error(`Error syncing matches: ${error.message}`);
    }
  }

  /**
   * Close events for matches that are about to start (1 hour before)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async closeUpcomingEvents() {
    this.logger.log('Checking for events to close');

    try {
      const events = await this.oracleService.getAllEvents();
      const now = Math.floor(Date.now() / 1000);
      const oneHourFromNow = now + 3600;

      for (const event of events) {
        // Close events 1 hour before match starts
        if (
          event.status === 'open' &&
          event.match &&
          event.match.matchTime <= oneHourFromNow &&
          event.match.matchTime > now
        ) {
          try {
            this.logger.log(`Closing event ${event.id} - match starting soon`);
            await this.oracleService.closeEvent(event.id);
          } catch (error) {
            this.logger.error(
              `Failed to close event ${event.id}: ${error.message}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error closing events: ${error.message}`);
    }
  }
}

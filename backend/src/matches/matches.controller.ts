import { Controller, Get, Param, Post, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DatabaseCacheService } from './database-cache.service';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  private readonly logger = new Logger(MatchesController.name);

  constructor(private readonly databaseCache: DatabaseCacheService) {}

  @Get()
  @ApiOperation({ summary: 'Get matches from database cache' })
  @ApiQuery({ name: 'league', required: false })
  @ApiQuery({ name: 'status', required: false, description: 'finished | FT' })
  @ApiQuery({ name: 'upcoming', required: false, description: 'true' })
  async getAllMatches(
    @Query('league') league?: string,
    @Query('status') status?: string,
  ) {
    if (status === 'finished' || status === 'FT') {
      return this.databaseCache.getFinishedMatches();
    }
    if (league) {
      return this.databaseCache.getMatchesByLeague(league);
    }
    return this.databaseCache.getUpcomingMatches();
  }

  @Get('stats/usage')
  @ApiOperation({ summary: 'Get API usage statistics' })
  getApiUsageStats() {
    return this.databaseCache.getUsageStats();
  }

  @Get('stats/database')
  @ApiOperation({ summary: 'Get database cache statistics' })
  async getDatabaseStats() {
    return this.databaseCache.getDatabaseStats();
  }

  @Get('priority')
  @ApiOperation({ summary: 'Get upcoming priority matches (World Cup + Friendlies)' })
  async getPriorityMatches() {
    return this.databaseCache.getUpcomingMatches();
  }

  @Get('sync/trigger')
  @ApiOperation({ summary: 'Manually trigger priority matches sync' })
  async triggerSync() {
    this.logger.log('Manual sync triggered');
    await this.databaseCache.syncPriorityMatches();
    return {
      message: 'Sync triggered successfully',
      stats: await this.databaseCache.getDatabaseStats(),
    };
  }

  /**
   * Force-refresh a single match directly from the API by its fixture ID.
   * Use this to unstick a match whose status hasn't updated via the CRON.
   * Example: POST /matches/admin/refresh/1546502
   */
  @Post('admin/refresh/:fixtureId')
  @ApiOperation({ summary: 'Force-refresh a single match from API-Football by fixture ID' })
  @ApiParam({ name: 'fixtureId', description: 'API-Football fixture ID (numbers only, e.g. 1546502)' })
  async forceRefreshMatch(@Param('fixtureId') fixtureId: string) {
    this.logger.log(`Force refresh requested for fixture ${fixtureId}`);
    const fixture = await this.databaseCache.forceRefreshMatch(fixtureId);
    if (!fixture) {
      return { error: `Fixture ${fixtureId} not found in API-Football` };
    }
    return {
      message: 'Match refreshed successfully',
      status: fixture.fixture.status.short,
      home: `${fixture.teams.home.name} ${fixture.score.fulltime.home ?? '?'}`,
      away: `${fixture.teams.away.name} ${fixture.score.fulltime.away ?? '?'}`,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a match by ID (e.g. api_123)' })
  @ApiParam({ name: 'id', description: 'Match ID (api_*)' })
  async getMatchById(@Param('id') id: string) {
    const match = await this.databaseCache.getMatchById(id);
    return match ?? { error: 'Match not found' };
  }
}

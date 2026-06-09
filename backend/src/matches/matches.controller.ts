import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a match by ID (e.g. api_123)' })
  @ApiParam({ name: 'id', description: 'Match ID (api_*)' })
  async getMatchById(@Param('id') id: string) {
    const match = await this.databaseCache.getMatchById(id);
    return match ?? { error: 'Match not found' };
  }
}

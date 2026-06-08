import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MatchesService, Match } from './matches.service';
import { DatabaseCacheService } from './database-cache.service';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  private readonly logger = new Logger(MatchesController.name);

  constructor(
    private readonly matchesService: MatchesService,
    private readonly databaseCache: DatabaseCacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all available matches from database cache' })
  @ApiQuery({
    name: 'league',
    required: false,
    description: 'Filter by league name',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by match status (live, finished, upcoming)',
  })
  @ApiQuery({
    name: 'upcoming',
    required: false,
    description: 'Get only upcoming matches (from database)',
  })
  async getAllMatches(
    @Query('league') league?: string,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    this.logger.log('Fetching matches from database cache');

    // Finished matches from database
    if (status === 'finished' || status === 'FT') {
      return await this.databaseCache.getFinishedMatches();
    }

    // Upcoming matches from database
    if (upcoming === 'true') {
      return await this.databaseCache.getUpcomingMatches();
    }

    // League filter
    if (league) {
      return await this.databaseCache.getMatchesByLeague(league);
    }

    // Default: upcoming matches
    return await this.databaseCache.getUpcomingMatches();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get matches statistics' })
  getStatistics() {
    this.logger.log('Fetching matches statistics');
    return this.matchesService.getStatistics();
  }

  @Get('random')
  @ApiOperation({ summary: 'Get random matches for testing' })
  @ApiQuery({
    name: 'count',
    required: false,
    description: 'Number of random matches to return',
  })
  getRandomMatches(@Query('count') count?: string) {
    const matchCount = count ? parseInt(count, 10) : 5;
    this.logger.log(`Fetching ${matchCount} random matches`);
    return this.matchesService.getRandomMatches(matchCount);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming matches (next 7 days)' })
  getUpcomingMatches() {
    this.logger.log('Fetching upcoming matches');
    return this.matchesService.getUpcomingMatches();
  }

  @Get('league/:league')
  @ApiOperation({ summary: 'Get matches by league' })
  @ApiParam({ name: 'league', description: 'League name' })
  getMatchesByLeague(@Param('league') league: string) {
    this.logger.log(`Fetching matches for league: ${league}`);
    return this.matchesService.getMatchesByLeague(league);
  }

  @Get('team/:teamId')
  @ApiOperation({ summary: 'Get matches for a specific team' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  getMatchesByTeam(@Param('teamId') teamId: string) {
    this.logger.log(`Fetching matches for team: ${teamId}`);
    return this.matchesService.getMatchesByTeam(teamId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search matches by team name' })
  @ApiQuery({ name: 'team', description: 'Team name to search' })
  searchMatches(@Query('team') teamName: string) {
    this.logger.log(`Searching matches for team: ${teamName}`);
    return this.matchesService.searchMatchesByTeamName(teamName);
  }

  @Get('stats/usage')
  @ApiOperation({ summary: 'Get API usage statistics' })
  getApiUsageStats() {
    return this.databaseCache.getUsageStats();
  }

  @Get('stats/database')
  @ApiOperation({ summary: 'Get database cache statistics' })
  async getDatabaseStats() {
    return await this.databaseCache.getDatabaseStats();
  }

  @Get('priority')
  @ApiOperation({
    summary: 'Get all priority matches (World Cup + Friendlies) from database',
  })
  async getPriorityMatches() {
    this.logger.log('Fetching priority matches from database');
    return await this.databaseCache.getUpcomingMatches();
  }

  @Get('sync/trigger')
  @ApiOperation({
    summary: 'Manually trigger priority matches sync (for testing)',
  })
  async triggerSync() {
    this.logger.log('Manually triggering priority matches sync');
    await this.databaseCache.syncPriorityMatches();
    return {
      message: 'Sync triggered successfully',
      stats: await this.databaseCache.getDatabaseStats(),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a match by fixture ID from database (e.g., api_123)',
  })
  @ApiParam({
    name: 'id',
    description: 'Match fixture ID (e.g., api_123 or match_001)',
  })
  async getMatchById(@Param('id') id: string) {
    this.logger.log(`Fetching match: ${id}`);

    // For API-Football matches (api_*), try to fetch live data first if status is not FT
    if (id.startsWith('api_')) {
      const cachedMatch = await this.databaseCache.getMatchById(id);

      // If cached match exists and is already finished, return it
      if (cachedMatch && cachedMatch.status === 'FT') {
        this.logger.log(
          `Match ${id} is finished in cache, returning cached data`,
        );
        return cachedMatch;
      }

      // Otherwise, fetch live data from API-Football
      try {
        const fixtureId = parseInt(id.replace('api_', ''), 10);
        this.logger.log(
          `Fetching live data for fixture ${fixtureId} from API-Football`,
        );
        const liveMatch = await this.matchesService.getMatchByApiId(fixtureId);

        if (liveMatch) {
          this.logger.log(
            `Found live data for ${id}, status: ${liveMatch.status}`,
          );
          return liveMatch;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch live data for ${id}, falling back to cache`,
          error.message,
        );
      }

      // Fallback to cached data if live fetch fails
      if (cachedMatch) {
        return cachedMatch;
      }
    }

    // Try database cache for non-API matches
    const cachedMatch = await this.databaseCache.getMatchById(id);
    if (cachedMatch) {
      return cachedMatch;
    }

    // Fallback to old JSON data if exists
    const match = this.matchesService.getMatchById(id);
    if (!match) {
      return { error: 'Match not found' };
    }
    return match;
  }

  @Get('realtime/live')
  @ApiOperation({ summary: 'Get live matches from real-time API' })
  async getLiveMatches() {
    this.logger.log('Fetching real-time live matches');
    return await this.matchesService.getLiveMatches();
  }

  @Get('realtime/finished')
  @ApiOperation({
    summary: 'Get finished matches from real-time API (last 7 days)',
  })
  async getFinishedMatches() {
    this.logger.log('Fetching real-time finished matches');
    return await this.matchesService.getFinishedMatches();
  }

  @Get('realtime/upcoming')
  @ApiOperation({
    summary: 'Get upcoming matches from real-time API (next 7 days)',
  })
  async getUpcomingMatchesRealtime() {
    this.logger.log('Fetching real-time upcoming matches');
    return await this.matchesService.getUpcomingMatchesFromApi();
  }

  @Get('realtime/date/:date')
  @ApiOperation({
    summary: 'Get matches by date from real-time API (YYYY-MM-DD)',
  })
  @ApiParam({ name: 'date', description: 'Date in YYYY-MM-DD format' })
  async getMatchesByDate(@Param('date') date: string) {
    this.logger.log(`Fetching real-time matches for date: ${date}`);
    return await this.matchesService.getMatchesByDate(date);
  }

  @Get('realtime/fixture/:fixtureId')
  @ApiOperation({ summary: 'Get match by API-Football fixture ID' })
  @ApiParam({ name: 'fixtureId', description: 'API-Football fixture ID' })
  async getMatchByFixtureId(@Param('fixtureId') fixtureId: string) {
    this.logger.log(`Fetching real-time fixture: ${fixtureId}`);
    const id = parseInt(fixtureId, 10);
    const match = await this.matchesService.getMatchByApiId(id);
    if (!match) {
      return { error: 'Match not found' };
    }
    return match;
  }

  @Get('realtime/status')
  @ApiOperation({ summary: 'Check real-time API status' })
  getRealTimeStatus() {
    return {
      available: this.matchesService.isRealTimeDataAvailable(),
      provider: 'API-Football',
      endpoint: 'https://v3.football.api-sports.io',
    };
  }
}

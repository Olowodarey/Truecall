import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MatchesService, Match } from './matches.service';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  private readonly logger = new Logger(MatchesController.name);

  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available matches' })
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
    description: 'Get only upcoming matches (next 7 days)',
  })
  @ApiQuery({
    name: 'realtime',
    required: false,
    description: 'Force real-time API fetch',
  })
  async getAllMatches(
    @Query('league') league?: string,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
    @Query('realtime') realtime?: string,
  ) {
    this.logger.log('Fetching matches');

    // Real-time live matches
    if (status === 'live' || realtime === 'live') {
      return await this.matchesService.getLiveMatches();
    }

    // Real-time finished matches
    if (status === 'finished' || status === 'FT') {
      return await this.matchesService.getFinishedMatches();
    }

    // Real-time upcoming matches
    if (upcoming === 'true' || realtime === 'upcoming') {
      return await this.matchesService.getUpcomingMatchesFromApi();
    }

    if (league) {
      return this.matchesService.getMatchesByLeague(league);
    }

    if (status) {
      return this.matchesService.getMatchesByStatus(status);
    }

    return this.matchesService.getAllMatches();
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

  @Get(':id')
  @ApiOperation({
    summary: 'Get a match by fixture ID (e.g., match_001)',
  })
  @ApiParam({
    name: 'id',
    description: 'Match fixture ID (e.g., match_001)',
  })
  getMatchById(@Param('id') id: string) {
    this.logger.log(`Fetching match: ${id}`);

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

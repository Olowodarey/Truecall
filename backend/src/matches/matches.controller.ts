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
    description: 'Filter by match status',
  })
  @ApiQuery({
    name: 'upcoming',
    required: false,
    description: 'Get only upcoming matches (next 7 days)',
  })
  getAllMatches(
    @Query('league') league?: string,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    this.logger.log('Fetching matches');

    if (upcoming === 'true') {
      return this.matchesService.getUpcomingMatches();
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
  @ApiOperation({ summary: 'Get a specific match by ID' })
  @ApiParam({ name: 'id', description: 'Match ID' })
  getMatchById(@Param('id') id: string) {
    this.logger.log(`Fetching match: ${id}`);
    const match = this.matchesService.getMatchById(id);
    if (!match) {
      return { error: 'Match not found' };
    }
    return match;
  }
}

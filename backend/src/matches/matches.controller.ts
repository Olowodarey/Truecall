import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MatchesService, Match } from './matches.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  private readonly logger = new Logger(MatchesController.name);

  constructor(
    private readonly matchesService: MatchesService,
    private readonly blockchain: BlockchainService,
  ) {}

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

  // ─── On-chain match data (numeric matchId from contract) ───────────────────

  @Get(':id/prediction/:address')
  @ApiOperation({ summary: "Get a user's prediction for a match" })
  @ApiParam({ name: 'id', type: Number, description: 'On-chain match ID' })
  @ApiParam({ name: 'address', description: 'User wallet address' })
  async getPrediction(
    @Param('id') id: string,
    @Param('address') address: string,
  ) {
    this.logger.log(`Fetching prediction for match ${id} by ${address}`);
    return this.blockchain.getPrediction(Number(id), address);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a match by on-chain ID (numeric) or fixture ID (string)',
  })
  @ApiParam({
    name: 'id',
    description:
      'Match ID (numeric on-chain ID or fixture string like match_001)',
  })
  async getMatchById(@Param('id') id: string) {
    this.logger.log(`Fetching match: ${id}`);

    // If numeric, fetch from blockchain
    const numericId = Number(id);
    if (!isNaN(numericId) && String(numericId) === id) {
      return this.blockchain.getMatch(numericId);
    }

    // Otherwise fetch from fixture JSON
    const match = this.matchesService.getMatchById(id);
    if (!match) {
      return { error: 'Match not found' };
    }
    return match;
  }
}

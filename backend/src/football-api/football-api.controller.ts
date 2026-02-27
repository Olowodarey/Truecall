import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { FootballApiService } from './football-api.service';
import { Match } from '../database/entities';

@Controller('api/matches')
export class FootballApiController {
  constructor(private readonly footballApiService: FootballApiService) {}

  @Get('upcoming')
  async getUpcomingMatches(
    @Query('league') league?: string,
    @Query('date') date?: string,
  ): Promise<Match[]> {
    // Fetch upcoming matches directly from external API based on user request
    await this.footballApiService.fetchUpcomingMatches(league, date);
    return this.footballApiService.getUpcomingMatches();
  }

  @Get('all')
  async getAllMatches(): Promise<Match[]> {
    return this.footballApiService.getAllMatches();
  }

  @Get(':id')
  async getMatchById(@Param('id') id: number): Promise<Match | null> {
    return this.footballApiService.getMatchById(id);
  }

  @Post('sync')
  async syncMatches(
    @Body('league') league?: string,
  ): Promise<{ message: string; count: number }> {
    const matches = await this.footballApiService.fetchUpcomingMatches(league);
    return {
      message: 'Matches synced successfully',
      count: matches.length,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Match, MatchStatus, MatchResult } from '../database/entities';

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);
  private readonly apiKey: string;
  private readonly apiBaseUrl: string;
  private readonly provider: string;

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('SPORTS_API_KEY') || '';
    this.apiBaseUrl =
      this.configService.get<string>('SPORTS_API_BASE_URL') || '';
    this.provider =
      this.configService.get<string>('SPORTS_API_PROVIDER') || 'api-football';
  }

  /**
   * Fetch upcoming matches from the sports API
   * Fetches from multiple top leagues to provide more match options
   */
  async fetchUpcomingMatches(league?: string, date?: string): Promise<Match[]> {
    try {
      this.logger.log('Fetching upcoming matches from API');

      // For API-Football
      if (this.provider === 'api-football') {
        // Top leagues to fetch from
        const leagues = league
          ? [league]
          : [
              '39', // Premier League
              '140', // La Liga
              '78', // Bundesliga
              '135', // Serie A
              '61', // Ligue 1
              '2', // UEFA Champions League
            ];

        const allMatches: Match[] = [];

        // Calculate date range: today to 30 days from now
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);

        const fromDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const toDate = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD

        this.logger.log(`Fetching matches from ${fromDate} to ${toDate}`);

        // Fetch matches from leagues in parallel
        await Promise.all(
          leagues.map(async (leagueId) => {
            try {
              const response = await axios.get(`${this.apiBaseUrl}/fixtures`, {
                headers: {
                  'x-rapidapi-key': this.apiKey,
                  'x-rapidapi-host': 'v3.football.api-sports.io',
                },
                params: {
                  league: leagueId,
                  season:
                    today.getMonth() < 7
                      ? today.getFullYear() - 1
                      : today.getFullYear(),
                  from: fromDate,
                  to: toDate,
                },
              });

              const matches = await this.processApiFootballResponse(
                response.data,
              );
              allMatches.push(...matches);

              this.logger.log(
                `Fetched ${matches.length} matches from league ${leagueId}`,
              );
            } catch (error) {
              this.logger.warn(
                `Failed to fetch from league ${leagueId}: ${error.message}`,
              );
              // Continue with other leagues even if one fails
            }
          }),
        );

        return allMatches;
      }

      // For TheSportsDB (free tier)
      if (this.provider === 'thesportsdb') {
        const response = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/${this.apiKey}/eventsnextleague.php`,
          {
            params: {
              id: league || '4328', // Default to Premier League
            },
          },
        );

        return this.processTheSportsDBResponse(response.data);
      }

      throw new Error(`Unsupported provider: ${this.provider}`);
    } catch (error) {
      this.logger.error('Error fetching matches:', error.message);
      throw error;
    }
  }

  /**
   * Get match by ID
   */
  async getMatchById(id: number): Promise<Match | null> {
    return this.matchRepository.findOne({ where: { id } });
  }

  /**
   * Get all matches
   */
  async getAllMatches(): Promise<Match[]> {
    return this.matchRepository.find({
      order: { matchTime: 'ASC' },
    });
  }

  /**
   * Get upcoming matches from database
   */
  async getUpcomingMatches(): Promise<Match[]> {
    const now = Math.floor(Date.now() / 1000);
    return this.matchRepository.find({
      where: {
        status: MatchStatus.SCHEDULED,
      },
      order: { matchTime: 'ASC' },
    });
  }

  /**
   * Update match status
   */
  async updateMatchStatus(
    matchId: number,
    status: MatchStatus,
    result?: MatchResult,
  ): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error(`Match with ID ${matchId} not found`);
    }

    match.status = status;
    if (result !== undefined) {
      match.result = result;
    }

    return this.matchRepository.save(match);
  }

  /**
   * Process API-Football response
   */
  private async processApiFootballResponse(data: any): Promise<Match[]> {
    const fixtures = data.response || [];

    const matches = await Promise.all(
      fixtures.map(async (fixture: any): Promise<Match> => {
        const existingMatch = await this.matchRepository.findOne({
          where: { externalId: fixture.fixture.id.toString() },
        });

        if (existingMatch) {
          // Update existing match with latest score/status
          existingMatch.status = this.mapApiFootballStatus(
            fixture.fixture.status.short,
          );
          existingMatch.homeScore = fixture.goals.home;
          existingMatch.awayScore = fixture.goals.away;
          existingMatch.result = this.calculateResult(
            fixture.goals.home,
            fixture.goals.away,
          );

          return await this.matchRepository.save(existingMatch);
        }

        const match = this.matchRepository.create({
          externalId: fixture.fixture.id.toString(),
          homeTeam: fixture.teams.home.name,
          awayTeam: fixture.teams.away.name,
          matchTime: Math.floor(
            new Date(fixture.fixture.date).getTime() / 1000,
          ),
          status: this.mapApiFootballStatus(fixture.fixture.status.short),
          homeScore: fixture.goals.home,
          awayScore: fixture.goals.away,
          result: this.calculateResult(fixture.goals.home, fixture.goals.away),
        });

        return await this.matchRepository.save(match);
      }),
    );

    return matches;
  }

  /**
   * Process TheSportsDB response
   */
  private async processTheSportsDBResponse(data: any): Promise<Match[]> {
    const events = data.events || [];

    const matches = await Promise.all(
      events.map(async (event: any): Promise<Match> => {
        const existingMatch = await this.matchRepository.findOne({
          where: { externalId: event.idEvent },
        });

        if (existingMatch) {
          existingMatch.status = MatchStatus.SCHEDULED; // Simplified for this provider
          existingMatch.homeScore = event.intHomeScore
            ? parseInt(event.intHomeScore)
            : null;
          existingMatch.awayScore = event.intAwayScore
            ? parseInt(event.intAwayScore)
            : null;
          existingMatch.result = this.calculateResult(
            existingMatch.homeScore ?? null,
            existingMatch.awayScore ?? null,
          );

          return await this.matchRepository.save(existingMatch);
        }

        const match = this.matchRepository.create({
          externalId: event.idEvent,
          homeTeam: event.strHomeTeam,
          awayTeam: event.strAwayTeam,
          matchTime: Math.floor(
            new Date(event.dateEvent + ' ' + event.strTime).getTime() / 1000,
          ),
          status: MatchStatus.SCHEDULED,
          homeScore: event.intHomeScore ? parseInt(event.intHomeScore) : null,
          awayScore: event.intAwayScore ? parseInt(event.intAwayScore) : null,
        });

        return await this.matchRepository.save(match);
      }),
    );

    return matches;
  }

  /**
   * Map API-Football status to our status
   */
  private mapApiFootballStatus(status: string): MatchStatus {
    const statusMap = {
      NS: MatchStatus.SCHEDULED,
      LIVE: MatchStatus.LIVE,
      '1H': MatchStatus.LIVE,
      HT: MatchStatus.LIVE,
      '2H': MatchStatus.LIVE,
      ET: MatchStatus.LIVE,
      P: MatchStatus.LIVE,
      FT: MatchStatus.COMPLETED,
      AET: MatchStatus.COMPLETED,
      PEN: MatchStatus.COMPLETED,
      CANC: MatchStatus.CANCELLED,
      ABD: MatchStatus.CANCELLED,
      PST: MatchStatus.SCHEDULED,
    };

    return statusMap[status] || MatchStatus.SCHEDULED;
  }

  /**
   * Calculate match result from scores
   */
  private calculateResult(
    homeScore: number | null,
    awayScore: number | null,
  ): MatchResult | null {
    if (homeScore === null || awayScore === null) {
      return null;
    }

    if (homeScore > awayScore) {
      return MatchResult.HOME_WIN;
    } else if (homeScore < awayScore) {
      return MatchResult.AWAY_WIN;
    } else {
      return MatchResult.DRAW;
    }
  }
}

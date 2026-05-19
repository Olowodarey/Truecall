import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { BlockchainService } from '../blockchain/blockchain.service';

// DTO for creating an event
class CreateEventDto {
  eventName: string;
  startDate: number;
  endDate: number;
  entryToken: string; // Token address (any Celo native token)
  entryFee: string; // in token units
  scoringRule: number; // 0=ExactOnly, 1=OutcomeOnly, 2=Both
}

// DTO for joining an event
class JoinEventDto {
  eventId: number;
  userAddress: string;
}

// Response DTOs for API documentation
class EventResponse {
  eventId: number;
  eventType: string;
  creator: string;
  eventName: string;
  startDate: number;
  endDate: number;
  entryFee: string;
  prizePool: string;
  maxParticipants: number;
  status: string;
  entryToken: string;
}

class MatchResponse {
  matchId: number;
  eventId: number;
  homeTeam: string;
  awayTeam: string;
  status: string;
  kickoffTime: number;
  predictionDeadline: number;
}

@ApiTags('Events')
@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly blockchain: BlockchainService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new public event (admin only)' })
  async createEvent(@Body() dto: CreateEventDto) {
    try {
      this.logger.log(`Creating event: ${dto.eventName}`);
      const result = await this.blockchain.createPublicEvent(
        dto.eventName,
        dto.startDate,
        dto.endDate,
        dto.entryToken,
        dto.entryFee,
        dto.scoringRule,
      );
      this.logger.log(`Event created successfully: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create event: ${error}`);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create event',
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  async getAllEvents() {
    return this.blockchain.getAllEvents();
  }

  // Specific routes first (before :id)
  @Post(':id/addMatch')
  @ApiOperation({ summary: 'Add a match to an event (admin only)' })
  @ApiParam({ name: 'id', type: Number })
  async addMatch(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    try {
      this.logger.log(
        `Adding match to event ${id}: ${dto.homeTeam} vs ${dto.awayTeam}`,
      );
      const result = await this.blockchain.addMatch(
        id,
        dto.homeTeam,
        dto.awayTeam,
        dto.apiMatchId,
        dto.kickoffTime,
        dto.predictionDeadline,
        dto.allowScorePrediction,
        dto.allowOutcomePrediction,
      );
      this.logger.log(`Match added successfully to event ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to add match to event ${id}: ${error}`);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to add match',
      );
    }
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join an event (handles approval + join)' })
  @ApiParam({ name: 'id', type: Number })
  async joinEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JoinEventDto,
  ) {
    try {
      return await this.blockchain.joinEvent(id, dto.userAddress);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to join event',
      );
    }
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'Get all matches in an event' })
  @ApiParam({ name: 'id', type: Number })
  async getEventMatches(@Param('id', ParseIntPipe) id: number) {
    return this.blockchain.getEventMatches(id);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get all participants in an event' })
  @ApiParam({ name: 'id', type: Number })
  async getParticipants(@Param('id', ParseIntPipe) id: number) {
    return {
      eventId: id,
      count: await this.blockchain.getParticipantCount(id),
      participants: await this.blockchain.getParticipants(id),
    };
  }

  @Get(':id/winners')
  @ApiOperation({ summary: 'Get winners of a resolved event' })
  @ApiParam({ name: 'id', type: Number })
  async getWinners(@Param('id', ParseIntPipe) id: number) {
    return {
      eventId: id,
      winners: await this.blockchain.getWinners(id),
    };
  }

  @Get(':id/joined/:address')
  @ApiOperation({ summary: 'Check if a user has joined an event' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'address', type: String })
  async hasJoined(
    @Param('id', ParseIntPipe) id: number,
    @Param('address') address: string,
  ) {
    return {
      eventId: id,
      user: address,
      joined: await this.blockchain.hasJoined(id, address),
    };
  }

  @Get(':id/claimable/:address')
  @ApiOperation({ summary: 'Get claimable prize amount for a user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'address', type: String })
  async getClaimable(
    @Param('id', ParseIntPipe) id: number,
    @Param('address') address: string,
  ) {
    const event = await this.blockchain.getEvent(id);
    return {
      eventId: id,
      user: address,
      claimable: await this.blockchain.getClaimable(id, address),
      entryToken: event.entryToken,
    };
  }

  // Generic :id route last (catches all other :id requests)
  @Get(':id')
  @ApiOperation({ summary: 'Get a single event by ID' })
  @ApiParam({ name: 'id', type: Number })
  async getEvent(@Param('id', ParseIntPipe) id: number) {
    return this.blockchain.getEvent(id);
  }
}

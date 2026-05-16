import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
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

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly blockchain: BlockchainService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new public event (admin only)' })
  async createEvent(@Body() dto: CreateEventDto) {
    return await this.blockchain.createPublicEvent(
      dto.eventName,
      dto.startDate,
      dto.endDate,
      dto.entryToken,
      dto.entryFee,
      dto.scoringRule,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  async getAllEvents() {
    return this.blockchain.getAllEvents();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single event by ID' })
  @ApiParam({ name: 'id', type: Number })
  async getEvent(@Param('id', ParseIntPipe) id: number) {
    return this.blockchain.getEvent(id);
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

  @Post(':id/join')
  @ApiOperation({ summary: 'Join an event (handles approval + join)' })
  @ApiParam({ name: 'id', type: Number })
  async joinEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JoinEventDto,
  ) {
    return await this.blockchain.joinEvent(id, dto.userAddress);
  }
  @ApiOperation({ summary: 'Get claimable prize amount for a user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'address', type: String })
  async getClaimable(
    @Param('id', ParseIntPipe) id: number,
    @Param('address') address: string,
  ) {
    return {
      eventId: id,
      user: address,
      claimable: await this.blockchain.getClaimable(id, address),
      currency: 'cUSD',
    };
  }
}

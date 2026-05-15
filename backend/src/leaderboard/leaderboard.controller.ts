import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BlockchainService } from '../blockchain/blockchain.service';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly blockchain: BlockchainService) {}

  @Get('global')
  @ApiOperation({ summary: 'Get global all-time leaderboard' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max entries (default 10)',
  })
  async getGlobalLeaderboard(@Query('limit') limit = 10) {
    return {
      leaderboard: await this.blockchain.getGlobalLeaderboard(Number(limit)),
    };
  }

  @Get('global/:address')
  @ApiOperation({ summary: "Get a user's global all-time points" })
  @ApiParam({ name: 'address', type: String })
  async getGlobalPoints(@Param('address') address: string) {
    return {
      user: address,
      points: await this.blockchain.getGlobalPoints(address),
    };
  }

  @Get('event/:id')
  @ApiOperation({ summary: 'Get leaderboard for a specific event' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max entries (default 10)',
  })
  async getEventLeaderboard(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit = 10,
  ) {
    return {
      eventId: id,
      leaderboard: await this.blockchain.getEventLeaderboard(id, Number(limit)),
    };
  }

  @Get('event/:id/:address')
  @ApiOperation({ summary: "Get a user's rank in a specific event" })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'address', type: String })
  async getUserEventRank(
    @Param('id', ParseIntPipe) id: number,
    @Param('address') address: string,
  ) {
    return {
      eventId: id,
      user: address,
      ...(await this.blockchain.getUserEventRank(id, address)),
    };
  }
}

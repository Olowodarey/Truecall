import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { BlockchainService } from '../blockchain/blockchain.service';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly blockchain: BlockchainService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a single match by ID' })
  @ApiParam({ name: 'id', type: Number })
  async getMatch(@Param('id', ParseIntPipe) id: number) {
    return this.blockchain.getMatch(id);
  }

  @Get(':id/prediction/:address')
  @ApiOperation({ summary: "Get a user's prediction for a match" })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'address', type: String })
  async getPrediction(
    @Param('id', ParseIntPipe) id: number,
    @Param('address') address: string,
  ) {
    return {
      matchId: id,
      user: address,
      ...(await this.blockchain.getPrediction(id, address)),
    };
  }
}

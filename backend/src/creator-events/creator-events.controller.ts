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
import { CreatorEventsService } from './creator-events.service';
import { UsersService } from '../users/users.service';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class SubmitResultDto {
  homeScore: number;
  awayScore: number;
}

class VerifyAddressDto {
  user: string;
}

class VerifyBatchDto {
  users: string[];
}

class AddMatchDto {
  homeTeam: string;
  awayTeam: string;
  apiMatchId: string;
  kickoffTime: number; // unix timestamp
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Creator Events')
@Controller('creator-events')
export class CreatorEventsController {
  private readonly logger = new Logger(CreatorEventsController.name);

  constructor(
    private readonly svc: CreatorEventsService,
    private readonly usersService: UsersService,
  ) {}

  // ── Events ──────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get all creator events' })
  async getAllEvents() {
    return this.svc.getAllEvents();
  }

  @Get('fee')
  @ApiOperation({ summary: 'Get current creation fee config' })
  async getCreationFee() {
    return this.svc.getCreationFee();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single creator event by ID' })
  @ApiParam({ name: 'id', type: Number })
  async getEvent(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.svc.getEvent(id);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Event not found',
      );
    }
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'Get all matches in a creator event' })
  @ApiParam({ name: 'id', type: Number })
  async getEventMatches(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getEventMatches(id);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get all participants in a creator event' })
  @ApiParam({ name: 'id', type: Number })
  async getParticipants(@Param('id', ParseIntPipe) id: number) {
    return {
      eventId: id,
      count: await this.svc.getParticipantCount(id),
      participants: await this.svc.getParticipants(id),
    };
  }

  @Get(':id/joined/:address')
  @ApiOperation({ summary: 'Check if a user has joined a creator event' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'address', type: String })
  async hasJoined(
    @Param('id', ParseIntPipe) id: number,
    @Param('address') address: string,
  ) {
    return {
      eventId: id,
      user: address,
      joined: await this.svc.hasJoined(id, address),
    };
  }

  // ── Matches ─────────────────────────────────────────────────────────────────

  @Get('match/:matchId')
  @ApiOperation({ summary: 'Get a single match by ID' })
  @ApiParam({ name: 'matchId', type: Number })
  async getMatch(@Param('matchId', ParseIntPipe) matchId: number) {
    return this.svc.getMatch(matchId);
  }

  @Get('match/:matchId/winners')
  @ApiOperation({
    summary: 'Get verified winners for a match (with Twitter handles)',
  })
  @ApiParam({ name: 'matchId', type: Number })
  async getMatchWinners(@Param('matchId', ParseIntPipe) matchId: number) {
    const winners = await this.svc.getMatchWinners(matchId);

    // Enrich with Twitter data
    const addresses = winners.map((w) => w.user);
    const profiles = await this.usersService.getProfilesByAddresses(addresses);

    const enrichedWinners = winners.map((w) => {
      const profile = profiles.get(w.user);
      return {
        user: w.user,
        submittedAt: w.submittedAt,
        twitterHandle: profile?.twitterHandle || null,
        twitterAvatar: profile?.twitterAvatar || null,
      };
    });

    return {
      matchId,
      count: enrichedWinners.length,
      winners: enrichedWinners,
    };
  }

  @Get('match/:matchId/prediction/:address')
  @ApiOperation({ summary: "Get a user's prediction for a match" })
  @ApiParam({ name: 'matchId', type: Number })
  @ApiParam({ name: 'address', type: String })
  async getPrediction(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Param('address') address: string,
  ) {
    return {
      matchId,
      user: address,
      ...(await this.svc.getPrediction(matchId, address)),
    };
  }

  // ── AI Agent — submit match result ──────────────────────────────────────────

  @Post('match/:matchId/result')
  @ApiOperation({ summary: 'AI Agent: submit verified match result' })
  @ApiParam({ name: 'matchId', type: Number })
  async submitMatchResult(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: SubmitResultDto,
  ) {
    try {
      return await this.svc.submitMatchResult(
        matchId,
        dto.homeScore,
        dto.awayScore,
      );
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Failed to submit result',
      );
    }
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  @Post('admin/verify')
  @ApiOperation({
    summary: 'Admin: verify a single address (after Twitter OAuth)',
  })
  async verifyAddress(@Body() dto: VerifyAddressDto) {
    try {
      return await this.svc.verifyAddress(dto.user);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Failed to verify address',
      );
    }
  }

  @Post('admin/verify-batch')
  @ApiOperation({ summary: 'Admin: verify multiple addresses in one tx' })
  async verifyBatch(@Body() dto: VerifyBatchDto) {
    try {
      return await this.svc.verifyAddressBatch(dto.users);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Failed to verify addresses',
      );
    }
  }

  @Post('admin/unverify')
  @ApiOperation({ summary: 'Admin: revoke verification for an address' })
  async unverifyAddress(@Body() dto: VerifyAddressDto) {
    try {
      return await this.svc.unverifyAddress(dto.user);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Failed to unverify address',
      );
    }
  }

  @Post('admin/withdraw-fees')
  @ApiOperation({
    summary: 'Admin: withdraw all accumulated CELO fees to treasury',
  })
  async withdrawFees() {
    try {
      return await this.svc.withdrawFees();
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Failed to withdraw fees',
      );
    }
  }

  // ── Verification status ─────────────────────────────────────────────────────

  @Get('verify/status/:address')
  @ApiOperation({ summary: 'Check if an address is verified' })
  @ApiParam({ name: 'address', type: String })
  async getVerificationStatus(@Param('address') address: string) {
    return {
      user: address,
      verified: await this.svc.isVerified(address),
    };
  }
}

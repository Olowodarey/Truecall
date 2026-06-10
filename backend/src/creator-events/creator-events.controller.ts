import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { CreatorEventsService } from './creator-events.service';
import { EventMeta } from './event-meta.entity';
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
    @InjectRepository(EventMeta)
    private readonly eventMetaRepo: Repository<EventMeta>,
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

  @Get('admin/open-matches')
  @ApiOperation({
    summary: 'Admin: list all OPEN matches across every event (for submitting results)',
  })
  async getOpenMatches() {
    return this.svc.getOpenMatches();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single creator event by ID' })
  @ApiParam({ name: 'id', type: Number })
  async getEvent(@Param('id', ParseIntPipe) id: number) {
    try {
      const [event, meta] = await Promise.all([
        this.svc.getEvent(id),
        this.eventMetaRepo.findOne({ where: { eventId: id } }),
      ]);
      return { ...event, tweetId: meta?.tweetId ?? null };
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Event not found',
      );
    }
  }

  @Get(':id/tweet')
  @ApiOperation({ summary: 'Get the pinned tweet ID for an event' })
  @ApiParam({ name: 'id', type: Number })
  async getEventTweet(@Param('id', ParseIntPipe) id: number) {
    const meta = await this.eventMetaRepo.findOne({ where: { eventId: id } });
    return { eventId: id, tweetId: meta?.tweetId ?? null };
  }

  @Patch(':id/tweet')
  @ApiOperation({ summary: 'Creator: pin a tweet to their event' })
  @ApiParam({ name: 'id', type: Number })
  async setEventTweet(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { tweetUrl: string; creatorAddress: string },
  ) {
    // Extract tweet ID from URL (supports x.com and twitter.com)
    const match = body.tweetUrl?.match(/status\/(\d+)/);
    if (!match) {
      throw new BadRequestException(
        'Invalid tweet URL — must contain /status/<id>',
      );
    }
    const tweetId = match[1];

    // Verify the caller is the event creator
    let event: any;
    try {
      event = await this.svc.getEvent(id);
    } catch {
      throw new BadRequestException('Event not found');
    }
    if (
      !body.creatorAddress ||
      body.creatorAddress.toLowerCase() !== event.creator.toLowerCase()
    ) {
      throw new BadRequestException('Only the event creator can pin a tweet');
    }

    await this.eventMetaRepo.upsert(
      { eventId: id, tweetUrl: body.tweetUrl, tweetId },
      ['eventId'],
    );

    this.logger.log(`Event ${id}: creator pinned tweet ${tweetId}`);
    return { eventId: id, tweetId };
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
      // Normalize address to lowercase for lookup
      const profile = profiles.get(w.user.toLowerCase());
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
    summary: 'Admin: withdraw all accumulated CELO fees to specified address',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        recipient: { type: 'string', description: 'Address to receive fees' },
      },
      required: ['recipient'],
    },
  })
  async withdrawFees(@Body() body: { recipient: string }) {
    try {
      return await this.svc.withdrawFees(body.recipient);
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

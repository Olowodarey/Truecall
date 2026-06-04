import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreatorEventsService } from '../creator-events/creator-events.service';
import { Client, OAuth2 } from '@xdevplatform/xdk';
import { ConfigService } from '@nestjs/config';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly creatorEventsService: CreatorEventsService,
    private readonly config: ConfigService,
  ) {}

  @Get('profile/:address')
  @ApiOperation({ summary: 'Get user profile by wallet address' })
  @ApiParam({ name: 'address', type: String })
  getProfile(@Param('address') address: string) {
    const profile = this.usersService.getProfile(address);
    return profile || { address, twitterHandle: null };
  }

  @Get('profiles')
  @ApiOperation({ summary: 'Get multiple user profiles' })
  getProfiles(@Query('addresses') addresses: string) {
    const addressList = addresses.split(',').map((a) => a.trim());
    const profiles = this.usersService.getProfilesByAddresses(addressList);
    return Object.fromEntries(profiles);
  }

  @Post('twitter/callback')
  @ApiOperation({ summary: 'Handle Twitter OAuth callback' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        code: { type: 'string' },
        codeVerifier: { type: 'string' },
      },
    },
  })
  async handleTwitterCallback(
    @Body() body: { address: string; code: string; codeVerifier: string },
  ) {
    const { address, code, codeVerifier } = body;

    if (!address || !code || !codeVerifier) {
      throw new BadRequestException('Missing address, code, or codeVerifier');
    }

    try {
      const clientId = this.config.get<string>('TWITTER_CLIENT_ID');
      const clientSecret = this.config.get<string>('TWITTER_CLIENT_SECRET');
      const redirectUri = this.config.get<string>('TWITTER_REDIRECT_URI');

      if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
          'Twitter OAuth not configured (missing clientId, clientSecret, or redirectUri)',
        );
      }

      this.logger.log(
        `Debugging Twitter OAuth: ClientID=${clientId.slice(0, 5)}..., RedirectURI=${redirectUri}`,
      );

      // Step 1: Exchange code for access token using XDK
      const oauth2 = new OAuth2({
        clientId,
        clientSecret,
        redirectUri,
        scope: ['tweet.read', 'users.read', 'offline.access'],
      });

      this.logger.log(
        `Exchanging code for tokens... (code=${code.slice(0, 5)}..., verifier=${codeVerifier.slice(0, 5)}...)`,
      );
      const tokens = await oauth2.exchangeCode(code, codeVerifier);
      this.logger.log('Tokens received successfully:', tokens);

      const client = new Client({ accessToken: tokens.access_token });

      // Step 2: Get user info using XDK
      this.logger.log('Fetching user info from X...');
      const userResponse = await client.users.getMe({
        'user.fields': ['profile_image_url'],
      });

      const twitterUser = userResponse.data;

      if (!twitterUser) {
        this.logger.error('No data in userResponse', userResponse);
        throw new Error('Failed to fetch Twitter profile (empty data)');
      }

      // Step 3: Link to wallet
      const profile = this.usersService.linkTwitter(
        address,
        twitterUser.username,
        twitterUser.id,
        twitterUser.profileImageUrl,
      );

      this.logger.log(
        `Twitter linked via XDK: @${twitterUser.username} → ${address}`,
      );

      // Step 4: Verify address on-chain (so they can join events)
      try {
        this.logger.log(`Verifying address on-chain: ${address}`);
        await this.creatorEventsService.verifyAddress(address);
        this.logger.log(`✅ Address verified on-chain: ${address}`);
      } catch (verifyError) {
        this.logger.warn(
          `Failed to verify address on-chain (user can manually verify later): ${verifyError.message}`,
        );
        // Don't fail the OAuth flow if on-chain verification fails
        // User can still use the platform, admin can verify manually later
      }

      return {
        success: true,
        profile,
      };
    } catch (error) {
      this.logger.error('Detailed Twitter OAuth error:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data || error.data,
      });
      throw new BadRequestException(
        error.message || 'Twitter verification failed',
      );
    }
  }

  @Post('twitter/link')
  @ApiOperation({ summary: 'Manually link Twitter handle (for testing)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        twitterHandle: { type: 'string' },
        twitterId: { type: 'string' },
      },
      required: ['address', 'twitterHandle'],
    },
  })
  async linkTwitterManual(
    @Body()
    body: {
      address: string;
      twitterHandle: string;
      twitterId?: string;
    },
  ) {
    const profile = this.usersService.linkTwitter(
      body.address,
      body.twitterHandle,
      body.twitterId || 'manual_' + Date.now(),
    );

    // Verify on-chain
    try {
      this.logger.log(`Verifying address on-chain (manual): ${body.address}`);
      await this.creatorEventsService.verifyAddress(body.address);
      this.logger.log(`✅ Address verified on-chain: ${body.address}`);
    } catch (verifyError) {
      this.logger.warn(
        `Failed to verify address on-chain: ${verifyError.message}`,
      );
    }

    return { success: true, profile };
  }

  @Post('twitter/unlink')
  @ApiOperation({ summary: 'Unlink Twitter from wallet' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
      },
    },
  })
  unlinkTwitter(@Body() body: { address: string }) {
    const success = this.usersService.unlinkTwitter(body.address);
    return { success };
  }

  @Get('twitter/verify-status/:address')
  @ApiOperation({ summary: 'Check if wallet address has Twitter verified' })
  @ApiParam({ name: 'address', type: String })
  getTwitterVerifyStatus(@Param('address') address: string) {
    const profile = this.usersService.getProfile(address);
    const verified = !!(profile?.twitterHandle && profile?.twitterId);

    return {
      verified,
      twitterHandle: profile?.twitterHandle || null,
      twitterAvatar: profile?.twitterAvatar || null,
    };
  }
}

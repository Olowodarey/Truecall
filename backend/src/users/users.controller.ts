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
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
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
      // Exchange code for access token
      const clientId = this.config.get<string>('TWITTER_CLIENT_ID');
      const clientSecret = this.config.get<string>('TWITTER_CLIENT_SECRET');
      const redirectUri = this.config.get<string>('TWITTER_REDIRECT_URI');

      if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Twitter OAuth not configured');
      }

      // Step 1: Get access token
      const tokenResponse = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier, // Use the actual code verifier from frontend
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        },
      );

      const accessToken = tokenResponse.data.access_token;

      // Step 2: Get user info
      const userResponse = await axios.get(
        'https://api.twitter.com/2/users/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            'user.fields': 'profile_image_url',
          },
        },
      );

      const twitterUser = userResponse.data.data;

      // Step 3: Link to wallet
      const profile = this.usersService.linkTwitter(
        address,
        twitterUser.username,
        twitterUser.id,
        twitterUser.profile_image_url,
      );

      this.logger.log(`Twitter linked: @${twitterUser.username} → ${address}`);

      return {
        success: true,
        profile,
      };
    } catch (error) {
      this.logger.error('Twitter OAuth error', error);
      throw new BadRequestException(
        error.response?.data?.error_description ||
          'Twitter verification failed',
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
  linkTwitterManual(
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
}

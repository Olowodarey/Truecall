import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface UserProfile {
  address: string;
  twitterHandle?: string;
  twitterId?: string;
  twitterAvatar?: string;
  verifiedAt?: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getProfile(address: string): Promise<UserProfile | null> {
    const user = await this.userRepository.findOne({
      where: { address: address.toLowerCase() },
    });

    if (!user) return null;

    return {
      address: user.address,
      twitterHandle: user.twitterHandle || undefined,
      twitterId: user.twitterId || undefined,
      twitterAvatar: user.twitterAvatar || undefined,
      verifiedAt: user.verifiedAt ? Number(user.verifiedAt) : undefined,
    };
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    const users = await this.userRepository.find();
    return users.map((user) => ({
      address: user.address,
      twitterHandle: user.twitterHandle || undefined,
      twitterId: user.twitterId || undefined,
      twitterAvatar: user.twitterAvatar || undefined,
      verifiedAt: user.verifiedAt ? Number(user.verifiedAt) : undefined,
    }));
  }

  async linkTwitter(
    address: string,
    twitterHandle: string,
    twitterId: string,
    twitterAvatar?: string,
  ): Promise<UserProfile> {
    const normalizedAddress = address.toLowerCase();

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      user = this.userRepository.create({
        address: normalizedAddress,
      });
    }

    // Update Twitter data
    user.twitterHandle = twitterHandle;
    user.twitterId = twitterId;
    user.twitterAvatar = twitterAvatar || null;
    user.verifiedAt = Date.now();

    await this.userRepository.save(user);

    this.logger.log(`Linked Twitter @${twitterHandle} to ${address}`);

    return {
      address: user.address,
      twitterHandle: user.twitterHandle || undefined,
      twitterId: user.twitterId || undefined,
      twitterAvatar: user.twitterAvatar || undefined,
      verifiedAt: user.verifiedAt ? Number(user.verifiedAt) : undefined,
    };
  }

  async unlinkTwitter(address: string): Promise<boolean> {
    const normalizedAddress = address.toLowerCase();

    const user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) return false;

    // Remove Twitter data
    user.twitterHandle = null;
    user.twitterId = null;
    user.twitterAvatar = null;
    user.verifiedAt = null;

    await this.userRepository.save(user);

    this.logger.log(`Unlinked Twitter from ${address}`);
    return true;
  }

  async getProfilesByAddresses(
    addresses: string[],
  ): Promise<Map<string, UserProfile>> {
    const result = new Map<string, UserProfile>();

    const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.address IN (:...addresses)', {
        addresses: normalizedAddresses,
      })
      .getMany();

    users.forEach((user) => {
      result.set(user.address, {
        address: user.address,
        twitterHandle: user.twitterHandle || undefined,
        twitterId: user.twitterId || undefined,
        twitterAvatar: user.twitterAvatar || undefined,
        verifiedAt: user.verifiedAt ? Number(user.verifiedAt) : undefined,
      });
    });

    return result;
  }

  /**
   * Check if a Twitter ID is already linked to a different wallet address
   * @returns { isLinked: boolean, linkedAddress?: string, linkedHandle?: string }
   */
  async isTwitterIdLinkedToAnotherWallet(
    twitterId: string,
    currentAddress: string,
  ): Promise<{
    isLinked: boolean;
    linkedAddress?: string;
    linkedHandle?: string;
  }> {
    const normalizedCurrentAddress = currentAddress.toLowerCase();

    // Find user with this Twitter ID that's not the current address
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.twitterId = :twitterId', { twitterId })
      .andWhere('LOWER(user.address) != :address', {
        address: normalizedCurrentAddress,
      })
      .getOne();

    if (user) {
      return {
        isLinked: true,
        linkedAddress: user.address,
        linkedHandle: user.twitterHandle || undefined,
      };
    }

    return { isLinked: false };
  }

  /**
   * Get all addresses linked to a specific Twitter ID
   */
  async getAddressesByTwitterId(twitterId: string): Promise<string[]> {
    const users = await this.userRepository.find({
      where: { twitterId },
    });

    return users.map((user) => user.address);
  }
}

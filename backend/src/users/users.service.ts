import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

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
  private readonly dataPath = path.join(__dirname, '../../data/users.json');
  private users: Map<string, UserProfile> = new Map();

  constructor() {
    this.loadUsers();
  }

  private loadUsers() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf-8');
        const usersArray: UserProfile[] = JSON.parse(data);
        this.users = new Map(
          usersArray.map((u) => [u.address.toLowerCase(), u]),
        );
        this.logger.log(`Loaded ${this.users.size} user profiles`);
      } else {
        this.logger.log('No users.json found, starting fresh');
        this.saveUsers();
      }
    } catch (error) {
      this.logger.error('Error loading users', error);
      this.users = new Map();
    }
  }

  private saveUsers() {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const usersArray = Array.from(this.users.values());
      fs.writeFileSync(this.dataPath, JSON.stringify(usersArray, null, 2));
      this.logger.log(`Saved ${usersArray.length} user profiles`);
    } catch (error) {
      this.logger.error('Error saving users', error);
    }
  }

  getProfile(address: string): UserProfile | null {
    return this.users.get(address.toLowerCase()) || null;
  }

  getAllProfiles(): UserProfile[] {
    return Array.from(this.users.values());
  }

  linkTwitter(
    address: string,
    twitterHandle: string,
    twitterId: string,
    twitterAvatar?: string,
  ): UserProfile {
    const normalizedAddress = address.toLowerCase();
    const existing = this.users.get(normalizedAddress);

    const profile: UserProfile = {
      ...existing,
      address: address, // keep original case
      twitterHandle,
      twitterId,
      twitterAvatar,
      verifiedAt: Date.now(),
    };

    this.users.set(normalizedAddress, profile);
    this.saveUsers();
    this.logger.log(`Linked Twitter @${twitterHandle} to ${address}`);
    return profile;
  }

  unlinkTwitter(address: string): boolean {
    const normalizedAddress = address.toLowerCase();
    const existing = this.users.get(normalizedAddress);
    if (!existing) return false;

    const profile: UserProfile = {
      address: existing.address,
    };

    this.users.set(normalizedAddress, profile);
    this.saveUsers();
    this.logger.log(`Unlinked Twitter from ${address}`);
    return true;
  }

  getProfilesByAddresses(addresses: string[]): Map<string, UserProfile> {
    const result = new Map<string, UserProfile>();
    addresses.forEach((addr) => {
      const profile = this.getProfile(addr);
      if (profile) {
        result.set(addr, profile);
      }
    });
    return result;
  }
}

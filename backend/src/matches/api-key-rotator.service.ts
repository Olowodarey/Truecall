import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ROTATION_HOURS = 3;
const ROTATION_INTERVAL_MS = ROTATION_HOURS * 60 * 60 * 1000;

@Injectable()
export class ApiKeyRotatorService {
  private readonly logger = new Logger(ApiKeyRotatorService.name);
  private readonly keys: string[];

  constructor(private configService: ConfigService) {
    this.keys = this.loadKeys();
    this.logger.log(
      `Loaded ${this.keys.length} API key(s), rotating every ${ROTATION_HOURS}h`,
    );
  }

  private loadKeys(): string[] {
    const keys: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const key = this.configService.get<string>(`API_FOOTBALL_KEY_${i}`);
      if (key && key !== 'YOUR_API_FOOTBALL_KEY') {
        keys.push(key);
      }
    }
    // fallback: legacy single key env var
    if (keys.length === 0) {
      const legacy = this.configService.get<string>('API_FOOTBALL_KEY', '');
      if (legacy && legacy !== 'YOUR_API_FOOTBALL_KEY') {
        keys.push(legacy);
      }
    }
    return keys;
  }

  private getKeyAtOffset(offset: number): string {
    if (this.keys.length === 0) return '';
    const slot = Math.floor(Date.now() / ROTATION_INTERVAL_MS);
    return this.keys[(slot + offset) % this.keys.length];
  }

  /** Key currently active for this 3-hour window */
  get currentKey(): string {
    return this.getKeyAtOffset(0);
  }

  /** Next key in the rotation (used as emergency fallback on 429) */
  get nextKey(): string {
    return this.getKeyAtOffset(1);
  }

  isConfigured(): boolean {
    return this.keys.length > 0;
  }

  hasAvailableKey(): boolean {
    return this.keys.length > 0;
  }

  getStats() {
    if (this.keys.length === 0) {
      return { totalKeys: 0, activeKeyIndex: -1, rotatesAt: null, minutesUntilRotation: 0 };
    }
    const slot = Math.floor(Date.now() / ROTATION_INTERVAL_MS);
    const activeKeyIndex = slot % this.keys.length;
    const nextRotationMs = (slot + 1) * ROTATION_INTERVAL_MS;
    return {
      totalKeys: this.keys.length,
      activeKeyIndex,
      rotationIntervalHours: ROTATION_HOURS,
      rotatesAt: new Date(nextRotationMs).toISOString(),
      minutesUntilRotation: Math.round((nextRotationMs - Date.now()) / 60000),
    };
  }
}

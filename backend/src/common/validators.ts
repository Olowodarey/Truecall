import { BadRequestException } from '@nestjs/common';

/**
 * Validate Ethereum address format
 */
export function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate event name
 */
export function validateEventName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new BadRequestException('Event name is required');
  }
  if (name.length > 64) {
    throw new BadRequestException('Event name must be 64 characters or less');
  }
}

/**
 * Validate entry fee
 */
export function validateEntryFee(fee: string): void {
  const feeNum = parseFloat(fee);
  if (isNaN(feeNum) || feeNum < 0.1) {
    throw new BadRequestException('Entry fee must be at least 0.1');
  }
  if (feeNum > 1000000) {
    throw new BadRequestException('Entry fee cannot exceed 1,000,000');
  }
}

/**
 * Validate event dates
 */
export function validateEventDates(startDate: number, endDate: number): void {
  const now = Math.floor(Date.now() / 1000);

  if (startDate <= now) {
    throw new BadRequestException('Start date must be in the future');
  }

  if (endDate <= startDate) {
    throw new BadRequestException('End date must be after start date');
  }

  const minDuration = 60 * 60; // 1 hour
  if (endDate - startDate < minDuration) {
    throw new BadRequestException('Event must last at least 1 hour');
  }

  const maxDuration = 365 * 24 * 60 * 60; // 1 year
  if (endDate - startDate > maxDuration) {
    throw new BadRequestException('Event cannot last more than 1 year');
  }
}

/**
 * Validate match times
 */
export function validateMatchTimes(
  kickoffTime: number,
  predictionDeadline: number,
): void {
  const now = Math.floor(Date.now() / 1000);

  if (kickoffTime <= now) {
    throw new BadRequestException('Kickoff time must be in the future');
  }

  if (predictionDeadline >= kickoffTime) {
    throw new BadRequestException(
      'Prediction deadline must be before kickoff time',
    );
  }

  const minBuffer = 5 * 60; // 5 minutes minimum
  if (kickoffTime - predictionDeadline < minBuffer) {
    throw new BadRequestException(
      'Prediction deadline must be at least 5 minutes before kickoff',
    );
  }
}

/**
 * Validate team names
 */
export function validateTeamName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new BadRequestException('Team name is required');
  }
  if (name.length > 50) {
    throw new BadRequestException('Team name must be 50 characters or less');
  }
}

/**
 * Validate API match ID
 */
export function validateApiMatchId(id: string): void {
  if (!id || id.trim().length === 0) {
    throw new BadRequestException('API match ID is required');
  }
  if (id.length > 100) {
    throw new BadRequestException(
      'API match ID must be 100 characters or less',
    );
  }
}

/**
 * Validate scoring rule
 */
export function validateScoringRule(rule: number): void {
  if (![0, 1, 2].includes(rule)) {
    throw new BadRequestException(
      'Invalid scoring rule. Must be 0 (Exact), 1 (Outcome), or 2 (Both)',
    );
  }
}

/**
 * Validate prediction values
 */
export function validatePredictionScore(
  homeScore: number,
  awayScore: number,
): void {
  if (homeScore < 0 || awayScore < 0) {
    throw new BadRequestException('Scores cannot be negative');
  }
  if (homeScore > 100 || awayScore > 100) {
    throw new BadRequestException('Scores cannot exceed 100');
  }
}

/**
 * Validate prediction outcome
 */
export function validatePredictionOutcome(outcome: number): void {
  if (![0, 1, 2].includes(outcome)) {
    throw new BadRequestException(
      'Invalid outcome. Must be 0 (Home), 1 (Draw), or 2 (Away)',
    );
  }
}

export class MatchDto {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: number;
  status: string;
  homeScore?: number;
  awayScore?: number;
  result?: number;
}

export class CreateEventDto {
  eventName: string;
  matchId: number;
  accessCode: string;
  oracle: string;
}

export class SubmitResultDto {
  matchId: number;
  result: number;
}

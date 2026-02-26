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

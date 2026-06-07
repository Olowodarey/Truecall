import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('matches_cache')
export class MatchCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  @Index()
  api_match_id: string;

  @Column({ type: 'jsonb' })
  match_data: any;

  @Column({ length: 20 })
  @Index()
  status: string;

  @Column({ length: 100, nullable: true })
  @Index()
  league: string;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  kickoff_time: Date;

  @Column({ length: 100, nullable: true })
  home_team: string;

  @Column({ length: 100, nullable: true })
  away_team: string;

  @Column({ type: 'int', nullable: true })
  home_score: number;

  @Column({ type: 'int', nullable: true })
  away_score: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  @Index()
  updated_at: Date;
}

@Entity('api_call_log')
export class ApiCallLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  endpoint: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  call_time: Date;

  @Column({ default: true })
  success: boolean;

  @Column({ type: 'int', default: 0 })
  matches_fetched: number;
}

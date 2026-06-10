import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Distributed lock + health tracking for cron-driven syncs.
 * Prevents multiple Railway replicas from running the same sync
 * concurrently, and records last-run/last-success info for the
 * /matches/stats/worldcup endpoint.
 */
@Entity('sync_locks')
export class SyncLock {
  @PrimaryColumn({ length: 50 })
  job_name: string;

  @Column({ type: 'timestamp' })
  last_run_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_success_at: Date | null;

  @Column({ type: 'int', nullable: true })
  last_match_count: number | null;

  @Column({ type: 'text', nullable: true })
  last_error: string | null;
}

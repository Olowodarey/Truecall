import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('event_meta')
export class EventMeta {
  @PrimaryColumn({ type: 'int' })
  eventId: number;

  @Column({ type: 'text', nullable: true })
  tweetUrl: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  tweetId: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}

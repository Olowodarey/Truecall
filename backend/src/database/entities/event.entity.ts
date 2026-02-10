import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Match } from './match.entity';

export enum EventStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  SETTLED = 'settled',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  eventName: string;

  @Column({ type: 'int', nullable: true })
  contractEventId: number | null;

  @Column()
  matchId: number;

  @ManyToOne(() => Match)
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @Column()
  accessCode: string;

  @Column()
  creator: string;

  @Column()
  oracle: string;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.OPEN,
  })
  status: EventStatus;

  @Column({ nullable: true })
  transactionId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 42 })
  address: string; // Ethereum address (0x...)

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index({ unique: true, where: '"twitterId" IS NOT NULL' }) // Unique only for non-null values
  twitterId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twitterHandle: string | null;

  @Column({ type: 'text', nullable: true })
  twitterAvatar: string | null;

  @Column({ type: 'bigint', nullable: true })
  verifiedAt: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

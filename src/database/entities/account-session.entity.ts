import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AccountEntity } from './account.entity.js';

@Entity({ name: 'account_sessions' })
@Index('ix_account_sessions_account_id', ['accountId'])
@Index('ix_account_sessions_expires_at', ['expiresAt'])
@Check('ck_account_sessions_expiry', '"expires_at" > "created_at"')
export class AccountSessionEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_account_sessions' })
  id!: string;

  @Column({ type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id', foreignKeyConstraintName: 'fk_account_sessions_account_id' })
  account!: AccountEntity;

  @Column({ type: 'char', length: 64 })
  refreshTokenHash!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  deviceId!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  deviceName!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AccountEntity } from './account.entity.js';

@Entity({ name: 'customer_profiles' })
export class CustomerProfileEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_customer_profiles' })
  id!: string;

  @Index('uq_customer_profiles_account_id', { unique: true })
  @Column({ type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id', foreignKeyConstraintName: 'fk_customer_profiles_account_id' })
  account!: AccountEntity;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

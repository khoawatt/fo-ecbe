import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AccountEntity } from './account.entity.js';

export enum SellerVerificationStatus { PENDING = 'PENDING', APPROVED = 'APPROVED', REJECTED = 'REJECTED', SUSPENDED = 'SUSPENDED' }

@Entity({ name: 'seller_profiles' })
@Check('ck_seller_profiles_status', "verification_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')")
export class SellerProfileEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_seller_profiles' })
  id!: string;

  @Index('uq_seller_profiles_account_id', { unique: true })
  @Column({ type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id', foreignKeyConstraintName: 'fk_seller_profiles_account_id' })
  account!: AccountEntity;

  @Column({ type: 'varchar', length: 150 })
  displayName!: string;

  @Column({ type: 'varchar', length: 20, default: SellerVerificationStatus.PENDING })
  verificationStatus!: SellerVerificationStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

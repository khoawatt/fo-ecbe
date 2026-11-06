import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AccountStatus } from '../../modules/account/types/account-status.js';

@Entity({ name: 'accounts' })
@Check('ck_accounts_email_canonical', 'email = lower(btrim(email))')
@Check(
  'ck_accounts_status',
  `status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED')`,
)
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_accounts_email', { unique: true })
  @Column({
    type: 'varchar',
    length: 255,
  })
  email!: string;

  @Index('uq_accounts_phone', { unique: true })
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phone!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash!: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: AccountStatus.PENDING,
  })
  status!: AccountStatus;

  @Column({
    type: 'boolean',
    default: false,
  })
  emailVerified!: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  phoneVerified!: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  lastLoginAt!: Date | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;
}

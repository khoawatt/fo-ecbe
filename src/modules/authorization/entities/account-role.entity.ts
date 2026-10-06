import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { AccountEntity } from '../../account/persistence/account.entity';
import { RoleEntity } from './role.entity';

@Entity({ name: 'account_roles' })
@Unique(
  'uq_account_roles_account_id_role_id',
  ['accountId', 'roleId'],
)
@Index('ix_account_roles_role_id', ['roleId'])
export class AccountRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'account_id',
    type: 'uuid',
  })
  accountId!: string;

  @Column({
    name: 'role_id',
    type: 'uuid',
  })
  roleId!: string;

  @ManyToOne(() => AccountEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'account_id',
  })
  account!: AccountEntity;

  @ManyToOne(() => RoleEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role!: RoleEntity;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}

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

import { PermissionEntity } from './permission.entity.js';
import { RoleEntity } from './role.entity.js';

@Entity({ name: 'role_permissions' })
@Unique('uq_role_permissions_role_id_permission_id', [
  'roleId',
  'permissionId',
])
@Index('ix_role_permissions_permission_id', ['permissionId'])
export class RolePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'role_id',
    type: 'uuid',
  })
  roleId!: string;

  @Column({
    name: 'permission_id',
    type: 'uuid',
  })
  permissionId!: string;

  @ManyToOne(() => RoleEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
    foreignKeyConstraintName: 'fk_role_permissions_role_id',
  })
  role!: RoleEntity;

  @ManyToOne(() => PermissionEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'permission_id',
    foreignKeyConstraintName: 'fk_role_permissions_permission_id',
  })
  permission!: PermissionEntity;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}

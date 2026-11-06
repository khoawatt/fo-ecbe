import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'permissions' })
@Check('ck_permissions_code_canonical', 'code = lower(btrim(code))')
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_permissions_code', { unique: true })
  @Column({
    type: 'varchar',
    length: 100
  })
  code!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  description!: string | null;

  @CreateDateColumn({
    type: 'timestamptz'
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz'
  })
  updatedAt!: Date;
}

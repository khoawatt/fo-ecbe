import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'roles' })
@Check('ck_roles_code_canonical', 'code = upper(btrim(code))')
@Index('uq_roles_name_canonical', { synchronize: false })
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_roles_code', { unique: true })
  @Column({
    type: 'varchar',
    length: 50
  })
  code!: string;

  @Column({
    type: 'varchar',
    length: 100
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  description!: string | null;

  @Column({
    type: 'boolean',
    default: false
  })
  isSystem!: boolean;

  @CreateDateColumn({
    type: 'timestamptz'
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz'
  })
  updatedAt!: Date;
}

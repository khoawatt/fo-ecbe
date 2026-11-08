import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AccountEntity } from './account.entity.js';
import { StoreEntity } from './store.entity.js';

export enum OrderStatus { CREATED = 'CREATED' }

@Entity({ name: 'orders' })
@Check('ck_orders_status', "status IN ('CREATED')")
@Check('ck_orders_total', 'total_cents >= 0')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_orders' }) id!: string;
  @Index('ix_orders_account_id') @Column({ type: 'uuid' }) accountId!: string;
  @ManyToOne(() => AccountEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id', foreignKeyConstraintName: 'fk_orders_account_id' }) account!: AccountEntity;
  @Index('ix_orders_store_id') @Column({ type: 'uuid' }) storeId!: string;
  @ManyToOne(() => StoreEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id', foreignKeyConstraintName: 'fk_orders_store_id' }) store!: StoreEntity;
  @Column({ type: 'varchar', length: 20, default: OrderStatus.CREATED }) status!: OrderStatus;
  @Column({ type: 'integer' }) totalCents!: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}

import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { StoreEntity } from './store.entity.js';

export enum ProductStatus { DRAFT = 'DRAFT', ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }

@Entity({ name: 'products' })
@Check('ck_products_status', "status IN ('DRAFT', 'ACTIVE', 'INACTIVE')")
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_products' }) id!: string;
  @Index('ix_products_store_id') @Column({ type: 'uuid' }) storeId!: string;
  @ManyToOne(() => StoreEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id', foreignKeyConstraintName: 'fk_products_store_id' }) store!: StoreEntity;
  @Column({ type: 'varchar', length: 200 }) name!: string;
  @Column({ type: 'varchar', length: 20, default: ProductStatus.DRAFT }) status!: ProductStatus;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}

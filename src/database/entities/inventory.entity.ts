import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { StoreEntity } from './store.entity.js';
import { ProductVariantEntity } from './product-variant.entity.js';

@Entity({ name: 'inventories' })
@Index('uq_inventories_store_variant', ['storeId', 'productVariantId'], { unique: true })
@Check('ck_inventories_quantity', 'quantity >= 0')
export class InventoryEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_inventories' }) id!: string;
  @Column({ type: 'uuid' }) storeId!: string;
  @ManyToOne(() => StoreEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id', foreignKeyConstraintName: 'fk_inventories_store_id' }) store!: StoreEntity;
  @Column({ type: 'uuid' }) productVariantId!: string;
  @ManyToOne(() => ProductVariantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_variant_id', foreignKeyConstraintName: 'fk_inventories_product_variant_id' }) variant!: ProductVariantEntity;
  @Column({ type: 'integer', default: 0 }) quantity!: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}

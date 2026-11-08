import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrderEntity } from './order.entity.js';
import { ProductEntity } from './product.entity.js';
import { ProductVariantEntity } from './product-variant.entity.js';

@Entity({ name: 'order_items' })
@Check('ck_order_items_quantity', 'quantity > 0')
@Check('ck_order_items_price', 'unit_price_cents >= 0 AND line_total_cents >= 0')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_order_items' }) id!: string;
  @Index('ix_order_items_order_id') @Column({ type: 'uuid' }) orderId!: string;
  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id', foreignKeyConstraintName: 'fk_order_items_order_id' }) order!: OrderEntity;
  @Column({ type: 'uuid' }) productId!: string;
  @ManyToOne(() => ProductEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id', foreignKeyConstraintName: 'fk_order_items_product_id' }) product!: ProductEntity;
  @Column({ type: 'uuid' }) productVariantId!: string;
  @ManyToOne(() => ProductVariantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_variant_id', foreignKeyConstraintName: 'fk_order_items_product_variant_id' }) variant!: ProductVariantEntity;
  @Column({ type: 'varchar', length: 200 }) productNameSnapshot!: string;
  @Column({ type: 'varchar', length: 100 }) skuSnapshot!: string;
  @Column({ type: 'integer' }) unitPriceCents!: number;
  @Column({ type: 'integer' }) quantity!: number;
  @Column({ type: 'integer' }) lineTotalCents!: number;
}

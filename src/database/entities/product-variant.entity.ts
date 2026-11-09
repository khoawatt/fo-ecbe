import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProductEntity } from './product.entity.js';

export enum VariantStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }

@Entity({ name: 'product_variants' })
@Check('ck_product_variants_status', "status IN ('ACTIVE', 'INACTIVE')")
@Check('ck_product_variants_price', 'price_cents >= 0')
export class ProductVariantEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_product_variants' }) id!: string;
  @Index('ix_product_variants_product_id') @Column({ type: 'uuid' }) productId!: string;
  @ManyToOne(() => ProductEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id', foreignKeyConstraintName: 'fk_product_variants_product_id' }) product!: ProductEntity;
  @Index('uq_product_variants_sku', { unique: true }) @Column({ type: 'varchar', length: 100 }) sku!: string;
  @Column({ type: 'integer' }) priceCents!: number;
  @Column({ type: 'varchar', length: 20, default: VariantStatus.ACTIVE }) status!: VariantStatus;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}

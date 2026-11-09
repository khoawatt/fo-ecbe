import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SellerProfileEntity } from './seller-profile.entity.js';

export enum StoreStatus { DRAFT = 'DRAFT', ACTIVE = 'ACTIVE', DISABLED = 'DISABLED' }

@Entity({ name: 'stores' })
@Check('ck_stores_status', "status IN ('DRAFT', 'ACTIVE', 'DISABLED')")
export class StoreEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'pk_stores' }) id!: string;
  @Index('ix_stores_seller_profile_id')
  @Column({ type: 'uuid' }) sellerProfileId!: string;
  @ManyToOne(() => SellerProfileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seller_profile_id', foreignKeyConstraintName: 'fk_stores_seller_profile_id' }) sellerProfile!: SellerProfileEntity;
  @Column({ type: 'varchar', length: 150 }) name!: string;
  @Index('uq_stores_slug', { unique: true })
  @Column({ type: 'varchar', length: 160 }) slug!: string;
  @Column({ type: 'varchar', length: 20, default: StoreStatus.DRAFT }) status!: StoreStatus;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}

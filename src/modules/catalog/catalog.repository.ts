import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../database/entities/product.entity.js';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity.js';
import type { CatalogRepositoryInterface } from './catalog.repository.interface.js';
import type { ProductRecord, VariantRecord } from './catalog.types.js';

@Injectable()
export class CatalogRepository implements CatalogRepositoryInterface {
  constructor(@InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity) private readonly variants: Repository<ProductVariantEntity>) {}
  private product(p: ProductEntity): ProductRecord {
    const { id, storeId, name, status, createdAt, updatedAt } = p;
    return { id, storeId, name, status, createdAt, updatedAt };
  }
  private variant(v: ProductVariantEntity): VariantRecord {
    const { id, productId, sku, priceCents, status, createdAt, updatedAt } = v;
    return { id, productId, sku, priceCents, status, createdAt, updatedAt };
  }
  async createProduct(storeId: string, name: string): Promise<ProductRecord> {
    return this.product(await this.products.save(this.products.create({ storeId, name })));
  }
  async findProduct(id: string): Promise<ProductRecord | null> {
    const p = await this.products.findOneBy({ id }); return p ? this.product(p) : null;
  }
  async listProducts(storeId: string): Promise<ProductRecord[]> {
    return (await this.products.find({ where: { storeId }, order: { createdAt: 'ASC', id: 'ASC' } })).map(p => this.product(p));
  }
  async updateProduct(id: string, data: { name?: string; status?: ProductEntity['status'] }): Promise<ProductRecord> {
    await this.products.update(id, data); return this.product(await this.products.findOneByOrFail({ id }));
  }
  async createVariant(productId: string, sku: string, priceCents: number): Promise<VariantRecord> {
    return this.variant(await this.variants.save(this.variants.create({ productId, sku, priceCents })));
  }
  async findVariant(id: string): Promise<VariantRecord | null> {
    const v = await this.variants.findOneBy({ id }); return v ? this.variant(v) : null;
  }
  async updateVariant(id: string, data: { sku?: string; priceCents?: number; status?: ProductVariantEntity['status'] }): Promise<VariantRecord> {
    await this.variants.update(id, data); return this.variant(await this.variants.findOneByOrFail({ id }));
  }
}

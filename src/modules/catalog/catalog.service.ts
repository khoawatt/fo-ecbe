import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '../../database/entities/product.entity.js';
import { VariantStatus } from '../../database/entities/product-variant.entity.js';
import { StoreService } from '../store/store.service.js';
import { CATALOG_REPOSITORY } from './catalog.constants.js';
import type { CatalogRepositoryInterface } from './catalog.repository.interface.js';

@Injectable()
export class CatalogService {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepositoryInterface, private readonly stores: StoreService) {}
  async createProduct(accountId: string, storeId: string, name: string) {
    await this.stores.requireOwner(accountId, storeId);
    return this.catalog.createProduct(storeId, name);
  }
  async requireProductOwner(accountId: string, productId: string) {
    const product = await this.catalog.findProduct(productId);
    if (!product) throw new NotFoundException('Product not found');
    await this.stores.requireOwner(accountId, product.storeId);
    return product;
  }
  async updateProduct(accountId: string, productId: string, data: { name?: string; status?: ProductStatus }) {
    await this.requireProductOwner(accountId, productId);
    const safe: { name?: string; status?: ProductStatus } = {};
    if (data.name !== undefined) safe.name = data.name;
    if (data.status !== undefined) safe.status = data.status;
    return this.catalog.updateProduct(productId, safe);
  }
  async publicProduct(productId: string) {
    const product = await this.catalog.findProduct(productId);
    if (!product || product.status !== ProductStatus.ACTIVE) throw new NotFoundException('Product not published');
    await this.stores.publicStore(product.storeId);
    return product;
  }
  async listPublished(storeId: string) {
    await this.stores.publicStore(storeId);
    return (await this.catalog.listProducts(storeId)).filter(p => p.status === ProductStatus.ACTIVE);
  }
  async createVariant(accountId: string, productId: string, sku: string, priceCents: number) {
    await this.requireProductOwner(accountId, productId);
    try { return await this.catalog.createVariant(productId, sku, priceCents); }
    catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') throw new ConflictException('SKU exists');
      throw error;
    }
  }
  async requireVariantOwner(accountId: string, variantId: string) {
    const variant = await this.catalog.findVariant(variantId);
    if (!variant) throw new NotFoundException('Variant not found');
    const product = await this.requireProductOwner(accountId, variant.productId);
    return { variant, product };
  }
  async updateVariant(accountId: string, variantId: string, data: { sku?: string; priceCents?: number; status?: VariantStatus }) {
    await this.requireVariantOwner(accountId, variantId);
    const safe: { sku?: string; priceCents?: number; status?: VariantStatus } = {};
    if (data.sku !== undefined) safe.sku = data.sku;
    if (data.priceCents !== undefined) safe.priceCents = data.priceCents;
    if (data.status !== undefined) safe.status = data.status;
    try { return await this.catalog.updateVariant(variantId, safe); }
    catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') throw new ConflictException('SKU exists');
      throw error;
    }
  }
  async publishedVariant(variantId: string) {
    const variant = await this.catalog.findVariant(variantId);
    if (!variant || variant.status !== VariantStatus.ACTIVE) throw new NotFoundException('Variant not published');
    const product = await this.publicProduct(variant.productId);
    return { variant, product };
  }
}

import type { ProductStatus } from '../../database/entities/product.entity.js';
import type { VariantStatus } from '../../database/entities/product-variant.entity.js';
import type { ProductRecord, VariantRecord } from './catalog.types.js';
export interface CatalogRepositoryInterface {
  createProduct(storeId: string, name: string): Promise<ProductRecord>;
  findProduct(id: string): Promise<ProductRecord | null>;
  listProducts(storeId: string): Promise<ProductRecord[]>;
  updateProduct(id: string, data: { name?: string; status?: ProductStatus }): Promise<ProductRecord>;
  createVariant(productId: string, sku: string, priceCents: number): Promise<VariantRecord>;
  findVariant(id: string): Promise<VariantRecord | null>;
  updateVariant(id: string, data: { sku?: string; priceCents?: number; status?: VariantStatus }): Promise<VariantRecord>;
}

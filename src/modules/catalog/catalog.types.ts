import type { ProductStatus } from '../../database/entities/product.entity.js';
import type { VariantStatus } from '../../database/entities/product-variant.entity.js';
export interface ProductRecord { id: string; storeId: string; name: string; status: ProductStatus; createdAt: Date; updatedAt: Date; }
export interface VariantRecord { id: string; productId: string; sku: string; priceCents: number; status: VariantStatus; createdAt: Date; updatedAt: Date; }

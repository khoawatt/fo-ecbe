import type { InventoryRecord } from './inventory.types.js';
export interface InventoryRepositoryInterface {
  find(storeId: string, variantId: string): Promise<InventoryRecord | null>;
  create(storeId: string, variantId: string, quantity: number): Promise<InventoryRecord>;
  adjust(storeId: string, variantId: string, delta: number): Promise<InventoryRecord | null>;
}

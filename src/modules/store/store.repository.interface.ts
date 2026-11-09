import type { StoreInput, StoreRecord } from './store.types.js';
export interface StoreRepositoryInterface {
  create(sellerProfileId: string, input: StoreInput): Promise<StoreRecord>;
  findById(id: string): Promise<StoreRecord | null>;
  update(id: string, data: Partial<StoreInput> & { status?: StoreRecord['status'] }): Promise<StoreRecord>;
  findBySeller(sellerProfileId: string): Promise<StoreRecord[]>;
}

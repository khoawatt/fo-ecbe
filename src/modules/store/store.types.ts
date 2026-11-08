import type { StoreStatus } from '../../database/entities/store.entity.js';
export interface StoreRecord { id: string; sellerProfileId: string; name: string; slug: string; status: StoreStatus; createdAt: Date; updatedAt: Date; }
export interface StoreInput { name: string; slug: string; }

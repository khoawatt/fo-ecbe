import type { OrderLineInput, OrderRecord } from './order.types.js';
export interface OrderRepositoryInterface {
  create(accountId: string, storeId: string, lines: OrderLineInput[]): Promise<OrderRecord | null>;
  findById(id: string): Promise<OrderRecord | null>;
  findByAccount(accountId: string): Promise<OrderRecord[]>;
}

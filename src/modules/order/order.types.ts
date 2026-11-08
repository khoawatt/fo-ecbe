export interface OrderLineInput { variantId: string; quantity: number; }
export interface OrderItemRecord {
  id: string; orderId: string; productId: string; productVariantId: string;
  productNameSnapshot: string; skuSnapshot: string; unitPriceCents: number; quantity: number; lineTotalCents: number;
}
export interface OrderRecord {
  id: string; accountId: string; storeId: string; status: 'CREATED'; totalCents: number;
  createdAt: Date; updatedAt: Date; items: OrderItemRecord[];
}

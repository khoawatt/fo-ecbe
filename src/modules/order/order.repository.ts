import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { OrderRepositoryInterface } from './order.repository.interface.js';
import type { OrderItemRecord, OrderLineInput, OrderRecord } from './order.types.js';

type RawOrder = { id: string; account_id: string; store_id: string; status: 'CREATED'; total_cents: number; created_at: Date; updated_at: Date };
type RawItem = { id: string; order_id: string; product_id: string; product_variant_id: string;
  product_name_snapshot: string; sku_snapshot: string; unit_price_cents: number; quantity: number; line_total_cents: number };

@Injectable()
export class OrderRepository implements OrderRepositoryInterface {
  constructor(private readonly source: DataSource) {}
  private item(row: RawItem): OrderItemRecord {
    return { id: row.id, orderId: row.order_id, productId: row.product_id, productVariantId: row.product_variant_id,
      productNameSnapshot: row.product_name_snapshot, skuSnapshot: row.sku_snapshot,
      unitPriceCents: row.unit_price_cents, quantity: row.quantity, lineTotalCents: row.line_total_cents };
  }
  private async record(row: RawOrder, query: (sql: string, params: unknown[]) => Promise<unknown>): Promise<OrderRecord> {
    const items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [row.id]) as RawItem[];
    return { id: row.id, accountId: row.account_id, storeId: row.store_id, status: row.status,
      totalCents: row.total_cents, createdAt: row.created_at, updatedAt: row.updated_at, items: items.map(i => this.item(i)) };
  }
  async create(accountId: string, storeId: string, lines: OrderLineInput[]): Promise<OrderRecord | null> {
    return this.source.transaction(async manager => {
      const stores = await manager.query("SELECT id FROM stores WHERE id = $1 AND status = 'ACTIVE' FOR SHARE", [storeId]) as Array<{ id: string }>;
      if (!stores.length) return null;
      const snapshots: Array<{ productId: string; variantId: string; productName: string; sku: string; price: number; quantity: number; lineTotal: number }> = [];
      let total = 0;
      for (const line of lines) {
        const rows = await manager.query(`SELECT p.id AS product_id, p.name AS product_name, v.id AS variant_id, v.sku, v.price_cents
          FROM product_variants v JOIN products p ON p.id = v.product_id
          WHERE v.id = $1 AND p.store_id = $2 AND p.status = 'ACTIVE' AND v.status = 'ACTIVE' FOR SHARE OF p, v`,
          [line.variantId, storeId]) as Array<{ product_id: string; product_name: string; variant_id: string; sku: string; price_cents: number }>;
        const row = rows[0]; if (!row) return null;
        const lineTotal = row.price_cents * line.quantity;
        total += lineTotal;
        if (!Number.isSafeInteger(lineTotal) || total > 2147483647) return null;
        snapshots.push({ productId: row.product_id, variantId: row.variant_id, productName: row.product_name,
          sku: row.sku, price: row.price_cents, quantity: line.quantity, lineTotal });
      }
      const [order] = await manager.query('INSERT INTO orders (account_id, store_id, total_cents) VALUES ($1, $2, $3) RETURNING *',
        [accountId, storeId, total]) as RawOrder[];
      for (const item of snapshots) {
        await manager.query(`INSERT INTO order_items (order_id, product_id, product_variant_id, product_name_snapshot,
          sku_snapshot, unit_price_cents, quantity, line_total_cents) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [order.id, item.productId, item.variantId, item.productName, item.sku, item.price, item.quantity, item.lineTotal]);
      }
      return this.record(order, (sql, params) => manager.query(sql, params));
    });
  }
  async findById(id: string): Promise<OrderRecord | null> {
    const [row] = await this.source.query('SELECT * FROM orders WHERE id = $1', [id]) as RawOrder[];
    return row ? this.record(row, (sql, params) => this.source.query(sql, params)) : null;
  }
  async findByAccount(accountId: string): Promise<OrderRecord[]> {
    const rows = await this.source.query('SELECT * FROM orders WHERE account_id = $1 ORDER BY created_at DESC, id DESC', [accountId]) as RawOrder[];
    return Promise.all(rows.map(row => this.record(row, (sql, params) => this.source.query(sql, params))));
  }
}

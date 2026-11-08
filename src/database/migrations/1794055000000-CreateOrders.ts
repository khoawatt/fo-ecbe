import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateOrders1794055000000 implements MigrationInterface {
  name = 'CreateOrders1794055000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "orders" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "account_id" uuid NOT NULL, "store_id" uuid NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'CREATED', "total_cents" integer NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_orders" PRIMARY KEY ("id"),
      CONSTRAINT "fk_orders_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT,
      CONSTRAINT "fk_orders_store_id" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT,
      CONSTRAINT "ck_orders_status" CHECK ("status" IN ('CREATED')),
      CONSTRAINT "ck_orders_total" CHECK ("total_cents" >= 0)
    )`);
    await q.query('CREATE INDEX "ix_orders_account_id" ON "orders" ("account_id")');
    await q.query('CREATE INDEX "ix_orders_store_id" ON "orders" ("store_id")');
    await q.query(`CREATE TABLE "order_items" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL,
      "product_id" uuid NOT NULL, "product_variant_id" uuid NOT NULL,
      "product_name_snapshot" varchar(200) NOT NULL, "sku_snapshot" varchar(100) NOT NULL,
      "unit_price_cents" integer NOT NULL, "quantity" integer NOT NULL, "line_total_cents" integer NOT NULL,
      CONSTRAINT "pk_order_items" PRIMARY KEY ("id"),
      CONSTRAINT "fk_order_items_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_order_items_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
      CONSTRAINT "fk_order_items_product_variant_id" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT,
      CONSTRAINT "ck_order_items_quantity" CHECK ("quantity" > 0),
      CONSTRAINT "ck_order_items_price" CHECK ("unit_price_cents" >= 0 AND "line_total_cents" >= 0)
    )`);
    await q.query('CREATE INDEX "ix_order_items_order_id" ON "order_items" ("order_id")');
    await q.query(`CREATE FUNCTION protect_order_item_snapshots() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Order item snapshots are immutable' USING ERRCODE = '23514'; END $$`);
    await q.query('CREATE TRIGGER trg_order_items_immutable BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION protect_order_item_snapshots()');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE "order_items"'); await q.query('DROP FUNCTION protect_order_item_snapshots()');
    await q.query('DROP TABLE "orders"');
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateCatalog1794053000000 implements MigrationInterface {
  name = 'CreateCatalog1794053000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "products" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "store_id" uuid NOT NULL,
      "name" varchar(200) NOT NULL, "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_products" PRIMARY KEY ("id"),
      CONSTRAINT "fk_products_store_id" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT,
      CONSTRAINT "ck_products_status" CHECK ("status" IN ('DRAFT', 'ACTIVE', 'INACTIVE'))
    )`);
    await q.query('CREATE INDEX "ix_products_store_id" ON "products" ("store_id")');
    await q.query(`CREATE TABLE "product_variants" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL,
      "sku" varchar(100) NOT NULL, "price_cents" integer NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_product_variants" PRIMARY KEY ("id"),
      CONSTRAINT "fk_product_variants_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
      CONSTRAINT "ck_product_variants_status" CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
      CONSTRAINT "ck_product_variants_price" CHECK ("price_cents" >= 0)
    )`);
    await q.query('CREATE INDEX "ix_product_variants_product_id" ON "product_variants" ("product_id")');
    await q.query('CREATE UNIQUE INDEX "uq_product_variants_sku" ON "product_variants" ("sku")');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE "product_variants"'); await q.query('DROP TABLE "products"');
  }
}

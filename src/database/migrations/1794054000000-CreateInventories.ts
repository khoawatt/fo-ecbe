import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateInventories1794054000000 implements MigrationInterface {
  name = 'CreateInventories1794054000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "inventories" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "store_id" uuid NOT NULL,
      "product_variant_id" uuid NOT NULL, "quantity" integer NOT NULL DEFAULT 0,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_inventories" PRIMARY KEY ("id"),
      CONSTRAINT "fk_inventories_store_id" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT,
      CONSTRAINT "fk_inventories_product_variant_id" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT,
      CONSTRAINT "ck_inventories_quantity" CHECK ("quantity" >= 0)
    )`);
    await q.query('CREATE UNIQUE INDEX "uq_inventories_store_variant" ON "inventories" ("store_id", "product_variant_id")');
    await q.query(`CREATE FUNCTION check_inventory_variant_store() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM product_variants v JOIN products p ON p.id = v.product_id
          WHERE v.id = NEW.product_variant_id AND p.store_id = NEW.store_id) THEN
          RAISE EXCEPTION 'Inventory variant does not belong to store' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query('CREATE TRIGGER trg_inventories_variant_store BEFORE INSERT OR UPDATE OF store_id, product_variant_id ON inventories FOR EACH ROW EXECUTE FUNCTION check_inventory_variant_store()');
    await q.query(`CREATE FUNCTION protect_stocked_product_store() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.store_id <> OLD.store_id AND EXISTS (
          SELECT 1 FROM product_variants v JOIN inventories i ON i.product_variant_id = v.id
          WHERE v.product_id = OLD.id
        ) THEN
          RAISE EXCEPTION 'Stocked product cannot move stores' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query('CREATE TRIGGER trg_products_stocked_store BEFORE UPDATE OF store_id ON products FOR EACH ROW EXECUTE FUNCTION protect_stocked_product_store()');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TRIGGER IF EXISTS trg_products_stocked_store ON products');
    await q.query('DROP FUNCTION IF EXISTS protect_stocked_product_store()');
    await q.query('DROP TABLE "inventories"');
    await q.query('DROP FUNCTION check_inventory_variant_store()');
  }
}

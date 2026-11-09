import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateStores1794052000000 implements MigrationInterface {
  name = 'CreateStores1794052000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "stores" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_profile_id" uuid NOT NULL,
      "name" varchar(150) NOT NULL, "slug" varchar(160) NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_stores" PRIMARY KEY ("id"),
      CONSTRAINT "fk_stores_seller_profile_id" FOREIGN KEY ("seller_profile_id") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT,
      CONSTRAINT "ck_stores_status" CHECK ("status" IN ('DRAFT', 'ACTIVE', 'DISABLED'))
    )`);
    await q.query('CREATE INDEX "ix_stores_seller_profile_id" ON "stores" ("seller_profile_id")');
    await q.query('CREATE UNIQUE INDEX "uq_stores_slug" ON "stores" ("slug")');
  }
  async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE "stores"'); }
}

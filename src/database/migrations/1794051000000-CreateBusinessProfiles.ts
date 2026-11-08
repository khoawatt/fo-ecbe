import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBusinessProfiles1794051000000 implements MigrationInterface {
  name = 'CreateBusinessProfiles1794051000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "customer_profiles" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "account_id" uuid NOT NULL,
      "first_name" varchar(100) NOT NULL, "last_name" varchar(100) NOT NULL,
      "avatar_url" varchar(2048), "date_of_birth" date,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_customer_profiles" PRIMARY KEY ("id"),
      CONSTRAINT "fk_customer_profiles_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE
    )`);
    await q.query('CREATE UNIQUE INDEX "uq_customer_profiles_account_id" ON "customer_profiles" ("account_id")');
    await q.query(`CREATE TABLE "seller_profiles" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "account_id" uuid NOT NULL,
      "display_name" varchar(150) NOT NULL, "verification_status" varchar(20) NOT NULL DEFAULT 'PENDING',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_seller_profiles" PRIMARY KEY ("id"),
      CONSTRAINT "fk_seller_profiles_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE,
      CONSTRAINT "ck_seller_profiles_status" CHECK ("verification_status" IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'))
    )`);
    await q.query('CREATE UNIQUE INDEX "uq_seller_profiles_account_id" ON "seller_profiles" ("account_id")');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE "seller_profiles"');
    await q.query('DROP TABLE "customer_profiles"');
  }
}

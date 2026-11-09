import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountSessions1794050000000 implements MigrationInterface {
  name = 'CreateAccountSessions1794050000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "account_sessions" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "account_id" uuid NOT NULL,
      "refresh_token_hash" char(64) NOT NULL,
      "device_id" varchar(128),
      "device_name" varchar(128),
      "user_agent" varchar(512),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "last_used_at" timestamptz,
      "expires_at" timestamptz NOT NULL,
      "revoked_at" timestamptz,
      CONSTRAINT "pk_account_sessions" PRIMARY KEY ("id"),
      CONSTRAINT "fk_account_sessions_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE,
      CONSTRAINT "ck_account_sessions_expiry" CHECK ("expires_at" > "created_at")
    )`);
    await q.query('CREATE INDEX "ix_account_sessions_account_id" ON "account_sessions" ("account_id")');
    await q.query('CREATE INDEX "ix_account_sessions_expires_at" ON "account_sessions" ("expires_at")');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE "account_sessions"');
  }
}

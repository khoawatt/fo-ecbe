import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountRbacFoundation1791280000000
  implements MigrationInterface
{
  name = 'CreateAccountRbacFoundation1791280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(255) NOT NULL,
        "phone" varchar(20),
        "password_hash" varchar(255) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'PENDING',
        "email_verified" boolean NOT NULL DEFAULT false,
        "phone_verified" boolean NOT NULL DEFAULT false,
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "ck_accounts_email_canonical"
          CHECK ("email" = lower(btrim("email"))),
        CONSTRAINT "ck_accounts_status"
          CHECK (
            "status" IN (
              'PENDING',
              'ACTIVE',
              'SUSPENDED',
              'DISABLED'
            )
          )
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_accounts_email"
      ON "accounts" ("email")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_accounts_phone"
      ON "accounts" ("phone")
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(50) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" varchar(255),
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_roles" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_roles_code"
      ON "roles" ("code")
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(100) NOT NULL,
        "description" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_permissions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_permissions_code"
      ON "permissions" ("code")
    `);

    await queryRunner.query(`
      CREATE TABLE "account_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_account_roles" PRIMARY KEY ("id"),
        CONSTRAINT "uq_account_roles_account_id_role_id"
          UNIQUE ("account_id", "role_id"),
        CONSTRAINT "fk_account_roles_account_id"
          FOREIGN KEY ("account_id")
          REFERENCES "accounts"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_account_roles_role_id"
          FOREIGN KEY ("role_id")
          REFERENCES "roles"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "ix_account_roles_role_id"
      ON "account_roles" ("role_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_role_permissions_role_id_permission_id"
          UNIQUE ("role_id", "permission_id"),
        CONSTRAINT "fk_role_permissions_role_id"
          FOREIGN KEY ("role_id")
          REFERENCES "roles"("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_role_permissions_permission_id"
          FOREIGN KEY ("permission_id")
          REFERENCES "permissions"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "ix_role_permissions_permission_id"
      ON "role_permissions" ("permission_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "role_permissions"');
    await queryRunner.query('DROP TABLE IF EXISTS "account_roles"');
    await queryRunner.query('DROP TABLE IF EXISTS "permissions"');
    await queryRunner.query('DROP TABLE IF EXISTS "roles"');
    await queryRunner.query('DROP TABLE IF EXISTS "accounts"');
  }
}

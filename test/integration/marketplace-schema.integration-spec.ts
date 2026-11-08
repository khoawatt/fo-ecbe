import 'reflect-metadata';

import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import AppDataSource from '../../src/database/data-source.js';
import { AccountEntity } from '../../src/database/entities/account.entity.js';
import { AccountRoleEntity } from '../../src/database/entities/account-role.entity.js';
import { AccountSessionEntity } from '../../src/database/entities/account-session.entity.js';
import { PermissionEntity } from '../../src/database/entities/permission.entity.js';
import { RoleEntity } from '../../src/database/entities/role.entity.js';
import { RolePermissionEntity } from '../../src/database/entities/role-permission.entity.js';
import { CustomerProfileEntity } from '../../src/database/entities/customer-profile.entity.js';
import { SellerProfileEntity } from '../../src/database/entities/seller-profile.entity.js';
import { StoreEntity } from '../../src/database/entities/store.entity.js';
import { ProductEntity } from '../../src/database/entities/product.entity.js';
import { ProductVariantEntity } from '../../src/database/entities/product-variant.entity.js';
import { InventoryEntity } from '../../src/database/entities/inventory.entity.js';
import { OrderEntity } from '../../src/database/entities/order.entity.js';
import { OrderItemEntity } from '../../src/database/entities/order-item.entity.js';
import { CreateAccountRbacFoundation1791280000000 } from '../../src/database/migrations/1791280000000-CreateAccountRbacFoundation.js';
import { AddRbacCanonicalization1793874600000 } from '../../src/database/migrations/1793874600000-AddRbacCanonicalization.js';
import { CreateAccountSessions1794050000000 } from '../../src/database/migrations/1794050000000-CreateAccountSessions.js';
import { CreateBusinessProfiles1794051000000 } from '../../src/database/migrations/1794051000000-CreateBusinessProfiles.js';
import { CreateStores1794052000000 } from '../../src/database/migrations/1794052000000-CreateStores.js';
import { CreateCatalog1794053000000 } from '../../src/database/migrations/1794053000000-CreateCatalog.js';
import { CreateInventories1794054000000 } from '../../src/database/migrations/1794054000000-CreateInventories.js';
import { CreateOrders1794055000000 } from '../../src/database/migrations/1794055000000-CreateOrders.js';

describe('Marketplace migrations and TypeORM metadata (PostgreSQL)', () => {
  let schema: string;
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public');
  }, 30_000);
  afterAll(async () => {
    if (schema) await AppDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }, 30_000);

  it('applies, rolls back, reapplies, and produces no TypeORM schema diff', async () => {
    schema = `marketplace_schema_${randomUUID().replaceAll('-', '')}`;
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    const migrations = [new CreateAccountRbacFoundation1791280000000(), new AddRbacCanonicalization1793874600000(),
      new CreateAccountSessions1794050000000(), new CreateBusinessProfiles1794051000000(), new CreateStores1794052000000(),
      new CreateCatalog1794053000000(), new CreateInventories1794054000000(), new CreateOrders1794055000000()];
    try {
      await runner.query(`CREATE SCHEMA "${schema}"`);
      await runner.query(`SET search_path TO "${schema}", public`);
      await runner.startTransaction();
      for (const migration of migrations) await migration.up(runner);
      for (const migration of migrations.slice(3).reverse()) await migration.down(runner);
      const [base] = await runner.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'accounts'", [schema]) as Array<{ count: number }>;
      expect(base.count).toBe(1);
      for (const migration of migrations.slice(3)) await migration.up(runner);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally { await runner.release(); }
    const options = AppDataSource.options;
    if (options.type !== 'postgres') throw new Error('PostgreSQL required');
    const source = new DataSource({ ...options, schema: undefined,
      entities: [AccountEntity, AccountRoleEntity, AccountSessionEntity, PermissionEntity, RoleEntity, RolePermissionEntity,
        CustomerProfileEntity, SellerProfileEntity, StoreEntity, ProductEntity, ProductVariantEntity, InventoryEntity,
        OrderEntity, OrderItemEntity], migrations: [],
      extra: { ...(options.extra ?? {}), options: `-c search_path="${schema}",public` } });
    await source.initialize();
    try {
      const [connection] = await source.query('SELECT current_schema() AS name') as Array<{ name: string }>;
      expect(connection.name).toBe(schema);
      const diff = await source.driver.createSchemaBuilder().log();
      expect(diff.upQueries).toEqual([]);
      expect(diff.downQueries).toEqual([]);
    } finally { await source.destroy(); }
  }, 30_000);
});

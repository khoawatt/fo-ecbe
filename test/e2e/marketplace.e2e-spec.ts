import 'reflect-metadata';

import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppConfigModule } from '../../src/config/config.module.js';
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
import { AccountService } from '../../src/modules/account/account.service.js';
import { AccountStatus } from '../../src/modules/account/types/account-status.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { ProfileModule } from '../../src/modules/profile/profile.module.js';
import { StoreModule } from '../../src/modules/store/store.module.js';
import { CatalogModule } from '../../src/modules/catalog/catalog.module.js';
import { InventoryModule } from '../../src/modules/inventory/inventory.module.js';
import { OrderModule } from '../../src/modules/order/order.module.js';

describe('Marketplace ownership and order foundation (PostgreSQL e2e)', () => {
  let schema: string;
  let app: INestApplication;
  let source: DataSource;
  let accounts: AccountService;
  const password = 'synthetic-marketplace-password';

  const bearer = (token: string) => `Bearer ${token}`;
  const login = async (email: string): Promise<string> => {
    const result = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
    return result.body.accessToken as string;
  };
  const createAccount = async (email: string): Promise<string> => {
    const account = await accounts.createAccount({ email, password });
    await accounts.setAccountStatus(account.id, AccountStatus.ACTIVE);
    return account.id;
  };

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public');
    schema = `marketplace_e2e_${randomUUID().replaceAll('-', '')}`;
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.query(`CREATE SCHEMA "${schema}"`);
      await runner.query(`SET search_path TO "${schema}", public`);
      await runner.startTransaction();
      try {
        for (const migration of [new CreateAccountRbacFoundation1791280000000(), new AddRbacCanonicalization1793874600000(),
          new CreateAccountSessions1794050000000(), new CreateBusinessProfiles1794051000000(), new CreateStores1794052000000(),
          new CreateCatalog1794053000000(), new CreateInventories1794054000000(), new CreateOrders1794055000000()]) {
          await migration.up(runner);
        }
        await runner.commitTransaction();
      } catch (error) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        throw error;
      }
    } finally { await runner.release(); }
    const options = AppDataSource.options;
    if (options.type !== 'postgres') throw new Error('Marketplace e2e requires PostgreSQL');
    const moduleRef = await Test.createTestingModule({ imports: [
      AppConfigModule,
      TypeOrmModule.forRoot({ ...options, entities: [AccountEntity, AccountRoleEntity, AccountSessionEntity,
        PermissionEntity, RoleEntity, RolePermissionEntity, CustomerProfileEntity, SellerProfileEntity, StoreEntity,
        ProductEntity, ProductVariantEntity, InventoryEntity, OrderEntity, OrderItemEntity], migrations: [],
        extra: { ...(options.extra ?? {}), options: `-c search_path="${schema}",public` } }),
      AuthModule, ProfileModule, StoreModule, CatalogModule, InventoryModule, OrderModule
    ] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    source = moduleRef.get(DataSource);
    accounts = moduleRef.get(AccountService);
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
    if (AppDataSource.isInitialized) {
      await AppDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await AppDataSource.destroy();
    }
  }, 30_000);

  it('connects seller approval, ownership, catalog, atomic stock and immutable order snapshots', async () => {
    const adminId = await createAccount('admin@market.test');
    const sellerAId = await createAccount('seller-a@market.test');
    const sellerBId = await createAccount('seller-b@market.test');
    const buyerId = await createAccount('buyer@market.test');
    const [adminRole] = await source.query("INSERT INTO roles (code, name) VALUES ('ADMIN', 'Administrator') RETURNING id") as Array<{ id: string }>;
    await source.query('INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2)', [adminId, adminRole.id]);
    const adminToken = await login('admin@market.test');
    const sellerABefore = await login('seller-a@market.test');
    const sellerBBefore = await login('seller-b@market.test');
    const buyerToken = await login('buyer@market.test');

    const customer = await request(app.getHttpServer()).post('/customer/me').set('Authorization', bearer(buyerToken))
      .send({ firstName: 'Buyer', lastName: 'One' }).expect(201);
    expect(customer.body.accountId).toBe(buyerId);
    await request(app.getHttpServer()).patch('/customer/me').set('Authorization', bearer(buyerToken))
      .send({ lastName: 'Updated' }).expect(200);
    await request(app.getHttpServer()).get('/customer/me').set('Authorization', bearer(buyerToken)).expect(200)
      .expect(response => { expect(response.body.lastName).toBe('Updated'); });
    await request(app.getHttpServer()).post('/customer/me').set('Authorization', bearer(buyerToken))
      .send({ firstName: 'Duplicate', lastName: 'Profile' }).expect(409);
    const buyerApplication = await request(app.getHttpServer()).post('/seller/apply').set('Authorization', bearer(buyerToken))
      .send({ displayName: 'Buyer as Seller' }).expect(201);
    await request(app.getHttpServer()).patch(`/seller/${buyerApplication.body.id}/reject`).set('Authorization', bearer(adminToken)).expect(200);
    const reapplied = await request(app.getHttpServer()).post('/seller/apply').set('Authorization', bearer(buyerToken))
      .send({ displayName: 'Buyer Seller Reapplied' }).expect(201);
    expect(reapplied.body.verificationStatus).toBe('PENDING');
    await request(app.getHttpServer()).patch(`/seller/${buyerApplication.body.id}/approve`).set('Authorization', bearer(adminToken)).expect(200);
    expect(await accounts.findRoleCodesByAccountId(buyerId)).toContain('SELLER');
    const applicationA = await request(app.getHttpServer()).post('/seller/apply').set('Authorization', bearer(sellerABefore))
      .send({ displayName: 'Seller A' }).expect(201);
    const applicationB = await request(app.getHttpServer()).post('/seller/apply').set('Authorization', bearer(sellerBBefore))
      .send({ displayName: 'Seller B' }).expect(201);
    expect(applicationA.body.verificationStatus).toBe('PENDING');
    await request(app.getHttpServer()).post('/stores').set('Authorization', bearer(sellerABefore))
      .send({ name: 'Denied', slug: 'denied' }).expect(403);
    await request(app.getHttpServer()).patch(`/seller/${applicationA.body.id}/approve`).set('Authorization', bearer(sellerABefore)).expect(403);
    await request(app.getHttpServer()).patch(`/seller/${applicationA.body.id}/approve`).set('Authorization', bearer(adminToken)).expect(200);
    await request(app.getHttpServer()).patch(`/seller/${applicationB.body.id}/approve`).set('Authorization', bearer(adminToken)).expect(200);
    expect(await accounts.findRoleCodesByAccountId(sellerAId)).toContain('SELLER');
    expect(await accounts.findRoleCodesByAccountId(sellerBId)).toContain('SELLER');
    const sellerA = await login('seller-a@market.test');
    const sellerB = await login('seller-b@market.test');

    const storeA = await request(app.getHttpServer()).post('/stores').set('Authorization', bearer(sellerA))
      .send({ name: 'Store A', slug: 'store-a' }).expect(201);
    const storeB = await request(app.getHttpServer()).post('/stores').set('Authorization', bearer(sellerB))
      .send({ name: 'Store B', slug: 'store-b' }).expect(201);
    const storeAId = storeA.body.id as string;
    const storeBId = storeB.body.id as string;
    await request(app.getHttpServer()).post('/stores').set('Authorization', bearer(sellerA))
      .send({ name: 'Store A Two', slug: 'store-a-two' }).expect(201);
    await request(app.getHttpServer()).get(`/stores/${storeAId}`).expect(404);
    await request(app.getHttpServer()).patch(`/stores/${storeAId}`).set('Authorization', bearer(sellerB))
      .send({ name: 'Stolen' }).expect(403);
    await request(app.getHttpServer()).patch(`/stores/${storeAId}`).set('Authorization', bearer(sellerA))
      .send({ status: 'ACTIVE' }).expect(200);
    await request(app.getHttpServer()).patch(`/stores/${storeBId}`).set('Authorization', bearer(sellerB))
      .send({ status: 'ACTIVE' }).expect(200);

    const product = await request(app.getHttpServer()).post(`/catalog/stores/${storeAId}/products`)
      .set('Authorization', bearer(sellerA)).send({ name: 'First product' }).expect(201);
    const productId = product.body.id as string;
    await request(app.getHttpServer()).patch(`/catalog/products/${productId}`).set('Authorization', bearer(sellerB))
      .send({ name: 'Stolen' }).expect(403);
    await request(app.getHttpServer()).get(`/catalog/products/${productId}`).expect(404);
    await request(app.getHttpServer()).patch(`/catalog/products/${productId}`).set('Authorization', bearer(sellerA))
      .send({ status: 'ACTIVE' }).expect(200);
    const variant = await request(app.getHttpServer()).post(`/catalog/products/${productId}/variants`)
      .set('Authorization', bearer(sellerA)).send({ sku: 'SKU-A', priceCents: 1250 }).expect(201);
    const variantId = variant.body.id as string;
    await request(app.getHttpServer()).post(`/stores/${storeAId}/inventory/${variantId}`)
      .set('Authorization', bearer(sellerB)).send({ quantity: 5 }).expect(403);
    await request(app.getHttpServer()).post(`/stores/${storeAId}/inventory/${variantId}`)
      .set('Authorization', bearer(sellerA)).send({ quantity: 5 }).expect(201);
    await expect(source.query('INSERT INTO inventories (store_id, product_variant_id, quantity) VALUES ($1, $2, 1)',
      [storeBId, variantId])).rejects.toMatchObject({ driverError: { code: '23514' } });
    const adjustments = await Promise.all(Array.from({ length: 2 }, () => request(app.getHttpServer())
      .patch(`/stores/${storeAId}/inventory/${variantId}/adjust`).set('Authorization', bearer(sellerA)).send({ delta: -4 })));
    expect(adjustments.map(result => result.status).sort()).toEqual([200, 409]);
    const [stock] = await source.query('SELECT quantity FROM inventories WHERE store_id = $1 AND product_variant_id = $2',
      [storeAId, variantId]) as Array<{ quantity: number }>;
    expect(stock.quantity).toBe(1);

    const order = await request(app.getHttpServer()).post('/orders').set('Authorization', bearer(buyerToken))
      .send({ storeId: storeAId, items: [{ variantId, quantity: 2 }] }).expect(201);
    const orderId = order.body.id as string;
    expect(order.body.totalCents).toBe(2500);
    expect(order.body.items[0]).toMatchObject({ productNameSnapshot: 'First product', skuSnapshot: 'SKU-A', unitPriceCents: 1250 });
    await request(app.getHttpServer()).patch(`/catalog/variants/${variantId}`).set('Authorization', bearer(sellerA))
      .send({ priceCents: 2000 }).expect(200);
    await request(app.getHttpServer()).patch(`/catalog/products/${productId}`).set('Authorization', bearer(sellerA))
      .send({ name: 'Renamed product' }).expect(200);
    await request(app.getHttpServer()).get(`/orders/${orderId}`).set('Authorization', bearer(buyerToken)).expect(200)
      .expect(response => {
        expect(response.body.items[0].unitPriceCents).toBe(1250);
        expect(response.body.items[0].productNameSnapshot).toBe('First product');
      });
    await expect(source.query('UPDATE order_items SET unit_price_cents = 1 WHERE order_id = $1', [orderId]))
      .rejects.toMatchObject({ driverError: { code: '23514' } });
    await request(app.getHttpServer()).get(`/orders/${orderId}`).set('Authorization', bearer(sellerB)).expect(403);
    await request(app.getHttpServer()).get(`/orders/stores/${storeAId}/${orderId}`).set('Authorization', bearer(sellerA)).expect(200);
    await request(app.getHttpServer()).get(`/orders/stores/${storeAId}/${orderId}`).set('Authorization', bearer(sellerB)).expect(403);
    await request(app.getHttpServer()).get(`/orders/stores/${storeBId}/${orderId}`).set('Authorization', bearer(sellerB)).expect(403);
  }, 30_000);
});

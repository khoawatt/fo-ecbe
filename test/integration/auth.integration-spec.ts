import 'reflect-metadata';

import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppConfigModule } from '../../src/config/config.module.js';
import AppDataSource from '../../src/database/data-source.js';
import { AccountRoleEntity } from '../../src/database/entities/account-role.entity.js';
import { AccountEntity } from '../../src/database/entities/account.entity.js';
import { AccountSessionEntity } from '../../src/database/entities/account-session.entity.js';
import { PermissionEntity } from '../../src/database/entities/permission.entity.js';
import { RolePermissionEntity } from '../../src/database/entities/role-permission.entity.js';
import { RoleEntity } from '../../src/database/entities/role.entity.js';
import { CreateAccountRbacFoundation1791280000000 } from '../../src/database/migrations/1791280000000-CreateAccountRbacFoundation.js';
import { AddRbacCanonicalization1793874600000 } from '../../src/database/migrations/1793874600000-AddRbacCanonicalization.js';
import { CreateAccountSessions1794050000000 } from '../../src/database/migrations/1794050000000-CreateAccountSessions.js';
import { AccountService } from '../../src/modules/account/account.service.js';
import { AccountStatus } from '../../src/modules/account/types/account-status.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';

describe('AuthService (PostgreSQL integration)', () => {
  let schema: string;
  let app: TestingModule;
  let source: DataSource;
  let accounts: AccountService;
  let auth: AuthService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public');
    schema = `auth_integration_${randomUUID().replaceAll('-', '')}`;
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.query(`CREATE SCHEMA "${schema}"`);
      await runner.query(`SET search_path TO "${schema}", public`);
      await runner.startTransaction();
      try {
        await new CreateAccountRbacFoundation1791280000000().up(runner);
        await new AddRbacCanonicalization1793874600000().up(runner);
        await new CreateAccountSessions1794050000000().up(runner);
        await runner.commitTransaction();
      } catch (error) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        throw error;
      }
    } finally {
      await runner.release();
    }
    const options = AppDataSource.options;
    if (options.type !== 'postgres') throw new Error('Auth integration requires PostgreSQL');
    app = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        TypeOrmModule.forRoot({
          ...options,
          entities: [AccountEntity, AccountRoleEntity, AccountSessionEntity, PermissionEntity, RoleEntity, RolePermissionEntity],
          migrations: [],
          extra: { ...(options.extra ?? {}), options: `-c search_path="${schema}",public` }
        }),
        AuthModule
      ]
    }).compile();
    source = app.get(DataSource);
    accounts = app.get(AccountService);
    auth = app.get(AuthService);
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
    if (AppDataSource.isInitialized) {
      await AppDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await AppDataSource.destroy();
    }
  }, 30_000);

  it('uses real account credentials, status and ordered canonical roles', async () => {
    const account = await accounts.createAccount({ email: 'User@Example.COM', password: 'synthetic-integration-password' });
    expect(await auth.validateCredentials('USER@EXAMPLE.COM', 'synthetic-integration-password')).toBeNull();
    await accounts.setAccountStatus(account.id, AccountStatus.ACTIVE);
    const [admin] = await source.query("INSERT INTO roles (code, name) VALUES ('ADMIN', 'Administrator') RETURNING id") as Array<{ id: string }>;
    const [seller] = await source.query("INSERT INTO roles (code, name) VALUES ('SELLER', 'Seller') RETURNING id") as Array<{ id: string }>;
    await source.query('INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2), ($1, $3)', [account.id, seller?.id, admin?.id]);
    expect(await auth.validateCredentials(' USER@EXAMPLE.COM ', 'synthetic-integration-password')).toEqual({
      id: account.id, email: 'user@example.com', roleCodes: ['ADMIN', 'SELLER']
    });
    expect(await auth.validateCredentials('user@example.com', 'incorrect')).toBeNull();
    for (const status of [AccountStatus.SUSPENDED, AccountStatus.DISABLED, AccountStatus.PENDING]) {
      await accounts.setAccountStatus(account.id, status);
      expect(await auth.validateCredentials('user@example.com', 'synthetic-integration-password')).toBeNull();
      expect(await accounts.findRoleCodesByAccountId(account.id)).toEqual(['ADMIN', 'SELLER']);
    }
    await accounts.remove(account.id);
    expect(await auth.validateCredentials('user@example.com', 'synthetic-integration-password')).toBeNull();
  });
});

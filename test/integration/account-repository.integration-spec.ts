import 'reflect-metadata';

import { randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource, QueryFailedError } from 'typeorm';
import { AccountRoleEntity } from '../../src/database/entities/account-role.entity.js';
import { AccountEntity } from '../../src/database/entities/account.entity.js';
import { PermissionEntity } from '../../src/database/entities/permission.entity.js';
import { RolePermissionEntity } from '../../src/database/entities/role-permission.entity.js';
import { RoleEntity } from '../../src/database/entities/role.entity.js';
import { AppModule } from '../../src/app.module.js';
import { appConfig } from '../../src/config/app.config.js';
import AppDataSource from '../../src/database/data-source.js';
import { CreateAccountRbacFoundation1791280000000 } from '../../src/database/migrations/1791280000000-CreateAccountRbacFoundation.js';
import { AddRbacCanonicalization1793874600000 } from '../../src/database/migrations/1793874600000-AddRbacCanonicalization.js';
import { ACCOUNT_REPOSITORY } from '../../src/modules/account/account.constants.js';
import { AccountModule } from '../../src/modules/account/account.module.js';
import { AccountRepository } from '../../src/modules/account/account.repository.js';
import { AccountService } from '../../src/modules/account/account.service.js';
import type { AccountRepositoryInterface } from '../../src/modules/account/contracts/account-repository.interface.js';
import { AccountStatus } from '../../src/modules/account/types/account-status.js';

const entities = [AccountEntity, AccountRoleEntity, PermissionEntity, RoleEntity, RolePermissionEntity];

function passwordHashOf(value: unknown): unknown {
  return (value as Record<string, unknown>).passwordHash;
}

function sqlState(error: unknown): string | undefined {
  if (!(error instanceof QueryFailedError)) return undefined;
  return (error.driverError as { code?: string }).code;
}

describe('AccountRepository (PostgreSQL)', () => {
  let schema: string;
  let app: INestApplicationContext;
  let dataSource: DataSource;
  let repository: AccountRepositoryInterface;
  let service: AccountService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();

    schema = `account_repository_${randomUUID().replaceAll('-', '')}`;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.query(`CREATE SCHEMA "${schema}"`);
      await queryRunner.query(`SET search_path TO "${schema}", public`);
      await queryRunner.startTransaction();
      try {
        await new CreateAccountRbacFoundation1791280000000().up(queryRunner);
        await new AddRbacCanonicalization1793874600000().up(queryRunner);
        await queryRunner.commitTransaction();
      } catch (error) {
        if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
        throw error;
      }
    } finally {
      await queryRunner.release();
    }

    const options = AppDataSource.options;
    if (options.type !== 'postgres') {
      throw new Error('AccountRepository integration tests require PostgreSQL');
    }

    const testingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: [appConfig] }),
        TypeOrmModule.forRoot({
          ...options,
          entities,
          migrations: [],
          extra: {
            ...(options.extra ?? {}),
            options: `-c search_path="${schema}",public`
          }
        }),
        AccountModule
      ]
    }).compile();

    app = testingModule;
    dataSource = testingModule.get(DataSource);
    repository = testingModule
      .select(AccountModule)
      .get<AccountRepositoryInterface>(ACCOUNT_REPOSITORY, { strict: true });
    service = testingModule.select(AccountModule).get(AccountService, { strict: true });
  }, 30_000);

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE account_roles, role_permissions, roles, permissions, accounts RESTART IDENTITY CASCADE'
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (AppDataSource.isInitialized) {
      await AppDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await AppDataSource.destroy();
    }
  }, 30_000);

  it('registers the Symbol token inside AccountModule without exporting the concrete provider', () => {
    const concrete = app.select(AccountModule).get(AccountRepository, { strict: true });

    expect(repository).toBe(concrete);
    expect(service).toBeInstanceOf(AccountService);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, AccountModule)).toEqual([AccountService]);
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[]).toContain(AccountModule);
    expect((Reflect.getMetadata(MODULE_METADATA.EXPORTS, AccountModule) as unknown[] | undefined) ?? []).not.toContain(
      AccountRepository
    );
  });

  it('runs account creation, credential verification, status, roles and password changes against PostgreSQL', async () => {
    const account = await service.createAccount({ email: ' User@Example.COM ', password: 'synthetic-old-password' });
    expect(account.email).toBe('user@example.com');
    expect(account.status).toBe(AccountStatus.PENDING);
    expect(passwordHashOf(account)).toBeUndefined();
    const credentials = await repository.findCredentialsByEmail(account.email);
    expect(credentials?.passwordHash).not.toBe('synthetic-old-password');
    expect(await service.verifyCredentials('USER@EXAMPLE.COM', 'synthetic-old-password')).toBeNull();
    expect(await service.existsByEmail(' USER@EXAMPLE.COM ')).toBe(true);
    expect((await service.findByEmail(' USER@EXAMPLE.COM '))?.id).toBe(account.id);
    let duplicate: unknown;
    try { await service.createAccount({ email: 'USER@EXAMPLE.COM', password: 'synthetic-other-password' }); }
    catch (error) { duplicate = error; }
    expect(sqlState(duplicate)).toBe('23505');
    const updated = await service.updateAccount(account.id, { email: ' Updated@Example.COM ', phone: '+15550000004' });
    expect(updated.email).toBe('updated@example.com');
    expect(passwordHashOf(updated)).toBeUndefined();
    await service.setAccountStatus(account.id, AccountStatus.ACTIVE);
    const [admin] = (await dataSource.query("INSERT INTO roles (code, name) VALUES ('ADMIN', 'Administrator') RETURNING id")) as Array<{ id: string }>;
    const [user] = (await dataSource.query("INSERT INTO roles (code, name) VALUES ('USER', 'User') RETURNING id")) as Array<{ id: string }>;
    await dataSource.query('INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2), ($1, $3)', [account.id, user?.id, admin?.id]);
    expect(await service.verifyCredentials(' UPDATED@EXAMPLE.COM ', 'synthetic-old-password')).toEqual({
      id: account.id, email: 'updated@example.com', roleCodes: ['ADMIN', 'USER']
    });
    await expect(service.changePassword(account.id, 'wrong', 'synthetic-new-password')).rejects.toThrow();
    const changed = await service.changePassword(account.id, 'synthetic-old-password', 'synthetic-new-password');
    expect(passwordHashOf(changed)).toBeUndefined();
    expect(await service.verifyCredentials(updated.email, 'synthetic-old-password')).toBeNull();
    expect(await service.verifyCredentials(updated.email, 'synthetic-new-password')).toMatchObject({ id: account.id });
    for (const status of [AccountStatus.DISABLED, AccountStatus.SUSPENDED, AccountStatus.PENDING]) {
      await service.setAccountStatus(account.id, status);
      expect(await service.verifyCredentials(updated.email, 'synthetic-new-password')).toBeNull();
      expect(await service.findRoleCodesByAccountId(account.id)).toEqual(['ADMIN', 'USER']);
    }
    await service.remove(account.id);
    expect(await service.verifyCredentials(updated.email, 'synthetic-new-password')).toBeNull();
  });

  it('creates, reads, paginates, updates, and soft-deletes safe account records', async () => {
    const created = await repository.create({
      email: 'first@example.com',
      phone: '+15550000001',
      passwordHash: 'hash:first',
      status: AccountStatus.ACTIVE
    });
    await repository.create({
      email: 'second@example.com',
      passwordHash: 'hash:second'
    });

    expect(created.email).toBe('first@example.com');
    expect(passwordHashOf(created)).toBeUndefined();
    expect(passwordHashOf(await repository.findById(created.id))).toBeUndefined();
    expect(await repository.findByEmail(created.email)).toMatchObject({
      id: created.id,
      email: created.email
    });

    const page = await repository.findAll({ page: 1, limit: 1 });
    expect(page).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect(page.items).toHaveLength(1);
    expect(passwordHashOf(page.items[0])).toBeUndefined();

    const updated = await repository.update(created.id, {
      phone: '+15550000002',
      emailVerified: true
    });
    expect(updated).toMatchObject({
      phone: '+15550000002',
      emailVerified: true
    });
    expect(passwordHashOf(updated)).toBeUndefined();

    expect(await repository.softDelete(created.id)).toBe(true);
    expect(await repository.findById(created.id)).toBeNull();
    expect(await repository.findByEmail(created.email)).toBeNull();
    expect(await repository.findCredentialsByEmail(created.email)).toBeNull();
    expect((await repository.findAll({})).total).toBe(1);
  });

  it('includes soft-deleted rows in email existence and preserves global uniqueness', async () => {
    const account = await repository.create({
      email: 'reserved@example.com',
      passwordHash: 'hash:reserved'
    });
    await repository.softDelete(account.id);

    expect(await repository.existsByEmail(account.email)).toBe(true);

    let error: unknown;
    try {
      await repository.create({
        email: account.email,
        passwordHash: 'hash:duplicate'
      });
    } catch (caught) {
      error = caught;
    }
    expect(sqlState(error)).toBe('23505');
  });

  it('isolates password hashes and changes them only through updatePasswordHash', async () => {
    const account = await repository.create({
      email: 'credentials@example.com',
      passwordHash: 'hash:original',
      status: AccountStatus.ACTIVE
    });

    expect(await repository.findCredentialsByEmail(account.email)).toEqual({
      id: account.id,
      email: account.email,
      passwordHash: 'hash:original',
      status: AccountStatus.ACTIVE
    });
    expect(passwordHashOf(await repository.findById(account.id))).toBeUndefined();

    await repository.update(account.id, {
      phone: '+15550000003',
      passwordHash: 'hash:injected'
    } as never);
    expect((await repository.findCredentialsByEmail(account.email))?.passwordHash).toBe('hash:original');

    expect(await repository.updatePasswordHash(account.id, 'hash:changed')).toBe(true);
    expect((await repository.findCredentialsByEmail(account.email))?.passwordHash).toBe('hash:changed');
    expect(passwordHashOf(await repository.findById(account.id))).toBeUndefined();
  });

  it('returns deterministic roles for DISABLED accounts and none for soft-deleted accounts', async () => {
    const account = await repository.create({
      email: 'disabled@example.com',
      passwordHash: 'hash:disabled',
      status: AccountStatus.DISABLED
    });
    const [admin] = (await dataSource.query(
      "INSERT INTO roles (code, name) VALUES ('ADMIN', 'Administrator') RETURNING id"
    )) as Array<{ id: string }>;
    const [manager] = (await dataSource.query(
      "INSERT INTO roles (code, name) VALUES ('STORE_MANAGER', 'Store Manager') RETURNING id"
    )) as Array<{ id: string }>;
    await dataSource.query('INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2), ($1, $3)', [
      account.id,
      manager?.id,
      admin?.id
    ]);

    expect(await repository.findRoleCodesByAccountId(account.id)).toEqual(['ADMIN', 'STORE_MANAGER']);
    expect(await repository.findRoleCodesByAccountId(randomUUID())).toEqual([]);

    await repository.softDelete(account.id);
    expect(await repository.findRoleCodesByAccountId(account.id)).toEqual([]);
  });
});

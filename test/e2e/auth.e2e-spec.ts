import 'reflect-metadata';

import { randomUUID } from 'node:crypto';
import { Controller, Get, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Request } from 'express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppConfigModule } from '../../src/config/config.module.js';
import AppDataSource from '../../src/database/data-source.js';
import { AccountRoleEntity } from '../../src/database/entities/account-role.entity.js';
import { AccountEntity } from '../../src/database/entities/account.entity.js';
import { PermissionEntity } from '../../src/database/entities/permission.entity.js';
import { RolePermissionEntity } from '../../src/database/entities/role-permission.entity.js';
import { RoleEntity } from '../../src/database/entities/role.entity.js';
import { CreateAccountRbacFoundation1791280000000 } from '../../src/database/migrations/1791280000000-CreateAccountRbacFoundation.js';
import { AddRbacCanonicalization1793874600000 } from '../../src/database/migrations/1793874600000-AddRbacCanonicalization.js';
import { AccountService } from '../../src/modules/account/account.service.js';
import { AccountStatus } from '../../src/modules/account/types/account-status.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { JwtAccessTokenGuard } from '../../src/modules/auth/guards/jwt-access-token.guard.js';
import type { AuthenticatedPrincipal } from '../../src/modules/auth/types/authenticated-principal.js';

@Controller('auth-probe')
class AuthProbeController {
  @Get()
  @UseGuards(JwtAccessTokenGuard)
  read(@Req() req: Request & { user: AuthenticatedPrincipal }): AuthenticatedPrincipal {
    return req.user;
  }
}

describe('Local login and access JWT (PostgreSQL e2e)', () => {
  const secret = 'ci-only-synthetic-jwt-secret-32-bytes-minimum';
  const password = 'synthetic-e2e-password';
  let schema: string;
  let app: INestApplication;
  let dataSource: DataSource;
  let accountService: AccountService;
  let accountId: string;

  const login = (email = 'USER@EXAMPLE.COM', suppliedPassword = password) =>
    request(app.getHttpServer()).post('/auth/login').send({ email, password: suppliedPassword });
  const protectedRequest = (token?: string) => {
    const outgoing = request(app.getHttpServer()).get('/auth-probe');
    return token ? outgoing.set('Authorization', `Bearer ${token}`) : outgoing;
  };
  const signer = (signingSecret = secret) => new JwtService({
    secret: signingSecret,
    signOptions: { algorithm: 'HS256', issuer: 'fo-ecbe', audience: 'fo-ecbe-api', expiresIn: 900 }
  });
  const claims = () => ({ sub: accountId, roleCodes: ['ADMIN', 'SELLER'], tokenType: 'access' });

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    schema = `auth_e2e_${randomUUID().replaceAll('-', '')}`;
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.query(`CREATE SCHEMA "${schema}"`);
      await runner.query(`SET search_path TO "${schema}", public`);
      await runner.startTransaction();
      try {
        await new CreateAccountRbacFoundation1791280000000().up(runner);
        await new AddRbacCanonicalization1793874600000().up(runner);
        await runner.commitTransaction();
      } catch (error) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        throw error;
      }
    } finally {
      await runner.release();
    }
    const options = AppDataSource.options;
    if (options.type !== 'postgres') throw new Error('Auth e2e tests require PostgreSQL');
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        TypeOrmModule.forRoot({
          ...options,
          entities: [AccountEntity, AccountRoleEntity, PermissionEntity, RoleEntity, RolePermissionEntity],
          migrations: [],
          extra: { ...(options.extra ?? {}), options: `-c search_path="${schema}",public` }
        }),
        AuthModule
      ],
      controllers: [AuthProbeController]
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    dataSource = moduleRef.get(DataSource);
    accountService = moduleRef.get(AccountService);
  }, 30_000);

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE account_roles, role_permissions, roles, permissions, accounts RESTART IDENTITY CASCADE');
    const account = await accountService.createAccount({ email: 'User@Example.COM', password });
    accountId = account.id;
    await accountService.setAccountStatus(account.id, AccountStatus.ACTIVE);
    const [admin] = await dataSource.query("INSERT INTO roles (code, name) VALUES ('ADMIN', 'Administrator') RETURNING id") as Array<{ id: string }>;
    const [seller] = await dataSource.query("INSERT INTO roles (code, name) VALUES ('SELLER', 'Seller') RETURNING id") as Array<{ id: string }>;
    await dataSource.query('INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2), ($1, $3)', [account.id, seller?.id, admin?.id]);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (AppDataSource.isInitialized) {
      await AppDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await AppDataSource.destroy();
    }
  }, 30_000);

  it('logs in once and carries ordered canonical roles through a signed access token', async () => {
    const membershipBefore = await dataSource.query('SELECT role_id FROM account_roles WHERE account_id = $1', [accountId]) as unknown[];
    const response = await login().expect(200);
    expect(response.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    expect(typeof response.body.accessToken).toBe('string');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(password);
    const payload = await signer().verifyAsync<Record<string, unknown>>(response.body.accessToken as string, {
      algorithms: ['HS256'], issuer: 'fo-ecbe', audience: 'fo-ecbe-api'
    });
    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'roleCodes', 'sub', 'tokenType']);
    expect(payload).toMatchObject({ sub: accountId, roleCodes: ['ADMIN', 'SELLER'], tokenType: 'access' });
    await protectedRequest(response.body.accessToken as string).expect(200).expect({ id: accountId, roleCodes: ['ADMIN', 'SELLER'] });
    expect((await accountService.findById(accountId)).status).toBe(AccountStatus.ACTIVE);
    expect(await dataSource.query('SELECT role_id FROM account_roles WHERE account_id = $1', [accountId])).toEqual(membershipBefore);
  });

  it('returns the same 401 for unknown email, wrong password and inactive accounts', async () => {
    const unknown = await login('unknown@example.com').expect(401);
    const wrong = await login('user@example.com', 'wrong-password').expect(401);
    expect(wrong.body).toEqual(unknown.body);
    for (const status of [AccountStatus.PENDING, AccountStatus.SUSPENDED, AccountStatus.DISABLED]) {
      await accountService.setAccountStatus(accountId, status);
      const inactive = await login('user@example.com').expect(401);
      expect(inactive.body).toEqual(unknown.body);
      expect(await accountService.findRoleCodesByAccountId(accountId)).toEqual(['ADMIN', 'SELLER']);
    }
    await accountService.remove(accountId);
    expect((await login('user@example.com').expect(401)).body).toEqual(unknown.body);
  });

  it('rejects malformed login fields and unexpected JSON properties', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ password }).expect(401);
    await request(app.getHttpServer()).post('/auth/login').send({ email: 'user@example.com' }).expect(401);
    await request(app.getHttpServer()).post('/auth/login').send({ email: { bad: true }, password }).expect(401);
    await request(app.getHttpServer()).post('/auth/login').send({ email: 'user@example.com', password: { bad: true } }).expect(401);
    await request(app.getHttpServer()).post('/auth/login').send({ email: 'user@example.com', password, unexpected: true }).expect(400);
  });

  it('rejects missing, malformed, forged, expired and wrong-type access tokens', async () => {
    await protectedRequest().expect(401);
    await protectedRequest('malformed').expect(401);
    await protectedRequest(signer('different-synthetic-signing-secret-32-bytes').sign(claims())).expect(401);
    await protectedRequest(signer().sign(claims(), { expiresIn: -1 })).expect(401);
    await protectedRequest(signer().sign({ ...claims(), tokenType: 'refresh' })).expect(401);
    await protectedRequest(signer().sign({ ...claims(), sub: undefined })).expect(401);
    await protectedRequest(signer().sign({ ...claims(), roleCodes: ['admin'] })).expect(401);
  });

  it('rejects wrong issuer, audience and algorithm', async () => {
    await protectedRequest(signer().sign(claims(), { issuer: 'other-issuer' })).expect(401);
    await protectedRequest(signer().sign(claims(), { audience: 'other-audience' })).expect(401);
    await protectedRequest(signer().sign(claims(), { algorithm: 'HS384' })).expect(401);
  });

  it('verifies an issued token while PostgreSQL is unavailable', async () => {
    const response = await login().expect(200);
    await dataSource.destroy();
    try {
      await protectedRequest(response.body.accessToken as string).expect(200).expect({ id: accountId, roleCodes: ['ADMIN', 'SELLER'] });
    } finally {
      await dataSource.initialize();
    }
  });
});

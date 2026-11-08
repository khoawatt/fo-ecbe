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
import { AccountHttpModule } from '../../src/modules/account-http/account-http.module.js';
import { AuthorizationModule } from '../../src/modules/authorization/authorization.module.js';
import { PermissionGuard } from '../../src/modules/authorization/permission.guard.js';
import { Permissions } from '../../src/modules/authorization/permissions.decorator.js';
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

@Controller('permission-probe')
class PermissionProbeController {
  @Get()
  @Permissions('account:read')
  @UseGuards(JwtAccessTokenGuard, PermissionGuard)
  read() { return { allowed: true }; }
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
    if (options.type !== 'postgres') throw new Error('Auth e2e tests require PostgreSQL');
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        TypeOrmModule.forRoot({
          ...options,
          entities: [AccountEntity, AccountRoleEntity, AccountSessionEntity, PermissionEntity, RoleEntity, RolePermissionEntity],
          migrations: [],
          extra: { ...(options.extra ?? {}), options: `-c search_path="${schema}",public` }
        }),
        AuthModule,
        AccountHttpModule,
        AuthorizationModule
      ],
      controllers: [AuthProbeController, PermissionProbeController]
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    dataSource = moduleRef.get(DataSource);
    accountService = moduleRef.get(AccountService);
  }, 30_000);

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE account_sessions, account_roles, role_permissions, roles, permissions, accounts RESTART IDENTITY CASCADE');
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

  it('rotates one session without affecting another, rejects reuse, and logs out only the current session', async () => {
    const first = await login().expect(200);
    const second = await login().expect(200);
    const firstToken = first.body.refreshToken as string;
    const secondToken = second.body.refreshToken as string;
    expect(firstToken).not.toBe(secondToken);
    const rows = await dataSource.query('SELECT refresh_token_hash FROM account_sessions WHERE account_id = $1', [accountId]) as Array<{ refresh_token_hash: string }>;
    expect(rows).toHaveLength(2);
    expect(rows.every(row => /^[a-f0-9]{64}$/.test(row.refresh_token_hash))).toBe(true);
    expect(rows.every(row => row.refresh_token_hash !== firstToken && row.refresh_token_hash !== secondToken)).toBe(true);

    const rotated = await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: firstToken }).expect(200);
    expect(rotated.body.refreshToken).not.toBe(firstToken);
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: firstToken }).expect(401);
    await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken: rotated.body.refreshToken }).expect(204);
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: rotated.body.refreshToken }).expect(401);
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: secondToken }).expect(200);
  });

  it('allows exactly one concurrent rotation of the same refresh token', async () => {
    const initial = await login().expect(200);
    const token = initial.body.refreshToken as string;
    const results = await Promise.all(Array.from({ length: 2 }, () =>
      request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: token })
    ));
    expect(results.map(result => result.status).sort()).toEqual([200, 401]);
  });

  it('rejects refresh for inactive and soft-deleted accounts', async () => {
    const initial = await login().expect(200);
    for (const status of [AccountStatus.PENDING, AccountStatus.SUSPENDED, AccountStatus.DISABLED]) {
      await accountService.setAccountStatus(accountId, status);
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: initial.body.refreshToken }).expect(401);
    }
    await accountService.remove(accountId);
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: initial.body.refreshToken }).expect(401);
  });

  it('rejects invalid refresh tokens and unknown request fields', async () => {
    const access = await login().expect(200);
    const token = access.body.refreshToken as string;
    for (const invalid of ['bad-token', access.body.accessToken, signer('wrong-secret-that-is-long-enough-for-jwt').sign({
      sub: accountId, sid: randomUUID(), jti: randomUUID(), tokenType: 'refresh'
    })]) {
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: invalid }).expect(401);
    }
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: token, unexpected: true }).expect(400);
    await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken: 12 }).expect(400);
  });

  it('enforces self-service identity, ADMIN management and permission relationships', async () => {
    await request(app.getHttpServer()).get('/account/me').expect(401);
    const adminLogin = await login().expect(200);
    const adminToken = adminLogin.body.accessToken as string;
    await request(app.getHttpServer()).get('/account/me').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const other = await accountService.createAccount({ email: 'other@example.com', password });
    await accountService.setAccountStatus(other.id, AccountStatus.ACTIVE);
    await request(app.getHttpServer()).get(`/account/${other.id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    await request(app.getHttpServer()).patch(`/account/${other.id}/disable`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect((await accountService.findById(other.id)).status).toBe(AccountStatus.DISABLED);
    await request(app.getHttpServer()).get(`/account/${randomUUID()}`).set('Authorization', `Bearer ${adminToken}`).expect(404);

    await dataSource.query("DELETE FROM account_roles WHERE account_id = $1 AND role_id IN (SELECT id FROM roles WHERE code = 'ADMIN')", [accountId]);
    const sellerLogin = await login().expect(200);
    const sellerToken = sellerLogin.body.accessToken as string;
    const bearer = `Bearer ${sellerToken}`;
    await request(app.getHttpServer()).get(`/account/${other.id}`).set('Authorization', bearer).expect(403);
    await request(app.getHttpServer()).patch(`/account/${other.id}/disable`).set('Authorization', bearer).expect(403);
    await request(app.getHttpServer()).patch('/account/me').set('Authorization', bearer).send({ status: 'ACTIVE' }).expect(400);
    await request(app.getHttpServer()).patch('/account/me').set('Authorization', bearer).send({ email: 'updated@example.com' }).expect(200);
    expect((await accountService.findById(accountId)).email).toBe('updated@example.com');
    await request(app.getHttpServer()).patch('/account/me').set('Authorization', bearer).send({ email: 'other@example.com' }).expect(409);
    await request(app.getHttpServer()).get('/permission-probe').set('Authorization', bearer).expect(403);
    const [permission] = await dataSource.query("INSERT INTO permissions (code) VALUES ('account:read') RETURNING id") as Array<{ id: string }>;
    await dataSource.query("INSERT INTO role_permissions (role_id, permission_id) SELECT id, $1 FROM roles WHERE code = 'SELLER'", [permission?.id]);
    await request(app.getHttpServer()).get('/permission-probe').set('Authorization', bearer).expect(200);
  });
});

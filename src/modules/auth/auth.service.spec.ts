import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import { AccountService } from '../account/account.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const id = '14701422-d28a-4f03-898a-861a20c865ce';
  const account = { id, email: 'user@example.com', roleCodes: ['ADMIN', 'SELLER'] };
  const secret = 'synthetic-unit-test-secret-at-least-32-bytes';

  it('delegates credential validation exactly once to AccountService', async () => {
    const verifyCredentials = vi.fn().mockResolvedValue(account);
    const service = new AuthService(
      { verifyCredentials } as unknown as AccountService,
      new JwtService({ secret }),
      new ConfigService({ app: { jwtAccessTtlSeconds: 900 } })
    );
    expect(await service.validateCredentials('User@Example.COM', 'password')).toBe(account);
    expect(verifyCredentials).toHaveBeenCalledExactlyOnceWith('User@Example.COM', 'password');
  });

  it('returns null when AccountService rejects credentials', async () => {
    const verifyCredentials = vi.fn().mockResolvedValue(null);
    const service = new AuthService(
      { verifyCredentials } as unknown as AccountService,
      new JwtService({ secret }),
      new ConfigService({ app: { jwtAccessTtlSeconds: 900 } })
    );
    expect(await service.validateCredentials('unknown@example.com', 'wrong')).toBeNull();
    expect(verifyCredentials).toHaveBeenCalledOnce();
  });

  it('signs only approved claims from the already authenticated account', async () => {
    const verifyCredentials = vi.fn();
    const jwt = new JwtService({
      secret,
      signOptions: { algorithm: 'HS256', expiresIn: 900, issuer: 'fo-ecbe', audience: 'fo-ecbe-api' }
    });
    const service = new AuthService(
      { verifyCredentials } as unknown as AccountService,
      jwt,
      new ConfigService({ app: { jwtAccessTtlSeconds: 900 } })
    );
    const response = await service.issueAccessToken(account);
    const payload = await jwt.verifyAsync<Record<string, unknown>>(response.accessToken, {
      algorithms: ['HS256'], issuer: 'fo-ecbe', audience: 'fo-ecbe-api'
    });
    expect(response).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'roleCodes', 'sub', 'tokenType']);
    expect(payload).toMatchObject({ sub: id, roleCodes: ['ADMIN', 'SELLER'], tokenType: 'access' });
    expect(verifyCredentials).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toContain('passwordHash');
  });
});

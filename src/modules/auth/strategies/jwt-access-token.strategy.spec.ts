import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { JwtAccessTokenStrategy } from './jwt-access-token.strategy.js';

describe('JwtAccessTokenStrategy claim validation', () => {
  const strategy = new JwtAccessTokenStrategy(new ConfigService({
    app: {
      jwtAccessSecret: 'synthetic-unit-test-secret-at-least-32-bytes',
      jwtAccessIssuer: 'fo-ecbe', jwtAccessAudience: 'fo-ecbe-api', jwtAccessTtlSeconds: 900
    }
  }));
  const claims = {
    sub: '14701422-d28a-4f03-898a-861a20c865ce',
    roleCodes: ['ADMIN', 'SELLER'], tokenType: 'access', iat: 1000, exp: 1900
  };

  it('returns only a safe principal', () => {
    expect(strategy.validate({ ...claims, passwordHash: 'never-expose' })).toEqual({
      id: claims.sub, roleCodes: ['ADMIN', 'SELLER']
    });
  });

  it('rejects wrong token type, missing subject, malformed role codes and excessive lifetime', () => {
    for (const payload of [
      { ...claims, tokenType: 'refresh' }, { ...claims, sub: undefined },
      { ...claims, roleCodes: ['admin'] }, { ...claims, roleCodes: ['ADMIN', 42] },
      { ...claims, roleCodes: undefined }, { ...claims, exp: 1901 },
      { ...claims, iat: undefined }, { ...claims, iat: -1 },
      { ...claims, iat: Math.floor(Date.now() / 1000) + 60, exp: Math.floor(Date.now() / 1000) + 120 }
    ]) {
      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    }
  });
});

import { createHash, randomUUID } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import type { AccountSessionRepositoryInterface } from './account-session.repository.interface.js';
import { AccountSessionService } from './account-session.service.js';

describe('AccountSessionService token boundary', () => {
  const secret = 'synthetic-refresh-signing-secret-32-bytes-minimum';
  const config = new ConfigService({ app: {
    jwtRefreshSecret: secret, jwtRefreshTtlSeconds: 604800,
    jwtRefreshIssuer: 'fo-ecbe', jwtRefreshAudience: 'fo-ecbe-refresh'
  } });
  const jwt = new JwtService({ secret, signOptions: {
    algorithm: 'HS256', expiresIn: 604800, issuer: 'fo-ecbe', audience: 'fo-ecbe-refresh'
  } });
  const accountId = randomUUID();

  it('persists only a SHA-256 fingerprint and issues a session-bound unique-jti token', async () => {
    const createSession = vi.fn();
    const service = new AccountSessionService({ createSession } as unknown as AccountSessionRepositoryInterface, jwt, config);
    const first = await service.create(accountId, { deviceName: 'test' });
    const second = await service.create(accountId, {});
    const firstClaims = await service.verify(first);
    const secondClaims = await service.verify(second);
    expect(firstClaims).toMatchObject({ sub: accountId, tokenType: 'refresh' });
    expect(firstClaims.sid).not.toBe(secondClaims.sid);
    expect(firstClaims.jti).not.toBe(secondClaims.jti);
    expect(createSession).toHaveBeenCalledWith(accountId, firstClaims.sid,
      createHash('sha256').update(first).digest('hex'), expect.any(Date), { deviceName: 'test' });
    expect(JSON.stringify(createSession.mock.calls)).not.toContain(first);
  });

  it('returns one generic 401 for forged, expired, wrong-type, and malformed refresh tokens', async () => {
    const service = new AccountSessionService({} as AccountSessionRepositoryInterface, jwt, config);
    const sessionId = randomUUID();
    const claims = { sub: accountId, sid: sessionId, jti: randomUUID(), tokenType: 'refresh' };
    const forged = new JwtService({ secret: 'another-synthetic-secret-at-least-32-bytes' }).sign(claims);
    const expired = jwt.sign(claims, { expiresIn: -1 });
    const wrongType = jwt.sign({ ...claims, tokenType: 'access' });
    const missingSid = jwt.sign({ ...claims, sid: undefined });
    const wrongAudience = jwt.sign(claims, { audience: 'wrong-audience' });
    for (const token of [forged, expired, wrongType, missingSid, wrongAudience, 'malformed']) {
      await expect(service.verify(token)).rejects.toThrow(UnauthorizedException);
    }
  });

  it('denies a failed compare-and-swap rotation and revocation', async () => {
    const rotateIfCurrent = vi.fn().mockResolvedValue(false);
    const revokeIfCurrent = vi.fn().mockResolvedValue(false);
    const service = new AccountSessionService({ rotateIfCurrent, revokeIfCurrent } as unknown as AccountSessionRepositoryInterface, jwt, config);
    const token = jwt.sign({ sub: accountId, sid: randomUUID(), jti: randomUUID(), tokenType: 'refresh' });
    const claims = await service.verify(token);
    await expect(service.rotate(token, claims)).rejects.toThrow(UnauthorizedException);
    await expect(service.revoke(token, claims)).rejects.toThrow(UnauthorizedException);
    expect(rotateIfCurrent).toHaveBeenCalledOnce();
    expect(revokeIfCurrent).toHaveBeenCalledOnce();
  });
});

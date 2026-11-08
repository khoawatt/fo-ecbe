import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { ACCOUNT_SESSION_REPOSITORY } from './account-session.constants.js';
import type { AccountSessionRepositoryInterface, SessionMetadata } from './account-session.repository.interface.js';

export interface RefreshClaims {
  sub: string;
  sid: string;
  jti: string;
  tokenType: 'refresh';
  iat: number;
  exp: number;
}

@Injectable()
export class AccountSessionService {
  constructor(
    @Inject(ACCOUNT_SESSION_REPOSITORY) private readonly sessions: AccountSessionRepositoryInterface,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  private fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issue(accountId: string, sessionId: string): Promise<{ token: string; expiry: Date }> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const ttl = this.config.getOrThrow<number>('app.jwtRefreshTtlSeconds');
    const token = await this.jwt.signAsync({ sub: accountId, sid: sessionId, jti: randomUUID(), tokenType: 'refresh', iat: issuedAt });
    return { token, expiry: new Date((issuedAt + ttl) * 1000) };
  }

  async create(accountId: string, metadata: SessionMetadata): Promise<string> {
    const sessionId = randomUUID();
    const next = await this.issue(accountId, sessionId);
    await this.sessions.createSession(accountId, sessionId, this.fingerprint(next.token), next.expiry, metadata);
    return next.token;
  }

  async verify(token: string): Promise<RefreshClaims> {
    try {
      const claims = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        algorithms: ['HS256'],
        issuer: this.config.getOrThrow<string>('app.jwtRefreshIssuer'),
        audience: this.config.getOrThrow<string>('app.jwtRefreshAudience')
      });
      const ttl = this.config.getOrThrow<number>('app.jwtRefreshTtlSeconds');
      if (!isUUID(claims.sub) || !isUUID(claims.sid) || !isUUID(claims.jti) || claims.tokenType !== 'refresh' ||
        !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) ||
        (claims.iat as number) > Math.floor(Date.now() / 1000) ||
        (claims.exp as number) <= (claims.iat as number) ||
        (claims.exp as number) - (claims.iat as number) > ttl) throw new Error('Invalid claims');
      return claims as unknown as RefreshClaims;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async rotate(token: string, claims: RefreshClaims): Promise<string> {
    const next = await this.issue(claims.sub, claims.sid);
    if (!(await this.sessions.rotateIfCurrent(claims.sub, claims.sid, this.fingerprint(token), this.fingerprint(next.token), next.expiry))) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return next.token;
  }

  async revoke(token: string, claims: RefreshClaims): Promise<void> {
    if (!(await this.sessions.revokeIfCurrent(claims.sub, claims.sid, this.fingerprint(token)))) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  get expiresIn(): number {
    return this.config.getOrThrow<number>('app.jwtRefreshTtlSeconds');
  }
}

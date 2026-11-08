import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service.js';
import type { AuthenticatedAccount } from '../account/contracts/account-service.types.js';
import { AccountStatus } from '../account/types/account-status.js';
import { AccountSessionService } from '../account-session/account-session.service.js';
import type { LoginResponse, TokenPairResponse } from './types/auth-token.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly accounts: AccountService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: AccountSessionService
  ) {}

  validateCredentials(email: string, password: string): Promise<AuthenticatedAccount | null> {
    return this.accounts.verifyCredentials(email, password);
  }

  async issueAccessToken(account: AuthenticatedAccount): Promise<LoginResponse> {
    const accessToken = await this.jwt.signAsync({
      sub: account.id,
      roleCodes: account.roleCodes,
      tokenType: 'access'
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.getOrThrow<number>('app.jwtAccessTtlSeconds')
    };
  }

  async issueTokenPair(account: AuthenticatedAccount, userAgent?: string): Promise<TokenPairResponse> {
    const access = await this.issueAccessToken(account);
    const refreshToken = await this.sessions.create(account.id, { userAgent: userAgent?.slice(0, 512) });
    return { ...access, refreshToken, refreshExpiresIn: this.sessions.expiresIn };
  }

  async refresh(refreshToken: string): Promise<TokenPairResponse> {
    const claims = await this.sessions.verify(refreshToken);
    const account = await this.accounts.findById(claims.sub).catch(() => null);
    if (!account || account.status !== AccountStatus.ACTIVE) throw new UnauthorizedException('Invalid refresh token');
    const roleCodes = await this.accounts.findRoleCodesByAccountId(account.id);
    const principal = { id: account.id, email: account.email, roleCodes };
    const access = await this.issueAccessToken(principal);
    const nextRefreshToken = await this.sessions.rotate(refreshToken, claims);
    return { ...access, refreshToken: nextRefreshToken, refreshExpiresIn: this.sessions.expiresIn };
  }

  async logout(refreshToken: string): Promise<void> {
    const claims = await this.sessions.verify(refreshToken);
    await this.sessions.revoke(refreshToken, claims);
  }
}

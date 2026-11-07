import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service.js';
import type { AuthenticatedAccount } from '../account/contracts/account-service.types.js';
import type { LoginResponse } from './types/auth-token.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly accounts: AccountService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
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
}

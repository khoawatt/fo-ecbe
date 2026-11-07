import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service.js';
import type { AuthenticatedAccount } from '../../account/contracts/account-service.types.js';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email', passwordField: 'password', session: false });
  }

  async validate(email: unknown, password: unknown): Promise<AuthenticatedAccount> {
    // Passport guards run before controller DTO pipes, so validate raw fields here.
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const account = await this.auth.validateCredentials(email, password);
    if (!account) throw new UnauthorizedException('Invalid credentials');
    return account;
  }
}

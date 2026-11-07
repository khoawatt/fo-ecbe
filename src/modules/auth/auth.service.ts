import { Injectable } from '@nestjs/common';
import { AccountService } from '../account/account.service.js';
import type { AuthenticatedAccount } from '../account/contracts/account-service.types.js';

@Injectable()
export class AuthService {
  constructor(private readonly accounts: AccountService) {}

  validateCredentials(email: string, password: string): Promise<AuthenticatedAccount | null> {
    return this.accounts.verifyCredentials(email, password);
  }
}

import { ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BaseServiceAbstract } from '../../core/service/base-service.abstract.js';
import { ACCOUNT_REPOSITORY } from './account.constants.js';
import type { AccountRepositoryInterface } from './contracts/account-repository.interface.js';
import type { AccountRecord, CreateAccountData, UpdateAccountData } from './contracts/account-repository.types.js';
import type { AuthenticatedAccount, CreateAccountInput, UpdateAccountInput } from './contracts/account-service.types.js';
import { PasswordHashingService } from './password-hashing.service.js';
import { AccountStatus } from './types/account-status.js';
import { normalizeEmail } from './utils/normalize-email.js';

@Injectable()
export class AccountService extends BaseServiceAbstract<AccountRecord, never, UpdateAccountData> {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepositoryInterface,
    private readonly passwords: PasswordHashingService
  ) {
    super(accounts);
  }

  // The base method is public; never blocks typed callers and this override blocks JavaScript callers.
  override create(): Promise<AccountRecord> {
    throw new ForbiddenException('Use createAccount');
  }

  async createAccount(input: CreateAccountInput): Promise<AccountRecord> {
    const data: CreateAccountData = {
      email: normalizeEmail(input.email),
      passwordHash: await this.passwords.hash(input.password)
    };
    if (input.phone !== undefined) data.phone = input.phone;
    return this.accounts.create(data);
  }

  updateAccount(id: string, input: UpdateAccountInput): Promise<AccountRecord> {
    const data: UpdateAccountData = {};
    if (input.email !== undefined) data.email = normalizeEmail(input.email);
    if (input.phone !== undefined) data.phone = input.phone;
    return this.update(id, data);
  }

  override update(id: string, data: UpdateAccountData): Promise<AccountRecord> {
    const safeData: UpdateAccountData = {};
    if (data.email !== undefined) safeData.email = normalizeEmail(data.email);
    if (data.phone !== undefined) safeData.phone = data.phone;
    if (data.status !== undefined) safeData.status = data.status;
    if (data.emailVerified !== undefined) safeData.emailVerified = data.emailVerified;
    if (data.phoneVerified !== undefined) safeData.phoneVerified = data.phoneVerified;
    if (data.lastLoginAt !== undefined) safeData.lastLoginAt = data.lastLoginAt;
    return super.update(id, safeData);
  }

  async changePassword(accountId: string, currentPassword: string, newPassword: string): Promise<AccountRecord> {
    const account = await this.findById(accountId);
    const credentials = await this.accounts.findCredentialsByEmail(account.email);
    if (!credentials || credentials.id !== accountId || !(await this.passwords.verify(currentPassword, credentials.passwordHash))) {
      throw new UnauthorizedException('Invalid current password');
    }
    const nextHash = await this.passwords.hash(newPassword);
    if (!(await this.accounts.updatePasswordHash(accountId, nextHash))) {
      throw new NotFoundException('Account not found');
    }
    return this.findById(accountId);
  }

  setAccountStatus(accountId: string, status: AccountStatus): Promise<AccountRecord> {
    if (!Object.values(AccountStatus).includes(status)) throw new RangeError('Invalid account status');
    return super.update(accountId, { status });
  }

  async verifyCredentials(email: string, password: string): Promise<AuthenticatedAccount | null> {
    const credentials = await this.accounts.findCredentialsByEmail(normalizeEmail(email));
    if (!credentials || credentials.status !== AccountStatus.ACTIVE || !(await this.passwords.verify(password, credentials.passwordHash))) return null;
    return {
      id: credentials.id,
      email: credentials.email,
      roleCodes: await this.accounts.findRoleCodesByAccountId(credentials.id)
    };
  }

  findByEmail(email: string): Promise<AccountRecord | null> {
    return this.accounts.findByEmail(normalizeEmail(email));
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.accounts.existsByEmail(normalizeEmail(email));
  }

  findRoleCodesByAccountId(accountId: string): Promise<string[]> {
    return this.accounts.findRoleCodesByAccountId(accountId);
  }
}

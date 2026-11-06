import type { BaseRepositoryInterface } from '../../../core/repository/base-repository.interface.js';
import type {
  AccountCredentials,
  AccountRecord,
  CreateAccountData,
  UpdateAccountData
} from './account-repository.types.js';

export interface AccountRepositoryInterface extends BaseRepositoryInterface<
  AccountRecord,
  CreateAccountData,
  UpdateAccountData
> {
  findByEmail(email: string): Promise<AccountRecord | null>;
  existsByEmail(email: string): Promise<boolean>;
  findCredentialsByEmail(email: string): Promise<AccountCredentials | null>;
  findRoleCodesByAccountId(accountId: string): Promise<string[]>;
  updatePasswordHash(accountId: string, passwordHash: string): Promise<boolean>;
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PageQuery } from '../../common/contracts/page-query.js';
import type { PageResult } from '../../common/contracts/page-result.js';
import { BaseRepositoryAbstract } from '../../core/repository/base-repository.abstract.js';
import { AccountEntity } from '../../database/entities/account.entity.js';
import { AccountSessionEntity } from '../../database/entities/account-session.entity.js';
import type { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import type { AccountRepositoryInterface } from './contracts/account-repository.interface.js';
import type {
  AccountCredentials,
  AccountRecord,
  CreateAccountData,
  UpdateAccountData
} from './contracts/account-repository.types.js';
import { AccountStatus } from './types/account-status.js';

const SAFE_ACCOUNT_COLUMNS: Array<keyof AccountEntity> = [
  'id',
  'email',
  'phone',
  'status',
  'emailVerified',
  'phoneVerified',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
  'deletedAt'
];

@Injectable()
export class AccountRepository
  extends BaseRepositoryAbstract<AccountRecord, CreateAccountData, UpdateAccountData>
  implements AccountRepositoryInterface
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>
  ) {
    super(accountRepository as unknown as Repository<AccountRecord>);
  }

  override async findById(id: string): Promise<AccountRecord | null> {
    const entity = await this.safeQuery().where('account.id = :id', { id }).getOne();
    return entity ? this.toRecord(entity) : null;
  }

  override async findAll(query: PageQuery): Promise<PageResult<AccountRecord>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 20);
    const [entities, total] = await this.safeQuery()
      .orderBy('account.createdAt', 'ASC')
      .addOrderBy('account.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: entities.map((entity) => this.toRecord(entity)),
      total,
      page,
      limit
    };
  }

  override async create(data: CreateAccountData): Promise<AccountRecord> {
    const entity = this.accountRepository.create(data);
    const saved = await this.accountRepository.save(entity);
    return this.toRecord(saved);
  }

  override async update(id: string, data: UpdateAccountData): Promise<AccountRecord | null> {
    return this.accountRepository.manager.transaction(async (manager) => {
      const entity = await manager.getRepository(AccountEntity).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!entity) return null;

      const safeUpdate: UpdateAccountData = {};
      if (data.email !== undefined) safeUpdate.email = data.email;
      if (data.phone !== undefined) safeUpdate.phone = data.phone;
      if (data.status !== undefined) safeUpdate.status = data.status;
      if (data.emailVerified !== undefined) safeUpdate.emailVerified = data.emailVerified;
      if (data.phoneVerified !== undefined) safeUpdate.phoneVerified = data.phoneVerified;
      if (data.lastLoginAt !== undefined) safeUpdate.lastLoginAt = data.lastLoginAt;
      manager.merge(AccountEntity, entity, safeUpdate);
      const saved = await manager.save(entity);
      if (data.status !== undefined && data.status !== AccountStatus.ACTIVE) {
        await this.revokeAllActiveSessionsByAccountId(manager, id);
      }
      return this.toRecord(saved);
    });
  }

  override async softDelete(id: string): Promise<boolean> {
    return this.accountRepository.manager.transaction(async (manager) => {
      const entity = await manager.getRepository(AccountEntity).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!entity) return false;
      const result = await manager.softDelete(AccountEntity, { id });
      await this.revokeAllActiveSessionsByAccountId(manager, id);
      return (result.affected ?? 0) > 0;
    });
  }

  private async revokeAllActiveSessionsByAccountId(manager: EntityManager, accountId: string): Promise<void> {
    await manager.createQueryBuilder().update(AccountSessionEntity)
      .set({ revokedAt: () => 'now()' })
      .where('account_id = :accountId AND revoked_at IS NULL', { accountId })
      .execute();
  }

  async findByEmail(email: string): Promise<AccountRecord | null> {
    const entity = await this.safeQuery().where('account.email = :email', { email }).getOne();
    return entity ? this.toRecord(entity) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.accountRepository
      .createQueryBuilder('account')
      .withDeleted()
      .where('account.email = :email', { email })
      .getExists();
  }

  async findCredentialsByEmail(email: string): Promise<AccountCredentials | null> {
    const account = await this.accountRepository
      .createQueryBuilder('account')
      .select(['account.id', 'account.email', 'account.status'])
      .addSelect('account.passwordHash')
      .where('account.email = :email', { email })
      .getOne();

    if (!account) return null;
    return {
      id: account.id,
      email: account.email,
      passwordHash: account.passwordHash,
      status: account.status
    };
  }

  async findRoleCodesByAccountId(accountId: string): Promise<string[]> {
    const rows = (await this.accountRepository
      .createQueryBuilder('account')
      .select('role.code', 'code')
      .innerJoin('account_roles', 'accountRole', 'accountRole.account_id = account.id')
      .innerJoin('roles', 'role', 'role.id = accountRole.role_id')
      .where('account.id = :accountId', { accountId })
      .orderBy('role.code', 'ASC')
      .getRawMany()) as Array<{ code: string }>;

    return rows.map(({ code }) => code);
  }

  async updatePasswordHash(accountId: string, passwordHash: string): Promise<boolean> {
    const result = await this.accountRepository
      .createQueryBuilder()
      .update(AccountEntity)
      .set({ passwordHash })
      .where('id = :accountId', { accountId })
      .andWhere('deleted_at IS NULL')
      .execute();
    return (result.affected ?? 0) > 0;
  }

  private safeQuery(): SelectQueryBuilder<AccountEntity> {
    return this.accountRepository
      .createQueryBuilder('account')
      .select(SAFE_ACCOUNT_COLUMNS.map((column) => `account.${column}`));
  }

  private toRecord(entity: AccountEntity): AccountRecord {
    return {
      id: entity.id,
      email: entity.email,
      phone: entity.phone,
      status: entity.status,
      emailVerified: entity.emailVerified,
      phoneVerified: entity.phoneVerified,
      lastLoginAt: entity.lastLoginAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt
    };
  }
}

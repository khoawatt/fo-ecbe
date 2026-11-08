import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CustomerProfileEntity } from '../../database/entities/customer-profile.entity.js';
import { SellerProfileEntity, SellerVerificationStatus } from '../../database/entities/seller-profile.entity.js';
import type { ProfileRepositoryInterface } from './profile.repository.interface.js';
import type { CustomerProfileInput, CustomerProfileRecord, SellerProfileRecord } from './profile.types.js';

@Injectable()
export class ProfileRepository implements ProfileRepositoryInterface {
  constructor(
    @InjectRepository(CustomerProfileEntity) private readonly customers: Repository<CustomerProfileEntity>,
    @InjectRepository(SellerProfileEntity) private readonly sellers: Repository<SellerProfileEntity>,
    private readonly source: DataSource
  ) {}

  private customer(entity: CustomerProfileEntity): CustomerProfileRecord {
    const { id, accountId, firstName, lastName, avatarUrl, dateOfBirth, createdAt, updatedAt } = entity;
    return { id, accountId, firstName, lastName, avatarUrl, dateOfBirth, createdAt, updatedAt };
  }
  private seller(entity: SellerProfileEntity): SellerProfileRecord {
    const { id, accountId, displayName, verificationStatus, createdAt, updatedAt } = entity;
    return { id, accountId, displayName, verificationStatus, createdAt, updatedAt };
  }
  async customerForAccount(accountId: string): Promise<CustomerProfileRecord | null> {
    const entity = await this.customers.findOneBy({ accountId });
    return entity ? this.customer(entity) : null;
  }
  async createCustomer(accountId: string, input: CustomerProfileInput): Promise<CustomerProfileRecord> {
    const entity = await this.customers.save(this.customers.create({ accountId, ...input }));
    return this.customer(entity);
  }
  async updateCustomer(accountId: string, input: Partial<CustomerProfileInput>): Promise<CustomerProfileRecord | null> {
    const entity = await this.customers.findOneBy({ accountId });
    if (!entity) return null;
    Object.assign(entity, input);
    return this.customer(await this.customers.save(entity));
  }
  async sellerForAccount(accountId: string): Promise<SellerProfileRecord | null> {
    const entity = await this.sellers.findOneBy({ accountId });
    return entity ? this.seller(entity) : null;
  }
  async createSeller(accountId: string, displayName: string): Promise<SellerProfileRecord> {
    return this.seller(await this.sellers.save(this.sellers.create({ accountId, displayName })));
  }
  async reapplySeller(accountId: string, displayName: string): Promise<SellerProfileRecord | null> {
    const result = await this.sellers.createQueryBuilder().update(SellerProfileEntity)
      .set({ displayName, verificationStatus: SellerVerificationStatus.PENDING })
      .where('account_id = :accountId AND verification_status = :status', { accountId, status: SellerVerificationStatus.REJECTED })
      .execute();
    return result.affected === 1 ? this.seller((await this.sellers.findOneBy({ accountId }))!) : null;
  }
  async reviewSeller(id: string, approve: boolean): Promise<SellerProfileRecord | null> {
    return this.source.transaction(async manager => {
      const status = approve ? SellerVerificationStatus.APPROVED : SellerVerificationStatus.REJECTED;
      const updated = await manager.createQueryBuilder().update(SellerProfileEntity)
        .set({ verificationStatus: status })
        .where('id = :id AND verification_status = :pending', { id, pending: SellerVerificationStatus.PENDING })
        .execute();
      if (updated.affected !== 1) return null;
      const row = await manager.findOneByOrFail(SellerProfileEntity, { id });
      if (approve) {
        await manager.query("INSERT INTO roles (code, name) VALUES ('SELLER', 'Seller') ON CONFLICT (code) DO NOTHING");
        await manager.query("INSERT INTO account_roles (account_id, role_id) SELECT $1, id FROM roles WHERE code = 'SELLER' ON CONFLICT (account_id, role_id) DO NOTHING", [row.accountId]);
      }
      return this.seller(row);
    });
  }
}

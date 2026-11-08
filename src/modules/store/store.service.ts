import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SellerVerificationStatus } from '../../database/entities/seller-profile.entity.js';
import { StoreStatus } from '../../database/entities/store.entity.js';
import { ProfileService } from '../profile/profile.service.js';
import { AccountService } from '../account/account.service.js';
import { AccountStatus } from '../account/types/account-status.js';
import { STORE_REPOSITORY } from './store.constants.js';
import type { StoreRepositoryInterface } from './store.repository.interface.js';
import type { StoreInput, StoreRecord } from './store.types.js';

@Injectable()
export class StoreService {
  constructor(@Inject(STORE_REPOSITORY) private readonly stores: StoreRepositoryInterface, private readonly profiles: ProfileService,
    private readonly accounts: AccountService) {}
  private async approvedSeller(accountId: string) {
    const account = await this.accounts.findById(accountId).catch(() => null);
    if (!account || account.status !== AccountStatus.ACTIVE) throw new ForbiddenException('Active account required');
    const seller = await this.profiles.sellerForAccount(accountId).catch(() => null);
    if (!seller || seller.verificationStatus !== SellerVerificationStatus.APPROVED) throw new ForbiddenException('Approved seller required');
    return seller;
  }
  async create(accountId: string, input: StoreInput): Promise<StoreRecord> {
    const seller = await this.approvedSeller(accountId);
    try { return await this.stores.create(seller.id, input); }
    catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') throw new ConflictException('Store slug exists');
      throw error;
    }
  }
  async requireOwner(accountId: string, storeId: string): Promise<StoreRecord> {
    const store = await this.stores.findById(storeId);
    if (!store) throw new NotFoundException('Store not found');
    const seller = await this.approvedSeller(accountId);
    if (store.sellerProfileId !== seller.id) throw new ForbiddenException('Store ownership required');
    return store;
  }
  async update(accountId: string, storeId: string, data: Partial<StoreInput> & { status?: StoreStatus }): Promise<StoreRecord> {
    await this.requireOwner(accountId, storeId);
    const safe: Partial<StoreInput> & { status?: StoreStatus } = {};
    if (data.name !== undefined) safe.name = data.name;
    if (data.slug !== undefined) safe.slug = data.slug;
    if (data.status !== undefined) safe.status = data.status;
    try { return await this.stores.update(storeId, safe); }
    catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') throw new ConflictException('Store slug exists');
      throw error;
    }
  }
  async publicStore(storeId: string): Promise<StoreRecord> {
    const store = await this.stores.findById(storeId);
    if (!store || store.status !== StoreStatus.ACTIVE) throw new NotFoundException('Store not published');
    return store;
  }
  async mine(accountId: string): Promise<StoreRecord[]> {
    const seller = await this.approvedSeller(accountId);
    return this.stores.findBySeller(seller.id);
  }
}

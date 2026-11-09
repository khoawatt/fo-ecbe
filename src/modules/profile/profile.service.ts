import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AccountService } from '../account/account.service.js';
import { AccountStatus } from '../account/types/account-status.js';
import { SellerVerificationStatus } from '../../database/entities/seller-profile.entity.js';
import { PROFILE_REPOSITORY } from './profile.constants.js';
import type { ProfileRepositoryInterface } from './profile.repository.interface.js';
import type { CustomerProfileInput, CustomerProfileRecord, SellerProfileRecord } from './profile.types.js';

@Injectable()
export class ProfileService {
  constructor(@Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepositoryInterface,
    private readonly accounts: AccountService) {}

  private async requireActive(accountId: string): Promise<void> {
    const account = await this.accounts.findById(accountId).catch(() => null);
    if (!account || account.status !== AccountStatus.ACTIVE) throw new UnauthorizedException();
  }

  async customerForAccount(accountId: string): Promise<CustomerProfileRecord> {
    const profile = await this.profiles.customerForAccount(accountId);
    if (!profile) throw new NotFoundException('Customer profile not found');
    return profile;
  }

  async createCustomer(accountId: string, input: CustomerProfileInput): Promise<CustomerProfileRecord> {
    await this.requireActive(accountId);
    try { return await this.profiles.createCustomer(accountId, input); }
    catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') throw new ConflictException('Customer profile exists');
      throw error;
    }
  }

  async updateCustomer(accountId: string, input: Partial<CustomerProfileInput>): Promise<CustomerProfileRecord> {
    const safe: Partial<CustomerProfileInput> = {};
    if (input.firstName !== undefined) safe.firstName = input.firstName;
    if (input.lastName !== undefined) safe.lastName = input.lastName;
    if (input.avatarUrl !== undefined) safe.avatarUrl = input.avatarUrl;
    if (input.dateOfBirth !== undefined) safe.dateOfBirth = input.dateOfBirth;
    const updated = await this.profiles.updateCustomer(accountId, safe);
    if (!updated) throw new NotFoundException('Customer profile not found');
    return updated;
  }

  async sellerForAccount(accountId: string): Promise<SellerProfileRecord> {
    const profile = await this.profiles.sellerForAccount(accountId);
    if (!profile) throw new NotFoundException('Seller profile not found');
    return profile;
  }

  async applySeller(accountId: string, displayName: string): Promise<SellerProfileRecord> {
    await this.requireActive(accountId);
    const existing = await this.profiles.sellerForAccount(accountId);
    if (existing) {
      if (existing.verificationStatus !== SellerVerificationStatus.REJECTED) throw new ConflictException('Seller application already exists');
      const reapplied = await this.profiles.reapplySeller(accountId, displayName);
      if (!reapplied) throw new ConflictException('Seller application state changed');
      return reapplied;
    }
    try { return await this.profiles.createSeller(accountId, displayName); }
    catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') throw new ConflictException('Seller application already exists');
      throw error;
    }
  }

  async reviewSeller(id: string, approve: boolean): Promise<SellerProfileRecord> {
    const result = await this.profiles.reviewSeller(id, approve);
    if (!result) throw new ConflictException('Seller application is not pending');
    return result;
  }
}

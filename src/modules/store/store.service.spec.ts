import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AccountService } from '../account/account.service.js';
import { AccountStatus } from '../account/types/account-status.js';
import { SellerVerificationStatus } from '../../database/entities/seller-profile.entity.js';
import { ProfileService } from '../profile/profile.service.js';
import { StoreService } from './store.service.js';
import type { StoreRepositoryInterface } from './store.repository.interface.js';

describe('StoreService ownership', () => {
  it('rejects a valid seller from another store', async () => {
    const accountId = 'd98d6d99-3e54-4bfd-b3dd-427cf3156cc6';
    const service = new StoreService(
      { findById: async () => ({ id: 'store', sellerProfileId: 'other-seller', name: 'Other', slug: 'other',
        status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() }) } as unknown as StoreRepositoryInterface,
      { sellerForAccount: async () => ({ id: 'my-seller', verificationStatus: SellerVerificationStatus.APPROVED }) } as unknown as ProfileService,
      { findById: async () => ({ status: AccountStatus.ACTIVE }) } as unknown as AccountService
    );
    await expect(service.requireOwner(accountId, 'store')).rejects.toThrow(ForbiddenException);
  });
});

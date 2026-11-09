import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AccountService } from '../account/account.service.js';
import { AccountStatus } from '../account/types/account-status.js';
import { SellerVerificationStatus } from '../../database/entities/seller-profile.entity.js';
import { ProfileService } from './profile.service.js';
import type { ProfileRepositoryInterface } from './profile.repository.interface.js';

describe('ProfileService seller application policy', () => {
  const accountId = 'ad8ed376-4e6c-4e24-bda3-c9f790253539';
  const pending = { id: '709ed3d2-2f6e-414c-969e-f09e454c2337', accountId, displayName: 'Seller',
    verificationStatus: SellerVerificationStatus.PENDING, createdAt: new Date(), updatedAt: new Date() };

  it('allows a rejected applicant to reapply, but prevents a second pending application', async () => {
    const sellerForAccount = vi.fn().mockResolvedValueOnce({ ...pending, verificationStatus: SellerVerificationStatus.REJECTED })
      .mockResolvedValueOnce(pending);
    const reapplySeller = vi.fn().mockResolvedValue(pending);
    const service = new ProfileService({ sellerForAccount, reapplySeller } as unknown as ProfileRepositoryInterface,
      { findById: vi.fn().mockResolvedValue({ id: accountId, status: AccountStatus.ACTIVE }) } as unknown as AccountService);
    expect(await service.applySeller(accountId, 'Seller')).toEqual(pending);
    expect(reapplySeller).toHaveBeenCalledExactlyOnceWith(accountId, 'Seller');
    await expect(service.applySeller(accountId, 'Again')).rejects.toThrow(ConflictException);
  });

  it('rejects onboarding for an inactive account even with an old access token', async () => {
    const createSeller = vi.fn();
    const service = new ProfileService({ createSeller } as unknown as ProfileRepositoryInterface,
      { findById: vi.fn().mockResolvedValue({ id: accountId, status: AccountStatus.DISABLED }) } as unknown as AccountService);
    await expect(service.applySeller(accountId, 'Seller')).rejects.toThrow(UnauthorizedException);
    expect(createSeller).not.toHaveBeenCalled();
  });
});

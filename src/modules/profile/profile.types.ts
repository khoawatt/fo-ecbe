import type { SellerVerificationStatus } from '../../database/entities/seller-profile.entity.js';

export interface CustomerProfileRecord {
  id: string; accountId: string; firstName: string; lastName: string;
  avatarUrl: string | null; dateOfBirth: string | null; createdAt: Date; updatedAt: Date;
}
export interface SellerProfileRecord {
  id: string; accountId: string; displayName: string; verificationStatus: SellerVerificationStatus;
  createdAt: Date; updatedAt: Date;
}
export interface CustomerProfileInput { firstName: string; lastName: string; avatarUrl?: string | null; dateOfBirth?: string | null; }

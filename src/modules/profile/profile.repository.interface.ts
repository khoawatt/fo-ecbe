import type { CustomerProfileInput, CustomerProfileRecord, SellerProfileRecord } from './profile.types.js';

export interface ProfileRepositoryInterface {
  customerForAccount(accountId: string): Promise<CustomerProfileRecord | null>;
  createCustomer(accountId: string, input: CustomerProfileInput): Promise<CustomerProfileRecord>;
  updateCustomer(accountId: string, input: Partial<CustomerProfileInput>): Promise<CustomerProfileRecord | null>;
  sellerForAccount(accountId: string): Promise<SellerProfileRecord | null>;
  createSeller(accountId: string, displayName: string): Promise<SellerProfileRecord>;
  reapplySeller(accountId: string, displayName: string): Promise<SellerProfileRecord | null>;
  reviewSeller(id: string, approve: boolean): Promise<SellerProfileRecord | null>;
}

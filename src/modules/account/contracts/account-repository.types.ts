import type { AccountStatus } from '../types/account-status.js';

export interface AccountRecord {
  id: string;
  email: string;
  phone: string | null;
  status: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AccountCredentials {
  id: string;
  email: string;
  passwordHash: string;
  status: AccountStatus;
}

export interface CreateAccountData {
  email: string;
  phone?: string | null;
  passwordHash: string;
  status?: AccountStatus;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export interface UpdateAccountData {
  email?: string;
  phone?: string | null;
  status?: AccountStatus;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  lastLoginAt?: Date | null;
}

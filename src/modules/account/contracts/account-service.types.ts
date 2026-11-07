export interface CreateAccountInput {
  email: string;
  password: string;
  phone?: string | null;
}

export interface UpdateAccountInput {
  email?: string;
  phone?: string | null;
}

export interface AuthenticatedAccount {
  id: string;
  email: string;
  roleCodes: string[];
}

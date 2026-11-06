import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AccountService } from './account.service.js';
import type { AccountRepositoryInterface } from './contracts/account-repository.interface.js';
import type { AccountRecord } from './contracts/account-repository.types.js';
import { AccountStatus } from './types/account-status.js';
import type { PasswordHashingService } from './password-hashing.service.js';

const record = { id: 'id', email: 'user@example.com', status: AccountStatus.ACTIVE } as AccountRecord;
function setup() {
  const repo = {
    create: vi.fn().mockResolvedValue(record),
    update: vi.fn().mockResolvedValue(record),
    findById: vi.fn().mockResolvedValue(record),
    findByEmail: vi.fn().mockResolvedValue(record),
    existsByEmail: vi.fn().mockResolvedValue(true),
    findCredentialsByEmail: vi.fn().mockResolvedValue({ id: 'id', email: record.email, passwordHash: 'stored', status: AccountStatus.ACTIVE }),
    findRoleCodesByAccountId: vi.fn().mockResolvedValue(['ADMIN', 'USER']),
    updatePasswordHash: vi.fn().mockResolvedValue(true)
  };
  const passwords = { hash: vi.fn().mockResolvedValue('hashed'), verify: vi.fn().mockResolvedValue(true) };
  return { service: new AccountService(repo as unknown as AccountRepositoryInterface, passwords as unknown as PasswordHashingService), repo, passwords };
}

describe('AccountService', () => {
  it('normalizes and hashes creation, and blocks inherited create', async () => {
    const { service, repo } = setup();
    expect(await service.createAccount({ email: ' User@Example.COM ', password: 'secret', passwordHash: 'injected', emailVerified: true } as never)).toEqual(record);
    expect(repo.create).toHaveBeenCalledWith({ email: 'user@example.com', passwordHash: 'hashed' });
    expect(() => (service.create as (input: unknown) => unknown)({ passwordHash: 'injected' })).toThrow(ForbiddenException);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('allows only email and phone ordinary updates', async () => {
    const { service, repo } = setup();
    await service.updateAccount('id', { email: ' NEW@Example.COM ', phone: null, passwordHash: 'injected' } as never);
    expect(repo.update).toHaveBeenCalledWith('id', { email: 'new@example.com', phone: null });
    await service.update('id', { email: ' AGAIN@Example.COM ', passwordHash: 'injected' } as never);
    expect(repo.update).toHaveBeenLastCalledWith('id', { email: 'again@example.com' });
  });

  it('checks current password and changes only its hash', async () => {
    const { service, repo, passwords } = setup();
    expect(await service.changePassword('id', 'old', 'new')).toEqual(record);
    expect(passwords.verify).toHaveBeenCalledWith('old', 'stored');
    expect(repo.updatePasswordHash).toHaveBeenCalledWith('id', 'hashed');
    passwords.verify.mockResolvedValue(false);
    await expect(service.changePassword('id', 'wrong', 'new')).rejects.toThrow(UnauthorizedException);
  });

  it('returns only ACTIVE safe principal with canonical roles', async () => {
    const { service, repo, passwords } = setup();
    expect(await service.verifyCredentials(' USER@Example.COM ', 'secret')).toEqual({ id: 'id', email: record.email, roleCodes: ['ADMIN', 'USER'] });
    expect(repo.findCredentialsByEmail).toHaveBeenCalledWith(record.email);
    passwords.verify.mockResolvedValue(false);
    expect(await service.verifyCredentials(record.email, 'bad')).toBeNull();
    repo.findCredentialsByEmail.mockResolvedValue({ id: 'id', email: record.email, passwordHash: 'stored', status: AccountStatus.DISABLED });
    expect(await service.verifyCredentials(record.email, 'secret')).toBeNull();
  });
});

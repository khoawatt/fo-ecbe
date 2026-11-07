import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service.js';
import { LocalStrategy } from './local.strategy.js';

describe('LocalStrategy', () => {
  const account = { id: '14701422-d28a-4f03-898a-861a20c865ce', email: 'user@example.com', roleCodes: [] };

  it('returns the authenticated account from AuthService', async () => {
    const validateCredentials = vi.fn().mockResolvedValue(account);
    const strategy = new LocalStrategy({ validateCredentials } as unknown as AuthService);
    expect(await strategy.validate('user@example.com', 'password')).toBe(account);
    expect(validateCredentials).toHaveBeenCalledExactlyOnceWith('user@example.com', 'password');
  });

  it('uses the same 401 for unknown, invalid and inactive credentials', async () => {
    const validateCredentials = vi.fn().mockResolvedValue(null);
    const strategy = new LocalStrategy({ validateCredentials } as unknown as AuthService);
    for (const email of ['unknown@example.com', 'wrong@example.com', 'inactive@example.com']) {
      await expect(strategy.validate(email, 'password')).rejects.toThrow(UnauthorizedException);
    }
    expect(validateCredentials).toHaveBeenCalledTimes(3);
  });

  it('rejects missing and non-string raw fields before calling AuthService', async () => {
    const validateCredentials = vi.fn();
    const strategy = new LocalStrategy({ validateCredentials } as unknown as AuthService);
    for (const [email, password] of [
      [undefined, 'password'], ['user@example.com', undefined], [42, 'password'],
      ['user@example.com', { value: 'password' }], [' ', 'password'], ['user@example.com', '']
    ]) {
      await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
    }
    expect(validateCredentials).not.toHaveBeenCalled();
  });
});

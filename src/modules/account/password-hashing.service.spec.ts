import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { PasswordHashingService } from './password-hashing.service.js';

const service = new PasswordHashingService(new ConfigService({ app: { bcryptSaltRounds: 10 } }));
const legacyPassword = 'synthetic-legacy-password';
// Generated with legacy bcrypt@5.1.1 and bcryptjs@2.4.3 using synthetic input.
const legacyBcrypt = '$2b$10$PgZ6CcEMZQiilmK6uwrFjejWNAogVk7TjYxnz9snj8VMVt0m/dWHC';
const legacyBcryptjs = '$2a$10$jvLMbG9SvKwtB5Va3091qus0YkwG/R4rXRIRnLJ1wzkk7MDKfhw4S';

describe('PasswordHashingService', () => {
  it('hashes and verifies standard bcrypt hashes', async () => {
    const hash = await service.hash('synthetic-new-password');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    expect(await service.verify('synthetic-new-password', hash)).toBe(true);
    expect(await service.verify('wrong', hash)).toBe(false);
    expect(await service.verify('synthetic-new-password', 'invalid')).toBe(false);
  });

  it('verifies hashes from both legacy implementations', async () => {
    expect(await service.verify(legacyPassword, legacyBcrypt)).toBe(true);
    expect(await service.verify(legacyPassword, legacyBcryptjs)).toBe(true);
  });

  it('rejects empty and oversized UTF-8 new passwords', async () => {
    await expect(service.hash('')).rejects.toThrow();
    await expect(service.hash('é'.repeat(37))).rejects.toThrow();
  });
});

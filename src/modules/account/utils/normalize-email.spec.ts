import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './normalize-email.js';

describe('normalizeEmail', () => {
  it('trims, lowercases, and preserves normalized values', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });
});

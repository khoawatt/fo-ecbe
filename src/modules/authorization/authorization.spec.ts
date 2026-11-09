import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { PermissionGuard } from './permission.guard.js';
import { PermissionService } from './permission.service.js';
import { RolesGuard } from './roles.guard.js';

function context(roleCodes?: string[]): ExecutionContext {
  return {
    getHandler: () => function handler() {}, getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ user: roleCodes ? { id: 'account', roleCodes } : undefined }) })
  } as unknown as ExecutionContext;
}

describe('authorization guards', () => {
  it('requires any one canonical role and rejects a missing principal', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN', 'MANAGER']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(context(['SELLER', 'ADMIN']))).toBe(true);
    expect(guard.canActivate(context(['SELLER']))).toBe(false);
    expect(guard.canActivate(context())).toBe(false);
  });

  it('evaluates every required permission through the service only after authentication', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['account:read', 'account:update']) } as unknown as Reflector;
    const hasAll = vi.fn().mockResolvedValue(true);
    const guard = new PermissionGuard(reflector, { hasAll } as unknown as PermissionService);
    expect(await guard.canActivate(context())).toBe(false);
    expect(hasAll).not.toHaveBeenCalled();
    expect(await guard.canActivate(context(['ADMIN']))).toBe(true);
    expect(hasAll).toHaveBeenCalledExactlyOnceWith(['ADMIN'], ['account:read', 'account:update']);
  });
});

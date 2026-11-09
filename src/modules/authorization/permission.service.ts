import { Inject, Injectable } from '@nestjs/common';
import { PERMISSION_REPOSITORY } from './permission.constants.js';
import type { PermissionRepositoryInterface } from './permission.repository.interface.js';

@Injectable()
export class PermissionService {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly repository: PermissionRepositoryInterface) {}

  async hasAll(roleCodes: string[], required: string[]): Promise<boolean> {
    if (!required.length) return true;
    const granted = await this.repository.findCodesForRoles(roleCodes);
    return required.every(code => granted.includes(code));
  }
}

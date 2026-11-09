import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../../database/entities/permission.entity.js';
import type { PermissionRepositoryInterface } from './permission.repository.interface.js';

@Injectable()
export class PermissionRepository implements PermissionRepositoryInterface {
  constructor(@InjectRepository(PermissionEntity) private readonly permissions: Repository<PermissionEntity>) {}

  async findCodesForRoles(roleCodes: string[]): Promise<string[]> {
    if (!roleCodes.length) return [];
    const rows = await this.permissions.createQueryBuilder('permission')
      .select('DISTINCT permission.code', 'code')
      .innerJoin('role_permissions', 'rp', 'rp.permission_id = permission.id')
      .innerJoin('roles', 'role', 'role.id = rp.role_id')
      .where('role.code IN (:...roleCodes)', { roleCodes })
      .orderBy('permission.code', 'ASC')
      .getRawMany<{ code: string }>();
    return rows.map(row => row.code);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from '../../database/entities/permission.entity.js';
import { PERMISSION_REPOSITORY } from './permission.constants.js';
import { PermissionGuard } from './permission.guard.js';
import { PermissionRepository } from './permission.repository.js';
import { PermissionService } from './permission.service.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [TypeOrmModule.forFeature([PermissionEntity])],
  providers: [RolesGuard, PermissionGuard, PermissionService, PermissionRepository,
    { provide: PERMISSION_REPOSITORY, useExisting: PermissionRepository }],
  exports: [RolesGuard, PermissionGuard, PermissionService]
})
export class AuthorizationModule {}

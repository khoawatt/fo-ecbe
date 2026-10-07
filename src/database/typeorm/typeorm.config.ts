import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AccountRoleEntity } from '../entities/account-role.entity.js';
import { AccountEntity } from '../entities/account.entity.js';
import { PermissionEntity } from '../entities/permission.entity.js';
import { RolePermissionEntity } from '../entities/role-permission.entity.js';
import { RoleEntity } from '../entities/role.entity.js';

export function createTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('database.host'),
    port: config.getOrThrow<number>('database.port'),
    username: config.getOrThrow<string>('database.username'),
    password: config.getOrThrow<string>('database.password'),
    database: config.getOrThrow<string>('database.name'),
    entities: [
      AccountEntity,
      AccountRoleEntity,
      PermissionEntity,
      RoleEntity,
      RolePermissionEntity,
    ],
    autoLoadEntities: true,
    synchronize: false,
  };
}

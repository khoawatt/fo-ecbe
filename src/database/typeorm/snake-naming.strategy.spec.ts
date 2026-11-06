import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { createTypeOrmOptions } from './typeorm.config.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

describe('SnakeNamingStrategy', () => {
  it('maps camelCase properties to snake_case columns', () => {
    const strategy = new SnakeNamingStrategy();

    expect(strategy.columnName('passwordHash', undefined, [])).toBe('password_hash');
    expect(strategy.columnName('createdAt', undefined, [])).toBe('created_at');
    expect(strategy.columnName('roleId', undefined, [])).toBe('role_id');
  });

  it('preserves explicit column names and prefixes embedded columns', () => {
    const strategy = new SnakeNamingStrategy();

    expect(strategy.columnName('accountId', 'account_id', [])).toBe('account_id');
    expect(strategy.columnName('createdAt', undefined, ['auditData'])).toBe('audit_data_created_at');
  });

  it('derives snake_case table and relation names without changing explicit tables', () => {
    const strategy = new SnakeNamingStrategy();

    expect(strategy.tableName('AccountRoleEntity', undefined)).toBe('account_role_entity');
    expect(strategy.tableName('AccountRoleEntity', 'account_roles')).toBe('account_roles');
    expect(strategy.relationName('accountRoles')).toBe('account_roles');
    expect(strategy.joinColumnName('accountOwner', 'id')).toBe('account_owner_id');
    expect(strategy.joinTableName('accounts', 'roles', 'assignedRoles')).toBe('accounts_assigned_roles_roles');
    expect(strategy.joinTableColumnName('accountRoles', 'roleId')).toBe('account_roles_role_id');
  });

  it('is configured for the NestJS runtime DataSource', () => {
    const config = new ConfigService({
      database: {
        host: '127.0.0.1',
        port: 5432,
        username: 'postgres',
        password: 'synthetic-test-credential',
        name: 'fo_ecbe_test'
      }
    });

    expect(createTypeOrmOptions(config).namingStrategy).toBeInstanceOf(SnakeNamingStrategy);
  });
});

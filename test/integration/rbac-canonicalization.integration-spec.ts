import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { AccountRoleEntity } from '../../src/database/entities/account-role.entity.js';
import { AccountEntity } from '../../src/database/entities/account.entity.js';
import { PermissionEntity } from '../../src/database/entities/permission.entity.js';
import { RolePermissionEntity } from '../../src/database/entities/role-permission.entity.js';
import { RoleEntity } from '../../src/database/entities/role.entity.js';
import AppDataSource from '../../src/database/data-source.js';
import { CreateAccountRbacFoundation1791280000000 } from '../../src/database/migrations/1791280000000-CreateAccountRbacFoundation.js';
import { AddRbacCanonicalization1793874600000 } from '../../src/database/migrations/1793874600000-AddRbacCanonicalization.js';

type Row = { id?: string; name?: string; code?: string };
type TypeOrmSchemaDiff = { queries: string[]; driverSchema?: string; foreignKeys: Array<{ tablePath: string; name: string; referencedTablePath: string; onDelete: string | undefined; onUpdate: string | undefined }>; databaseTableForeignKeys: Array<Record<string, unknown>>; foreignKeyComparisons: Array<Record<string, unknown>> };
type CodeCase = { id: string; table: 'roles' | 'permissions'; value: string; name?: string; expected?: string; error?: string; seed?: boolean };

async function inTransaction(q: QueryRunner, work: () => Promise<void>) {
  await q.startTransaction();
  try { await work(); await q.commitTransaction(); }
  catch (error) { if (q.isTransactionActive) await q.rollbackTransaction(); throw error; }
}
const migrateUp = (q: QueryRunner) => inTransaction(q, () => new AddRbacCanonicalization1793874600000().up(q));
const migrateDown = (q: QueryRunner) => inTransaction(q, () => new AddRbacCanonicalization1793874600000().down(q));

async function withSchema(work: (q: QueryRunner, schema: string) => Promise<void>, migrated = true) {
  const q = AppDataSource.createQueryRunner();
  await q.connect();
  const schema = 'rbac_' + randomUUID().replaceAll('-', '');
  try {
    await q.query('CREATE SCHEMA "' + schema + '"');
    await q.query('SET search_path TO "' + schema + '", public');
    await new CreateAccountRbacFoundation1791280000000().up(q);
    if (migrated) await migrateUp(q);
    await work(q, schema);
  } finally {
    try {
      await q.query('RESET search_path');
      await q.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    } finally { await q.release(); }
  }
}
function sqlState(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const value = error as { code?: string; driverError?: { code?: string } };
  return value.driverError?.code ?? value.code;
}
async function expectSqlState(work: () => Promise<unknown>, expected: string) {
  let error: unknown;
  try { await work(); } catch (caught) { error = caught; }
  expect(error).toBeDefined();
  expect(sqlState(error)).toBe(expected);
}
async function schemaObjects(q: QueryRunner, schema: string) {
  const constraints = await q.query(
    'SELECT conname AS name FROM pg_constraint WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = $1)',
    [schema],
  ) as Array<{ name: string }>;
  const indexes = await q.query(
    'SELECT indexname AS name FROM pg_indexes WHERE schemaname = $1',
    [schema],
  ) as Array<{ name: string }>;
  return { constraints: constraints.map(row => row.name), indexes: indexes.map(row => row.name) };
}

async function getTypeOrmSchemaDiff(schema: string): Promise<TypeOrmSchemaDiff> {
  const options = AppDataSource.options;
  if (options.type !== 'postgres') {
    throw new Error('RBAC schema-diff verification requires PostgreSQL');
  }

  const schemaDataSource = new DataSource({
    ...options,
    schema,
    entities: [
      AccountEntity,
      AccountRoleEntity,
      PermissionEntity,
      RoleEntity,
      RolePermissionEntity,
    ],
    migrations: [],
    synchronize: false,
  });

  await schemaDataSource.initialize();
  try {
    type SchemaBuilderInspector = {
      log(): Promise<{ upQueries: Array<{ query: string }> }>;
      dropOldForeignKeys(): Promise<void>;
      tables: Array<{ foreignKeys: Array<{ name?: string; onDelete?: string; onUpdate?: string }> }>;
      entityToSyncMetadatas: Array<{
        foreignKeys: Array<{
          name: string;
          onDelete?: string;
          onUpdate?: string;
          referencedEntityMetadata: unknown;
        }>;
      }>;
      getTablePath(target: unknown): string;
    };
    const builder = schemaDataSource.driver.createSchemaBuilder() as unknown as SchemaBuilderInspector;
    const foreignKeyComparisons: Array<Record<string, unknown>> = [];
    const originalDropOldForeignKeys = builder.dropOldForeignKeys.bind(builder);
    builder.dropOldForeignKeys = async () => {
      for (const metadata of builder.entityToSyncMetadatas) {
        const table = builder.tables.find(
          candidate => builder.getTablePath(candidate) === builder.getTablePath(metadata),
        );
        if (!table) continue;
        for (const tableForeignKey of table.foreignKeys) {
          const metadataForeignKey = metadata.foreignKeys.find(
            candidate => candidate.name === tableForeignKey.name,
          );
          const databaseReferencedPath = builder.getTablePath(tableForeignKey);
          const metadataReferencedPath = metadataForeignKey
            ? builder.getTablePath(metadataForeignKey.referencedEntityMetadata)
            : undefined;
          foreignKeyComparisons.push({
            tablePath: builder.getTablePath(table),
            name: tableForeignKey.name,
            metadataFoundByName: Boolean(metadataForeignKey),
            databaseReferencedPath,
            metadataReferencedPath,
            referencedPathMatches: databaseReferencedPath === metadataReferencedPath,
            databaseOnDelete: tableForeignKey.onDelete,
            metadataOnDelete: metadataForeignKey?.onDelete,
            databaseOnUpdate: tableForeignKey.onUpdate,
            metadataOnUpdate: metadataForeignKey?.onUpdate,
          });
        }
      }
      await originalDropOldForeignKeys();
    };
    const diff = await builder.log();
    const foreignKeys = schemaDataSource.entityMetadatas.flatMap(metadata =>
      metadata.foreignKeys.map(foreignKey => ({
        tablePath: metadata.tablePath,
        name: foreignKey.name,
        referencedTablePath: foreignKey.referencedEntityMetadata.tablePath,
        onDelete: foreignKey.onDelete,
        onUpdate: foreignKey.onUpdate,
      })),
    );
    const queryRunner = schemaDataSource.createQueryRunner();
    await queryRunner.connect();
    let databaseTableForeignKeys: Array<Record<string, unknown>> = [];
    try {
      const tables = await queryRunner.getTables(
        schemaDataSource.entityMetadatas.map(metadata => metadata.tablePath),
      );
      databaseTableForeignKeys = tables.flatMap(table =>
        table.foreignKeys.map(foreignKey => {
          const parsed = schemaDataSource.driver.parseTableName(foreignKey);
          return {
            table: table.name,
            name: foreignKey.name,
            referencedSchema: foreignKey.referencedSchema,
            referencedTableName: foreignKey.referencedTableName,
            parsed,
            normalizedReferencedPath: schemaDataSource.driver.buildTableName(
              parsed.tableName,
              parsed.schema,
              parsed.database,
            ),
            onDelete: foreignKey.onDelete,
            onUpdate: foreignKey.onUpdate,
          };
        }),
      );
    } finally {
      await queryRunner.release();
    }
    return {
      queries: diff.upQueries.map(query => query.query),
      driverSchema: schemaDataSource.driver.schema,
      foreignKeys,
      databaseTableForeignKeys,
      foreignKeyComparisons,
    };
  } finally {
    await schemaDataSource.destroy();
  }
}
function expectCanonicalObjects(found: { constraints: string[]; indexes: string[] }) {
  for (const name of [
    'ck_roles_code_canonical',
    'ck_permissions_code_canonical',
    'uq_account_roles_account_id_role_id',
    'uq_role_permissions_role_id_permission_id',
  ]) expect(found.constraints).toContain(name);
  for (const name of ['uq_roles_code', 'uq_permissions_code', 'uq_roles_name_canonical']) {
    expect(found.indexes).toContain(name);
  }
}

beforeAll(async () => { if (!AppDataSource.isInitialized) await AppDataSource.initialize(); }, 30_000);
afterAll(async () => { if (AppDataSource.isInitialized) await AppDataSource.destroy(); }, 30_000);

describe('RBAC canonicalization migration (PostgreSQL)', () => {
  const codeCases: CodeCase[] = [
    { id: 'RBAC-01', table: 'roles', value: 'ADMIN', name: 'Administrator', expected: 'ADMIN' },
    { id: 'RBAC-02', table: 'roles', value: 'admin', name: 'Administrator', error: '23514' },
    { id: 'RBAC-03', table: 'roles', value: ' ADMIN ', name: 'Administrator', error: '23514' },
    { id: 'RBAC-04', table: 'roles', value: 'ADMIN', name: 'Another administrator', seed: true, error: '23505' },
    { id: 'RBAC-05', table: 'permissions', value: 'product:create', expected: 'product:create' },
    { id: 'RBAC-06', table: 'permissions', value: 'PRODUCT:CREATE', error: '23514' },
    { id: 'RBAC-07', table: 'permissions', value: ' product:create ', error: '23514' },
    { id: 'RBAC-08', table: 'permissions', value: 'product:create', seed: true, error: '23505' },
  ];
  it.each(codeCases)('$id enforces canonical code and SQLSTATE', async testCase => withSchema(async q => {
    const insert = () => testCase.table === 'roles'
      ? q.query('INSERT INTO roles (code, name) VALUES ($1, $2) RETURNING code', [testCase.value, testCase.name ?? 'Permission'])
      : q.query('INSERT INTO permissions (code) VALUES ($1) RETURNING code', [testCase.value]);
    if (testCase.seed) await insert();
    if (testCase.error) await expectSqlState(insert, testCase.error);
    else {
      const rows = await insert() as Row[];
      expect(rows[0]?.code).toBe(testCase.expected);
    }
  }));

  it('RBAC-09 accepts Role.name Store Manager', async () => withSchema(async q => {
    const rows = await q.query(
      "INSERT INTO roles (code, name) VALUES ('STORE_MANAGER', 'Store Manager') RETURNING name",
    ) as Row[];
    expect(rows[0]?.name).toBe('Store Manager');
  }));
  it('RBAC-10 rejects case-equivalent Role.name with UNIQUE SQLSTATE 23505', async () => withSchema(async q => {
    await q.query("INSERT INTO roles (code, name) VALUES ('STORE_MANAGER', 'Store Manager')");
    await expectSqlState(
      () => q.query("INSERT INTO roles (code, name) VALUES ('STORE_MANAGER_ALT', 'store manager')"),
      '23505',
    );
  }));
  it('RBAC-11 rejects space-padded equivalent Role.name with UNIQUE SQLSTATE 23505', async () => withSchema(async q => {
    await q.query("INSERT INTO roles (code, name) VALUES ('STORE_MANAGER', 'Store Manager')");
    await expectSqlState(
      () => q.query("INSERT INTO roles (code, name) VALUES ('STORE_MANAGER_ALT', ' Store Manager ')"),
      '23505',
    );
  }));
  it('RBAC-12 preserves original Role.name display casing', async () => withSchema(async q => {
    await q.query("INSERT INTO roles (code, name) VALUES ('STORE_MANAGER', 'Store Manager')");
    const rows = await q.query("SELECT name FROM roles WHERE code = 'STORE_MANAGER'") as Row[];
    expect(rows[0]?.name).toBe('Store Manager');
  }));
  it('RBAC-13 rejects duplicate AccountRole composite pairs', async () => withSchema(async q => {
    const accounts = await q.query(
      "INSERT INTO accounts (email, password_hash) VALUES ('rbac13@example.test', 'synthetic-hash') RETURNING id",
    ) as Row[];
    const roles = await q.query(
      "INSERT INTO roles (code, name) VALUES ('ADMIN', 'Administrator') RETURNING id",
    ) as Row[];
    const insert = () => q.query(
      'INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2)',
      [accounts[0]?.id, roles[0]?.id],
    );
    await insert();
    await expectSqlState(insert, '23505');
  }));
  it('RBAC-14 rejects duplicate RolePermission composite pairs', async () => withSchema(async q => {
    const roles = await q.query(
      "INSERT INTO roles (code, name) VALUES ('ADMIN', 'Administrator') RETURNING id",
    ) as Row[];
    const permissions = await q.query(
      "INSERT INTO permissions (code) VALUES ('product:create') RETURNING id",
    ) as Row[];
    const insert = () => q.query(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
      [roles[0]?.id, permissions[0]?.id],
    );
    await insert();
    await expectSqlState(insert, '23505');
  }));
  it('RBAC-15 applies the additive migration to a clean PostgreSQL schema', async () => withSchema(async (q, schema) => {
    expectCanonicalObjects(await schemaObjects(q, schema));
  }));
  it('RBAC-16 fails atomically and reports exact canonical conflicts', async () => withSchema(async (q, schema) => {
    await q.query(
      "INSERT INTO roles (code, name) VALUES ('ADMIN', 'Store Manager'), (' admin ', 'store manager')",
    );
    await q.query(
      "INSERT INTO permissions (code) VALUES ('product:create'), ('PRODUCT:CREATE')",
    );
    let migrationError: unknown;
    try { await migrateUp(q); } catch (error) { migrationError = error; }
    expect(migrationError).toBeInstanceOf(Error);
    const message = (migrationError as Error).message;
    for (const value of [
      'roles.code', 'ADMIN', 'roles.name', 'store manager',
      'permissions.code', 'product:create', 'No rows were changed',
    ]) expect(message).toContain(value);
    const found = await schemaObjects(q, schema);
    expect(found.constraints).not.toContain('ck_roles_code_canonical');
    expect(found.constraints).not.toContain('ck_permissions_code_canonical');
    expect(found.indexes).not.toContain('uq_roles_name_canonical');
    expect(found.indexes).toContain('uq_roles_code');
    expect(found.indexes).toContain('uq_permissions_code');
  }, false));
  it('RBAC-17 down removes only objects introduced by this migration', async () => withSchema(async (q, schema) => {
    await migrateDown(q);
    const found = await schemaObjects(q, schema);
    expect(found.constraints).not.toContain('ck_roles_code_canonical');
    expect(found.constraints).not.toContain('ck_permissions_code_canonical');
    expect(found.indexes).not.toContain('uq_roles_name_canonical');
    expect(found.indexes).toContain('uq_roles_code');
    expect(found.indexes).toContain('uq_permissions_code');
    expect(found.constraints).toContain('uq_account_roles_account_id_role_id');
    expect(found.constraints).toContain('uq_role_permissions_role_id_permission_id');
  }));
  it('RBAC-18 reapplies successfully after down()', async () => withSchema(async (q, schema) => {
    await migrateDown(q);
    await migrateUp(q);
    expectCanonicalObjects(await schemaObjects(q, schema));
  }));
  it('RBAC-19 verifies TypeORM metadata and a non-destructive schema diff', async () => withSchema(async (q, schema) => {
    const metadata = getMetadataArgsStorage();
    expect(metadata.checks.some(x => x.target === RoleEntity && x.name === 'ck_roles_code_canonical')).toBe(true);
    expect(metadata.checks.some(x => x.target === PermissionEntity && x.name === 'ck_permissions_code_canonical')).toBe(true);
    expect(metadata.indices.some(x => x.target === RoleEntity && x.name === 'uq_roles_code')).toBe(true);
    expect(metadata.indices.some(x => x.target === PermissionEntity && x.name === 'uq_permissions_code')).toBe(true);
    expect(metadata.uniques.some(x => x.target === AccountRoleEntity && x.name === 'uq_account_roles_account_id_role_id')).toBe(true);
    expect(metadata.uniques.some(x => x.target === RolePermissionEntity && x.name === 'uq_role_permissions_role_id_permission_id')).toBe(true);

    const roleNameIndexMetadata = metadata.indices.find(
      x => x.target === RoleEntity && x.name === 'uq_roles_name_canonical',
    );
    expect(roleNameIndexMetadata).toBeDefined();
    expect(roleNameIndexMetadata?.synchronize).toBe(false);
    expect(AppDataSource.options.synchronize).toBe(false);

    const index = await q.query(
      `SELECT
         pg_get_indexdef(index_data.indexrelid) AS indexdef,
         pg_get_expr(index_data.indexprs, index_data.indrelid) AS expression
       FROM pg_index AS index_data
       JOIN pg_class AS index_class ON index_class.oid = index_data.indexrelid
       JOIN pg_namespace AS index_schema ON index_schema.oid = index_class.relnamespace
       WHERE index_schema.nspname = $1
         AND index_class.relname = 'uq_roles_name_canonical'`,
      [schema],
    ) as Array<{ indexdef: string; expression: string }>;
    expect(index).toHaveLength(1);
    expect(index[0]?.indexdef).toMatch(/^CREATE UNIQUE INDEX/i);
    expect(index[0]?.expression).toContain('lower(btrim(');
    expect(index[0]?.expression).toContain('name');

    const schemaDiff = await getTypeOrmSchemaDiff(schema);
    const schemaDiffQueries = schemaDiff.queries;
    const databaseForeignKeys = await q.query(
      `SELECT conname AS name, conrelid::regclass::text AS table_path,
              confrelid::regclass::text AS referenced_table_path,
              pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE contype = 'f'
         AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = $1)
       ORDER BY conname`,
      [schema],
    );
    const destructiveQueries = schemaDiffQueries.filter(
      query => /\bDROP\s+(?:INDEX|CONSTRAINT)\b/i.test(query),
    );
    expect(destructiveQueries, JSON.stringify({ destructiveQueries, driverSchema: schemaDiff.driverSchema, metadataForeignKeys: schemaDiff.foreignKeys, databaseTableForeignKeys: schemaDiff.databaseTableForeignKeys, foreignKeyComparisons: schemaDiff.foreignKeyComparisons, databaseForeignKeys }, null, 2)).toEqual([]);
    expect(
      schemaDiffQueries.some(
        query => /CREATE\s+UNIQUE\s+INDEX[\s\S]*uq_roles_name_canonical/i.test(query),
      ),
    ).toBe(false);

    expectCanonicalObjects(await schemaObjects(q, schema));
  }));
  it('RBAC-20 preserves AccountRole and RolePermission grants across migration', async () => withSchema(async q => {
    const accounts = await q.query(
      "INSERT INTO accounts (email, password_hash) VALUES ('rbac20@example.test', 'synthetic-hash') RETURNING id",
    ) as Row[];
    const roles = await q.query(
      "INSERT INTO roles (code, name) VALUES ('ADMIN', 'Administrator') RETURNING id",
    ) as Row[];
    const permissions = await q.query(
      "INSERT INTO permissions (code) VALUES ('product:create') RETURNING id",
    ) as Row[];
    await q.query(
      'INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2)',
      [accounts[0]?.id, roles[0]?.id],
    );
    await q.query(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
      [roles[0]?.id, permissions[0]?.id],
    );
    const accountRolesBefore = await q.query(
      'SELECT account_id, role_id FROM account_roles ORDER BY account_id, role_id',
    );
    const rolePermissionsBefore = await q.query(
      'SELECT role_id, permission_id FROM role_permissions ORDER BY role_id, permission_id',
    );
    await migrateUp(q);
    expect(await q.query(
      'SELECT account_id, role_id FROM account_roles ORDER BY account_id, role_id',
    )).toEqual(accountRolesBefore);
    expect(await q.query(
      'SELECT role_id, permission_id FROM role_permissions ORDER BY role_id, permission_id',
    )).toEqual(rolePermissionsBefore);
  }, false));
});

# RBAC canonicalization migration

FO-003A Task 02 adds database-enforced canonicalization without changing existing identity rows or grant relationships.

## Migration

- File: `src/database/migrations/1793874600000-AddRbacCanonicalization.ts`
- Migration name: `AddRbacCanonicalization1793874600000`
- New objects:
  - `ck_roles_code_canonical`: `roles.code = upper(btrim(roles.code))`
  - `ck_permissions_code_canonical`: `permissions.code = lower(btrim(permissions.code))`
  - `uq_roles_name_canonical`: unique expression index on `lower(btrim(roles.name))`

The migration does not update, rename, merge, or delete any existing row. It acquires SHARE locks on `roles` and `permissions`, then runs a read-only preflight and aborts with row counts and exact conflicting canonical groups if it finds noncanonical values or canonical collisions. The locks prevent concurrent writes from invalidating the audit while the DDL is applied. The migration declares `transaction = true`; PostgreSQL DDL and the preflight therefore run in the migration transaction.

`btrim(value)` without an explicit character set trims ordinary leading/trailing spaces. It does not normalize tabs, newlines, or every Unicode whitespace character.

## Preserved foundation objects

The migration leaves the original foundation migration unchanged and preserves these existing objects:

- `uq_roles_code`
- `uq_permissions_code`
- `uq_account_roles_account_id_role_id`
- `uq_role_permissions_role_id_permission_id`

The `down()` method removes only the two new CHECK constraints and the new Role.name expression index.

## TypeORM metadata and synchronization

The canonical CHECK constraints are represented by `@Check` metadata on `RoleEntity` and `PermissionEntity`. Existing exact-value unique indexes and composite relationship constraints remain represented by their existing decorators.

TypeORM's column-based `@Index` metadata cannot accurately express the PostgreSQL expression index `lower(btrim(name))`. That index is therefore migration-owned and documented here rather than approximated with an ordinary index on `name`. Both the CLI DataSource and Nest TypeORM configuration keep `synchronize: false`; schema synchronization is not used as a workaround.

## Read-only data preflight

Run `docs/migration/rbac-canonicalization-preflight.sql` against the representative database before applying the migration. It returns:

1. Count and row details for noncanonical Role.code values.
2. Count and row details for noncanonical Permission.code values.
3. Exact Role.name collision groups under `lower(btrim(name))`.
4. Exact Role.code collision groups under `upper(btrim(code))`.
5. Exact Permission.code collision groups under `lower(btrim(code))`.

If any result contains affected rows/groups, stop and obtain an explicitly reviewed identity-resolution plan before rerunning the migration.

### Execution status

**NOT EXECUTED** in the implementation environment: no representative PostgreSQL database connection was available. No production or existing RBAC data was read or modified. The SQL above is provided for the Tech Lead to execute against the intended representative database; no audit pass is claimed.

## Integration coverage

`test/integration/rbac-canonicalization.integration-spec.ts` covers RBAC-01 through RBAC-20 using isolated PostgreSQL schemas, including SQLSTATE assertions, migration rollback/reapplication, metadata alignment, and grant relationship preservation. These tests require the PostgreSQL service configured by the repository's integration-test environment.

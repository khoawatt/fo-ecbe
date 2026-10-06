# Implementation Prompt — Issue #7 Account + Normalized RBAC Persistence Foundation

## Context

Implement the persistence foundation for FO-003 Auth + Account + RBAC/session vertical slice.

Platform prerequisite:
- NestJS 12
- Node.js 24
- Native ESM
- TypeORM 1.1
- PostgreSQL 18

The platform migration (#14) is completed. This task must be implemented on the modernized stack.

---

## Objective

Build a clean persistence/application boundary for Account and normalized RBAC before adding authentication flows or authorization guards.

The result must provide:

- Account persistence
- Role/Permission persistence
- Repository abstraction
- Database constraints
- Integration coverage

---

## Scope

### Account module

Create structure under:

```
src/modules/account
```

Implement:

- Account entity
- migration
- repository interface
- TypeORM repository implementation
- dependency injection using Symbol tokens

Required capabilities:

- create account
- find by email/login identity
- update account
- soft delete account
- active/inactive lifecycle

Constraints:

- password hash must never appear in public results
- no hard delete as default lifecycle
- account status is independent from role membership

---

## RBAC persistence

Create entities:

- Role
- Permission
- AccountRole
- RolePermission

Relationships:

```
Account 1 --- N AccountRole
Role    1 --- N AccountRole

Role       1 --- N RolePermission
Permission 1 --- N RolePermission
```

Constraints:

- UNIQUE(account_id, role_id)
- UNIQUE(role_id, permission_id)
- unique Role code
- unique Permission code

Initial roles:

```
CUSTOMER
SELLER
ADMIN
```

Permission codes must be machine-readable:

Examples:

```
product:create
product:update
order:create
order:read
order:read_own
```

Do not encode resource ownership into global RBAC.

---

## Architecture Requirements

Repository/service boundaries must follow these rules:

- no TypeORM entities leaking through repository interfaces
- no magic string DI tokens
- no business logic inside entities
- no feature logic added to shared base abstractions

Do not implement:

- Auth controller
- JWT
- Guards
- CustomerProfile
- SellerProfile
- Store
- Product

Those belong to later slices.

---

## Database Migration Requirements

Create migration using TypeORM migration tooling.

Verify:

- clean database migration works
- rollback works
- constraints are enforced by PostgreSQL

Keep:

```
synchronize: false
```

---

## Testing Requirements

Add integration tests covering:

- create account
- duplicate email rejection
- soft delete behavior
- multiple roles per account
- multiple permissions per role
- duplicate AccountRole rejection
- duplicate RolePermission rejection
- unique role code enforcement
- unique permission code enforcement
- password hash is not exposed

Tests must run through CI.

---

## Validation Checklist

Before PR:

- npm ci
- lint
- typecheck
- migration test
- integration tests
- build

---

## Git Workflow

Branch:

```
feature/fo-003a-account-rbac-foundation
```

Before implementation:

1. Update main
2. Rebase branch onto latest main
3. Resolve only platform compatibility conflicts
4. Verify CI baseline

Suggested commit:

```
feat(account): add account and normalized RBAC persistence
```

---

## PR Requirements

PR must contain:

- summary
- database changes
- architecture decisions
- migration evidence
- test evidence
- known limitations

No Auth flow should be included in this PR.

# RFC-001 — FO-ECBE Source Architecture

- **Status:** Accepted
- **Version:** 1.0
- **Scope:** FO-002 foundation and all subsequent backend migration slices
- **Depends on:** FO-001, ADR-001
- **Target repository:** `khoawatt/fo-ecbe`

## 1. Purpose

This RFC defines the source-code architecture, dependency direction, folder ownership, cross-cutting conventions, testing layout, and migration rules for FO-ECBE.

The goal is not to implement strict Clean Architecture or maximize abstraction.

The goal is to create a NestJS structure that is:

- understandable by a small backend team;
- explicit about dependency direction;
- testable at unit, integration, and E2E levels;
- safe for incremental migration;
- independent of TypeORM above the persistence boundary;
- structured enough to support Senior/Team Lead engineering practice without unnecessary indirection.

The architecture must preserve required business capability, not accidental legacy implementation.

---

## 2. Architectural principles

### 2.1 Feature-first organization

Business code is organized primarily by feature:

```text
account
auth
dish
media
order
...
```

A feature should own its controller, service, DTOs, contracts, persistence implementation, and feature-specific tests where practical.

Do not organize the entire application globally by technical type:

```text
controllers/
services/
repositories/
dtos/
```

because this scatters one feature across the repository.

### 2.2 Dependency direction

Upper layers may depend on contracts owned by the application, but must not depend directly on persistence technology.

```text
HTTP / Controller
        ↓
Application / Service
        ↓
Repository Contract
        ↓
Persistence Implementation
        ↓
TypeORM
        ↓
PostgreSQL
```

Allowed TypeORM dependency:

```text
BaseRepositoryAbstract     ✅
Concrete Repository       ✅
Entity / migration        ✅
TypeORM config             ✅
```

Forbidden TypeORM dependency:

```text
Controller                 ❌
Feature Service            ❌
Base Service               ❌
Repository Interface       ❌
Application contracts      ❌
```

This rule is inherited from ADR-001.

### 2.3 Explicit over magical

Prefer:

- explicit module imports;
- explicit Symbol DI tokens;
- explicit DTOs/contracts;
- explicit error mapping;
- explicit test boundaries.

Avoid:

- magic-string repository tokens;
- implicit global mutable state;
- hidden ORM types leaking through public contracts;
- generic base classes that absorb unrelated business behavior.

### 2.4 Incremental migration

FO-ECBE is migrated by protected vertical slices.

```text
Foundation
→ Auth + Account
→ Dish + persistence model
→ later slices
```

No big-bang folder migration.

---

## 3. Target source tree

Target structure:

```text
src/
├── main.ts
├── app.module.ts
│
├── config/
│   ├── config.module.ts
│   ├── env.schema.ts
│   ├── app.config.ts
│   ├── database.config.ts
│   └── index.ts
│
├── common/
│   ├── contracts/
│   │   ├── page-query.ts
│   │   ├── page-result.ts
│   │   └── api-response.ts
│   │
│   ├── decorators/
│   ├── exceptions/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   ├── types/
│   └── utils/
│
├── database/
│   ├── typeorm/
│   │   ├── typeorm.module.ts
│   │   ├── typeorm.config.ts
│   │   └── data-source.ts
│   │
│   ├── migrations/
│   └── testing/
│
├── core/
│   ├── repository/
│   │   ├── base-repository.interface.ts
│   │   └── base-repository.abstract.ts
│   │
│   └── service/
│       ├── read-service.interface.ts
│       ├── write-service.interface.ts
│       ├── base-service.interface.ts
│       └── base-service.abstract.ts
│
└── modules/
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── dto/
    │   ├── guards/
    │   ├── strategies/
    │   ├── decorators/
    │   └── types/
    │
    ├── account/
    │   ├── account.module.ts
    │   ├── account.controller.ts
    │   ├── account.service.ts
    │   ├── dto/
    │   ├── contracts/
    │   │   ├── account-repository.interface.ts
    │   │   ├── create-account.data.ts
    │   │   └── update-account.data.ts
    │   ├── persistence/
    │   │   ├── account.entity.ts
    │   │   └── account.repository.ts
    │   ├── account.tokens.ts
    │   └── types/
    │
    ├── dish/
    │   └── ...
    │
    └── media/
        └── ...
```

Test structure:

```text
test/
├── e2e/
├── integration/
├── contract/
├── fixtures/
└── helpers/
```

Unit tests may live beside source files:

```text
account.service.ts
account.service.spec.ts
```

or under a feature-local `__tests__` folder if that becomes more readable.

Do not introduce multiple competing test-placement conventions.

---

## 4. Folder responsibilities

### 4.1 `config/`

Owns application configuration contracts.

Responsibilities:

- environment schema;
- typed configuration factories;
- configuration validation;
- mapping raw environment variables into application config.

Rules:

- runtime variables consumed by the application must be validated;
- `.env.example` must use the same names;
- no MongoDB legacy variables;
- secrets are never committed.

Target relationship:

```text
process.env
    ↓
validation schema
    ↓
typed config
    ↓
consumers
```

### 4.2 `common/`

Contains cross-cutting framework/application utilities that are not owned by one business feature.

Examples:

- API response contract;
- pagination primitives;
- global exception filter;
- common decorators;
- request types;
- correlation/request ID utilities.

A file belongs in `common/` only if multiple features genuinely use it.

Do not use `common/` as a dumping ground.

### 4.3 `database/`

Owns persistence infrastructure shared across features.

Examples:

- TypeORM bootstrap/config;
- DataSource;
- migrations;
- database testing helpers.

Feature entities and feature repositories remain inside their feature persistence folder unless a later requirement justifies a shared aggregate.

### 4.4 `core/`

Contains intentionally generic application abstractions approved by ADR-001.

Only generic repository/service contracts belong here.

Business-specific logic must not be placed here.

### 4.5 `modules/<feature>/`

Owns feature behavior end-to-end.

A feature may contain:

```text
controller
service
DTOs
application contracts
repository contract
persistence implementation
feature tokens
feature-specific guards/types
```

The feature module is the public NestJS composition boundary for that feature.

---

## 5. Repository architecture

ADR-001 remains authoritative.

Target relationship:

```text
AccountService
      ↓
AccountRepositoryInterface
      ↑
AccountRepository
      ↓
BaseRepositoryAbstract
      ↓
TypeORM Repository<AccountEntity>
```

### 5.1 Generic repository contract

Use application-owned types.

Example:

```ts
export interface BaseRepositoryInterface<
  TEntity,
  TCreate,
  TUpdate
> {
  findById(id: string): Promise<TEntity | null>;

  findAll(query: PageQuery): Promise<PageResult<TEntity>>;

  create(data: TCreate): Promise<TEntity>;

  update(
    id: string,
    data: TUpdate
  ): Promise<TEntity | null>;

  softDelete(id: string): Promise<boolean>;
}
```

Hard delete must not be exposed as a default generic operation unless a concrete use case proves it is needed.

If physical deletion is necessary, expose it deliberately at the appropriate persistence/application boundary rather than making it the default lifecycle API.

### 5.2 Forbidden repository contract types

Do not expose:

```text
FindManyOptions
FindOneOptions
DeepPartial
Repository<T>
QueryBuilder
EntityManager
```

through application/service contracts.

### 5.3 Feature repository contracts

Feature contracts express application needs.

Example:

```ts
export interface AccountRepositoryInterface
  extends BaseRepositoryInterface<
    AccountEntity,
    CreateAccountData,
    UpdateAccountData
  > {
  findByEmail(email: string): Promise<AccountEntity | null>;
  existsByEmail(email: string): Promise<boolean>;
}
```

Do not create generic methods solely to mirror every ORM capability.

---

## 6. Service architecture

### 6.1 Base service

Generic service behavior may include:

```text
findById
findAll
create
update
remove
```

It must depend on repository contracts, not TypeORM.

### 6.2 Feature service

Feature services own business/application behavior.

Examples for Account:

```text
register
changePassword
assignRole
lockAccount
activateAccount
```

Examples for Auth:

```text
authenticateCredentials
issueTokens
refreshSession
logout
```

Do not push these behaviors into `BaseServiceAbstract`.

### 6.3 Controller responsibility

Controllers should:

- parse HTTP inputs;
- invoke guards/decorators;
- call application services;
- return application results.

Controllers should not:

- construct TypeORM queries;
- hash passwords;
- implement authorization rules manually when a guard/policy owns them;
- contain persistence logic.

---

## 7. Dependency injection

Use Symbol tokens.

Example:

```ts
export const ACCOUNT_REPOSITORY =
  Symbol('ACCOUNT_REPOSITORY');
```

Provider:

```ts
{
  provide: ACCOUNT_REPOSITORY,
  useClass: AccountRepository
}
```

Consumer:

```ts
constructor(
  @Inject(ACCOUNT_REPOSITORY)
  private readonly accountRepository:
    AccountRepositoryInterface
) {}
```

Do not use:

```ts
@Inject('AccountRepositoryInterface')
```

for new code.

Reason: interfaces do not exist at runtime and string tokens are easier to collide/mistype.

---

## 8. DTOs and internal contracts

HTTP DTOs and internal application data types are not assumed to be the same object.

Example:

```text
CreateAccountRequestDto
        ↓
AccountService
        ↓ maps to
CreateAccountData
        ↓
AccountRepositoryInterface
```

Benefits:

- HTTP decorators/validation do not leak into persistence contracts;
- persistence changes do not dictate API DTO shape;
- migration can preserve external contracts while refactoring internals.

Do not create mappings mechanically when the objects are genuinely identical and no boundary value exists.

Use judgment; avoid mapping layers that provide no value.

---

## 9. API response contract

FO-ECBE must expose deterministic response shapes.

Collection responses must remain flat:

```json
{
  "data": [
    {},
    {}
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

Never produce:

```text
T[][]
```

because a transformation wrapped an existing collection.

The exact response envelope may evolve through an explicit API decision, but once selected it must be:

- documented;
- covered by contract tests;
- consistent across migrated endpoints.

Do not preserve known legacy response bugs merely for accidental parity.

---

## 10. Exception and error architecture

### 10.1 Known client/application failures

Known failures must map deterministically to HTTP semantics.

Examples:

```text
resource missing       → 404
invalid credentials    → 401
authenticated but denied → 403
invalid request        → 400
conflict               → 409
```

A feature service may use Nest HTTP exceptions initially where this keeps the design simple.

If domain/application exceptions are introduced later, they must be mapped centrally.

### 10.2 Unknown failures

Unknown errors must become:

```text
HTTP 500
safe public message
internal diagnostic logging
request/correlation context where available
```

Do not leak stack traces or infrastructure secrets to clients.

### 10.3 Forbidden pattern

Do not use plain:

```ts
throw new Error('Account not found')
```

for expected application conditions.

---

## 11. Authentication and authorization placement

### Authentication

Owned primarily by the Auth feature:

```text
LocalAuthGuard
Passport strategies
JWT access/refresh verification
token issuance
refresh-token persistence behavior
```

### Authorization

Reusable authorization primitives may live in Auth/common depending on ownership.

Target account policy:

```text
/account/me
/account/change-password
→ authenticated account

/account
/account/detail/:id
→ ADMIN only
```

Identity comes from authenticated request state:

```text
request.user
```

Do not treat `@ApiBearerAuth` as runtime protection.

Role representation must be canonical across:

```text
application enum/type
database
JWT payload
request.user
RolesGuard
```

---

## 12. Account lifecycle

Default lifecycle:

```text
active
→ inactive / disabled
→ soft deleted
```

Physical deletion is not the default Account behavior.

Reason:

- auditability;
- historical references;
- order ownership;
- recovery;
- security investigation.

Hard delete requires an explicit use case and referential-safety review.

---

## 13. Database and migration rules

### 13.1 Schema is changed through migrations

`synchronize: false` remains the target production posture.

Schema evolution must be represented by migration files.

### 13.2 Migration verification

A schema migration is not complete until verified against:

```text
clean database
+
representative existing schema
```

and a recovery approach exists.

### 13.3 Historical data

Soft delete is not history/versioning.

For pricing/order history, preserve immutable historical values explicitly.

Target modeling direction for later Dish/Order work:

```text
Order
  1 → N
OrderItem
  → immutable historical dish/price data
```

Exact ownership/cardinality is finalized in FO-004, not in FO-002.

---

## 14. Configuration contract

FO-002 must establish one configuration vocabulary.

Initial database variables should use one naming scheme, for example:

```text
DB_HOST
DB_PORT
DB_USERNAME
DB_PASSWORD
DB_NAME
```

Only add a `DB_URI` variable if runtime code actually consumes it.

Configuration rules:

1. every required runtime variable is validated;
2. every required variable appears in `.env.example`;
3. obsolete variables are removed;
4. invalid config fails fast at startup;
5. feature code reads typed application config rather than spreading raw environment access across the codebase.

---

## 15. Dependency policy

Initial direction:

```text
KEEP
NestJS
TypeORM
PostgreSQL / pg
cross-env

STANDARDIZE
bcrypt implementation

DROP / DO NOT INTRODUCE
mongoose
@nestjs/mongoose
crossenv
unused postgres client package
```

Do not perform a mass package upgrade in the same change as foundation migration.

Compatibility review and upgrade work must be isolated so failures can be attributed and rolled back.

---

## 16. Testing architecture

### Unit

Use for isolated logic and branching.

Examples:

- token payload construction;
- password policy logic;
- service decision branches.

Mocks are appropriate for dependencies not under test.

### Integration

Use real PostgreSQL when persistence semantics are under test.

Examples:

- repository mappings;
- unique constraints;
- soft delete;
- migrations;
- transaction behavior.

Do not mock the database in a test whose purpose is to verify database behavior.

### E2E

Use for critical HTTP journeys.

Initial critical E2E targets:

```text
login
refresh token
RBAC
account self-service
admin account mutation
```

### Contract

Protect:

```text
HTTP status
response shape
pagination
error envelope
```

### Coverage

Coverage is a supporting signal, not the primary release target.

Prioritize critical behavior/risk coverage.

---

## 17. CI architecture

FO-002 minimum quality pipeline:

```text
install
  ↓
lint
  ↓
test
  ↓
build / typecheck
  ↓
integration / migration verification as configured
  ↓
artifact/deploy eligibility
```

A deployment workflow must not be treated as a quality gate if it can run without required checks succeeding.

Target merge policy:

```text
PR
→ required checks
→ review
→ merge
```

Repository branch-rule enforcement depends on repository administration capability and is operational configuration, not application source architecture.

---

## 18. Module dependency rules

Default rules:

```text
Auth may depend on Account contracts/services where identity resolution requires it.

Account must not depend on Auth implementation details for persistence.

Feature A must not import Feature B persistence implementation directly.

Shared generic contracts belong in common/core only when at least two features genuinely need them.

No circular Nest module dependencies should be introduced to solve convenience problems.
```

If a circular dependency appears, first review ownership and contract placement before using `forwardRef()`.

`forwardRef()` is not the default architectural solution.

---

## 19. Import and naming conventions

Preferred examples:

```text
account.controller.ts
account.service.ts
account.module.ts
account.repository.ts
account-repository.interface.ts
account.tokens.ts
create-account-request.dto.ts
create-account.data.ts
account.entity.ts
```

Use one casing convention consistently.

Barrel files (`index.ts`) may be used at stable package boundaries, but avoid broad barrels that create circular imports or hide dependency direction.

Prefer path aliases only when configured consistently for build, test, and runtime tooling.

---

## 20. Migration rules for legacy code

For every migrated behavior:

1. identify capability;
2. inspect current behavior;
3. identify verified bugs/security gaps;
4. decide target contract;
5. add characterization or target tests;
6. migrate the smallest useful slice;
7. verify contracts and persistence;
8. only then retire corresponding legacy behavior.

Never copy a legacy file merely because the target folder has the same name.

Migration categories remain:

```text
KEEP
MIGRATE
REFACTOR
REWRITE
DROP
```

---

## 21. FO-002 implementation boundary

FO-002 may implement:

- NestJS bootstrap;
- folder/source skeleton;
- configuration contract;
- PostgreSQL/TypeORM foundation;
- base repository/service contracts from ADR-001;
- test harness;
- CI quality gates;
- migration execution/verification path;
- developer bootstrap documentation.

FO-002 must not implement:

- Auth/Account business migration;
- corrected RBAC behavior;
- Dish business migration;
- Order redesign;
- Media redesign;
- unrelated platform upgrades.

This keeps FO-002 independently reviewable.

---

## 22. Non-goals

This RFC does not introduce:

- microservices;
- event sourcing;
- CQRS by default;
- strict hexagonal architecture;
- a second persistence adapter abstraction;
- runtime ORM switching;
- generic domain framework;
- API-wide versioning redesign;
- full DDD aggregate modeling across the codebase.

These may be revisited only when a concrete requirement justifies their complexity.

---

## 23. Architectural review checklist

A PR should be challenged if any answer below is "yes" without explicit justification:

```text
Does a controller import TypeORM?
Does a service import TypeORM?
Does a repository interface expose ORM types?
Is a magic-string DI token introduced?
Is generic base code receiving feature-specific business logic?
Is a feature importing another feature's persistence class directly?
Is plain Error used for an expected HTTP/application condition?
Is hard delete being introduced as a default lifecycle operation?
Is config consumed without validation/documentation?
Is database behavior being tested only with mocks?
Is a broad dependency/framework upgrade mixed into a migration slice?
```

---

## 24. Decision

RFC-001 is accepted as the source-architecture baseline for FO-002 and subsequent migration work.

If implementation reveals a conflicting requirement, update this RFC or supersede it explicitly.

Do not silently diverge from the architecture.

Implementation order remains:

```text
FO-002
→ FO-003
→ FO-004
```

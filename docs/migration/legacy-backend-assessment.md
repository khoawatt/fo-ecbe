# Legacy Backend Assessment — FO-001

## 1. Baseline

Legacy source:

```text
repository: khoawatt/bookingnow-sv
branch: main
commit: 167e02833ba2c406022afdc8f1c0681c3f40cbca
```

Target:

```text
repository: khoawatt/fo-ecbe
```

This assessment is based on the pinned legacy commit above plus the accepted FO-ECBE onboarding audit artifacts and ADR-001.

The assessment separates required capability from legacy implementation quality. A capability may be retained while its implementation is refactored or rewritten.

---

## 2. Executive summary

The legacy backend contains reusable product behavior and a workable NestJS/PostgreSQL/TypeORM foundation, but it should not be copied into FO-ECBE as-is.

The main migration direction is:

```text
KEEP
→ PostgreSQL
→ TypeORM as the initial persistence technology
→ NestJS modular backend model
→ core auth/account/dish capabilities

REFACTOR
→ repository/service abstraction
→ JWT/Auth flow details
→ role representation
→ API response shaping
→ error handling
→ dependency set
→ delete lifecycle

REWRITE
→ environment/config contract
→ account-management authorization wiring
→ tests/CI safety baseline

DROP
→ MongoDB/Mongoose remnants
→ crossenv package
→ unused/obsolete dependency remnants
→ trivial Hello World E2E as the primary safety signal
```

The highest-risk findings are authorization failures in Account management. The next priority is establishing a safe implementation foundation before copying business code.

---

## 3. Current system map

Runtime stack:

```text
NestJS
  ↓
Controllers
  ↓
Feature Services
  ↓
Generic Base Service
  ↓
Repository Interfaces
  ↓
Concrete / Base Repositories
  ↓
TypeORM
  ↓
PostgreSQL
```

Main application modules:

```text
ConfigModule
AccountModule
AuthModule
MediaModule
DishModule
```

Request lifecycle:

```text
HTTP Request
   ↓
Middleware
   ↓
Guards
   ↓
Interceptor (before)
   ↓
Pipes
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
TypeORM / PostgreSQL
   ↓
Interceptor (after)
   ↓
HTTP Response

Unhandled exception
   ↓
GlobalExceptionFilter
```

Auth lifecycle:

```text
LocalAuthGuard
→ LocalStrategy
→ AuthService credential verification
→ Passport request.user
→ controller/login use case
→ access token + refresh token

Bearer JWT
→ JwtAccessTokenGuard
→ passport-jwt signature/expiry verification
→ JwtAccessTokenStrategy.validate()
→ request.user
→ optional RolesGuard
```

---

## 4. Migration inventory

| Area / capability | Current location | Capability needed? | Classification | Migration risk / note |
|---|---|---:|---|---|
| NestJS bootstrap / modules | `src/main.ts`, `src/app.module.ts` | Yes | MIGRATE / REFACTOR | Preserve modular behavior, rebuild target bootstrap cleanly |
| PostgreSQL | TypeORM config / migrations | Yes | KEEP | Initial target database |
| TypeORM | config / repositories | Yes for current phase | KEEP | Must remain below repository boundary |
| Generic repository contracts | base repository files | Yes | REFACTOR | Remove TypeORM types from public interfaces |
| Generic service abstraction | base service files | Yes by project decision | REFACTOR | Keep generic behavior, no ORM imports |
| Feature repositories | Account/Dish repository layer | Yes | REFACTOR | Use feature-owned contracts and Symbol DI tokens |
| Authentication | Auth module | Yes | MIGRATE / REFACTOR | Preserve behavior; remove duplicate lookup / normalize hashing |
| Refresh-token state | AuthService + Account | Yes | MIGRATE / REFACTOR | Preserve hashed server-side refresh-token verification |
| RBAC | RolesGuard / decorators | Yes | REWRITE policy/wiring | Current Account authorization is unsafe |
| Account self-service | Account module | Yes | MIGRATE / REFACTOR | Use authenticated subject ID |
| Account administration | Account controller | Yes | REWRITE | ADMIN-only target policy |
| Dish capability | Dish module | Yes | MIGRATE / REFACTOR | Fix auth, contract, lifecycle |
| Order / DishSnapshot model | entities / migrations | Yes later | REVIEW / REFACTOR | Current one-to-one constraint may not reflect domain |
| Media upload | Media module | Yes if product still requires it | REFACTOR / DEFER | Local filesystem implementation and swallowed errors should not be copied blindly |
| Response envelope / pagination | interceptor + services | Yes | REFACTOR | Nested-array bug and contract risk |
| Global exception handling | global filter | Yes | REFACTOR | Plain Error does not map to deterministic contract |
| Environment config | ConfigModule + `.env.example` | Yes | REWRITE | Mongo/Postgres and variable-name drift |
| Mongoose / Mongo remnants | dependencies / shared base code | No | DROP | Stale legacy dependency surface |
| Password hashing libraries | bcrypt + bcryptjs | Yes, one implementation | REFACTOR | Standardize one library/config |
| Legacy E2E baseline | `test/app.e2e-spec.ts` | No as meaningful baseline | DROP / REPLACE | Hello World does not protect critical behavior |
| CI build/deploy concept | `.gitlab-ci.yml` | Yes | MIGRATE concept / REWRITE pipeline | Add executable quality gates |

---

## 5. Findings by severity

### P0-1 — Anonymous Account creation path

**Evidence**

`POST /account` has no runtime authentication/authorization guard and calls the employee/account creation flow.

**Impact**

An unauthenticated caller can reach an administrative account-provisioning path.

**Failure scenario**

```text
anonymous request
→ POST /account
→ account creation service
→ new account persisted
```

**Migration implication**

Do not migrate the controller wiring as-is.

**Recommended direction**

Account administration becomes ADMIN-only. Add E2E tests proving anonymous and non-admin callers are rejected.

---

### P0-2 — Authenticated user can modify another account

**Evidence**

`PUT /account/detail/:id` is protected by `JwtAccessTokenGuard` only; the target account is the arbitrary route `:id`.

**Impact**

Authentication proves identity but does not establish permission to mutate another account.

**Failure scenario**

```text
authenticated non-admin
→ chooses another account ID
→ PUT /account/detail/:id
→ service updates target account
```

**Migration implication**

Do not copy authentication-only protection.

**Recommended direction**

ADMIN-only account-management policy plus RBAC E2E coverage.

---

### P0-3 — Authenticated user can permanently delete another account

**Evidence**

`DELETE /account/detail/:id` uses `JwtAccessTokenGuard` only and the service calls permanent deletion.

**Impact**

Cross-account destructive mutation and potential irreversible data loss.

**Failure scenario**

```text
authenticated non-admin
→ DELETE another account ID
→ permanentDelete()
```

**Migration implication**

Legacy behavior is not acceptable as a target contract.

**Recommended direction**

ADMIN-only authorization and soft-delete/inactive lifecycle by default.

---

### P1-1 — Account data exposure / enumeration

**Evidence**

`GET /account` has no runtime guard. `GET /account/detail/:id` only requires a valid JWT.

**Impact**

Anonymous or unrelated authenticated users can read account data beyond intended scope.

**Migration implication**

Account list/detail administration must not be migrated with current protection.

**Recommended direction**

ADMIN-only account-management reads; self-service remains bound to `request.user.id`.

---

### P1-2 — Role representation mismatch

**Evidence**

Application enum contains:

```text
EMPLOYEE
```

while Account persistence defaults to:

```text
Employee
```

`RolesGuard` performs direct membership comparison.

**Impact**

Authorization can fail unpredictably depending on how the role value entered persistence/JWT state.

**Failure scenario**

A legitimate employee row receives `Employee`, but required metadata contains `EMPLOYEE`; direct comparison denies access.

**Migration implication**

RBAC cannot be considered reliable until role representation is canonicalized.

**Recommended direction**

Use one role representation across DTO/domain, DB, JWT payload, `request.user`, and guards.

---

### P1-3 — API collection contract can become nested

**Evidence**

Account/Dish list transformation wraps a serialized collection again:

```ts
items: [dataSerialized]
```

**Impact**

Clients can receive `T[][]` instead of `T[]`.

**Failure scenario**

Frontend expects `items[0].id` but receives an array at `items[0]`.

**Migration implication**

Do not characterize this bug as the desired target contract.

**Recommended direction**

Define the target API contract explicitly and protect it with contract tests.

---

### P1-4 — Non-deterministic exception / HTTP semantics

**Evidence**

Services throw plain `Error`, while the global filter builds structured error details only for `HttpException`.

**Impact**

Known resource failures and unknown internal failures can produce incorrect or incomplete HTTP contracts.

**Migration implication**

Do not copy generic `throw new Error(...)` patterns.

**Recommended direction**

Use explicit application/HTTP error mapping for known cases and deterministic safe 500 handling for unknown failures.

---

### P1-5 — Environment contract drift

**Evidence**

- example env documents MongoDB and `DATABASE_*`
- runtime uses PostgreSQL and `DB_*`
- Joi requires `DB_URI` though TypeORM does not use it
- TypeORM requires `DB_NAME`, which Joi does not validate and example env does not define

**Impact**

New environments can fail at startup or later during DB connection despite appearing correctly configured.

**Migration implication**

Legacy config files are not a reliable bootstrap contract.

**Recommended direction**

Rewrite configuration as one source-of-truth contract: every required runtime variable must be documented and validated.

---

### P1-6 — Order / DishSnapshot cardinality may be wrong for ordering semantics

**Evidence**

`Order.dishSnapshotId` is unique and entities model `Order ↔ DishSnapshot` one-to-one.

**Impact**

If an order must contain multiple line items, or snapshot ownership differs, the current schema blocks valid domain behavior.

**Migration implication**

Do not migrate this relation mechanically.

**Recommended direction**

Define `Order 1 → N OrderItem` and immutable dish/price snapshot semantics before schema migration.

---

### P1-7 — Migration safety baseline is absent

**Evidence**

Verified E2E coverage is only `GET / → Hello World!`. Legacy CI builds/pushes/deploys Docker but does not explicitly enforce lint, tests, typecheck/build quality, API contracts, or migration verification.

**Impact**

Security, API, and persistence regressions can pass the current automated path.

**Migration implication**

Substantial behavior migration must not begin without executable guardrails.

**Recommended direction**

Create critical E2E, DB integration, API contract, and migration checks and make CI depend on them.

Branch-protection state could not be re-verified through the current GitHub integration because the protection endpoint is not accessible to this connection; therefore no new claim is made here about current branch rules.

---

### P1-8 — Media upload error path is unreliable

**Evidence**

`MediaService.uploadFile()` catches errors and logs them without rethrowing, so it can return `undefined`; the controller's outer catch may never receive the original failure.

**Impact**

A failed upload can look like a successful application path with an invalid URL/data value.

**Migration implication**

Do not copy this implementation directly.

**Recommended direction**

Preserve the capability only after defining storage, validation, error, and authorization contracts.

---

### P2-1 — Persistence abstraction leaks TypeORM

**Evidence**

Legacy repository/service interfaces expose `FindManyOptions`, `FindOneOptions`, and `DeepPartial`.

**Impact**

Persistence technology changes affect upper layers and generic abstractions add indirection without fully hiding ORM details.

**Migration implication**

Refactor boundary, but this is not itself a security/correctness blocker.

**Recommended direction**

Apply ADR-001: project-owned repository contracts; TypeORM allowed only in persistence implementations.

---

### P2-2 — Duplicate/stale dependencies

Verified dependency debt includes Mongo/Mongoose remnants, both `bcrypt` and `bcryptjs`, `cross-env` and `crossenv`, plus both TypeORM/PostgreSQL driver usage and an apparently unnecessary `postgres` client package.

**Recommended direction**

Remove only after usage cleanup and compatibility review; do not perform blind mass upgrades.

---

## 6. Final migration boundary

### Move first

```text
FO-002
Foundation
→ Nest bootstrap
→ source boundaries
→ config contract
→ PostgreSQL/TypeORM
→ test harness
→ CI quality gates
```

No critical business slice should be migrated before this safety path exists.

### Move second

```text
FO-003
Auth + Account vertical slice
→ login / refresh
→ request.user
→ role normalization
→ RBAC
→ account self-service
→ admin account management
→ repository/service boundary
```

This is the highest-risk business/security slice.

### Move third

```text
FO-004
Dish + persistence slice
→ Dish API contract
→ authorization
→ soft-delete/history semantics
→ Order / OrderItem / DishSnapshot decision
→ DB migration verification
```

### Must not be copied as-is

```text
unguarded Account management routes
authentication-only cross-account mutation
TypeORM types in service/repository contracts
magic-string repository DI tokens
Mongo/Mongoose remnants
stale env example
plain Error service patterns
nested-array response shaping
permanent Account deletion default
mixed bcrypt/bcryptjs usage
Hello World test as primary migration safety
current Order/DishSnapshot cardinality without domain decision
MediaService swallowed-error behavior
```

### Can remain in legacy temporarily

```text
Dish until FO-004
Media until its capability is prioritized
Order/Guest/Table flows not required by the first vertical slices
legacy deployment path while new backend is not serving production
```

---

## 7. Architecture guardrails

ADR-001 is accepted and becomes a migration constraint:

```text
Controller                → no TypeORM
Feature Service           → no TypeORM
Base Service              → no TypeORM
Repository Interfaces     → no TypeORM

BaseRepositoryAbstract    → TypeORM allowed
Concrete Repository       → TypeORM allowed
```

Use project-owned contracts such as:

```text
PageQuery
PageResult<T>
CreateData
UpdateData
```

Use Symbol DI tokens instead of magic strings.

Feature services own business behavior. Generic base services must not become a dumping ground for domain logic.

---

## 8. Safety prerequisites

Before a migrated slice is considered safe:

```text
critical E2E
+
PostgreSQL integration tests
+
API contract tests
+
migration verification
+
CI lint/test/build gate
```

Priority is risk/behavior coverage, not an arbitrary coverage percentage.

Characterization tests may preserve existing valid behavior. Verified bugs/security gaps must be represented as intentional target changes, not accidentally locked in as desired behavior.

---

## 9. Deferred / non-goals

The following are intentionally deferred unless a later ticket proves they are required:

```text
Nest major-version upgrade
mass dependency upgrade
full-codebase folder restructuring
strict Clean Architecture rewrite
additional persistence adapter layer
replacement of Passport/JWT auth
API-wide DTO rewrite
whole-database redesign
microservices split
payment or unrelated new features
```

Reason: FO-ECBE first needs stable vertical slices and production-safety evidence. Mixing broad platform upgrades or architectural rewrites into the initial migration would make regression attribution and rollback harder.

---

## 10. Exactly three next implementation tickets

### 1. FO-002 — Establish backend foundation, config contract and CI safety gate

Issue: https://github.com/khoawatt/fo-ecbe/issues/2

Purpose:

```text
create executable foundation
→ config + DB
→ architecture boundaries
→ test harness
→ CI gate
```

Dependency: FO-001.

Rollback: revert the foundation PR as a unit before business migration begins.

---

### 2. FO-003 — Migrate Auth + Account vertical slice with corrected RBAC

Issue: https://github.com/khoawatt/fo-ecbe/issues/3

Purpose:

```text
migrate highest-risk business/security slice
→ auth
→ refresh tokens
→ canonical roles
→ self-service
→ ADMIN-only account management
```

Dependency: FO-002.

Rollback: retain legacy Auth/Account path until parity/security tests pass; route back to legacy if the new slice fails.

---

### 3. FO-004 — Migrate Dish API and resolve Order/DishSnapshot persistence model

Issue: https://github.com/khoawatt/fo-ecbe/issues/4

Purpose:

```text
migrate next business slice
→ API contract
→ authorization
→ lifecycle
→ snapshot/cardinality model
→ migration tests
```

Dependencies: FO-002 and Auth/RBAC infrastructure from FO-003.

Rollback: keep schema migration reversible where feasible and retain legacy Dish/Order behavior until persistence tests pass.

---

## 11. Final decision

FO-001 has enough verified evidence to close assessment and begin implementation in dependency order:

```text
FO-002
   ↓
FO-003
   ↓
FO-004
```

Migration strategy:

```text
not a big-bang rewrite

foundation
→ protected vertical slice
→ protected next slice
→ continue incrementally
```

The core principle is:

> Preserve required business capability, not accidental legacy implementation.

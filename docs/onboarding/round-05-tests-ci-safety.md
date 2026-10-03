# Round 5 — Tests + CI + Safety Baseline

Status: **Passed — Project Audit**

## Scope

- Existing unit tests
- Existing E2E tests
- Behaviors currently protected by tests
- Missing safety nets
- CI configuration
- Branch protection / merge gates
- Preconditions before migration
- Migration blockers

---

## Source

Primary learning/reference source:

`khoawatt/storage/programming/nestjs/tests-ci-migration-safety.md`

The source already contains the standard answers, Senior-interview answers, test-layer mental model, CI gate model, migration-safety workflow, common traps, and minimum safety baseline. Round 5 reuses that material instead of duplicating it.

---

## Verified legacy evidence

Pinned legacy commit:

`167e02833ba2c406022afdc8f1c0681c3f40cbca`

### Existing E2E coverage

The only verified E2E test is:

`test/app.e2e-spec.ts`

It asserts:

```text
GET /
→ 200
→ "Hello World!"
```

Therefore the current test suite only proves a very small bootstrap/root-route behavior.

It does **not** protect:

```text
login
refresh token
JWT verification
RBAC
Account CRUD
Dish CRUD
database constraints
API response contract
error handling
migration correctness
```

Core rule:

```text
tests exist
≠
critical behavior is protected
```

### Existing CI

Verified `.gitlab-ci.yml` contains only:

```text
build
deploy
```

The build stage:

```text
docker pull
→ docker build
→ docker push
```

The deploy stage SSHes to the server and restarts Docker Compose.

No verified CI stage currently runs:

```text
lint
unit tests
integration tests
E2E tests
typecheck
Nest build as an explicit quality gate
migration verification
```

Therefore current CI is primarily:

```text
build/deploy automation
```

not a migration safety gate.

---

## Round 5 Decisions

### 1. Minimum safety baseline before implementation migration

Do **not** attempt to fully test all legacy code first.

Protect the highest-risk behavior.

Required baseline:

#### Critical E2E

```text
login
refresh token
RBAC
account self-service
admin account mutation
```

#### Repository / PostgreSQL integration tests

Protect:

```text
TypeORM mappings
unique constraints
soft delete
critical repository queries
transaction behavior where relevant
migration behavior
```

Do not mock PostgreSQL when persistence semantics are what the test is intended to verify.

#### API contract tests

Protect:

```text
HTTP status
response body shape
pagination
error envelope
```

This is especially important because Round 4 already identified response-shape and exception-contract issues.

#### CI quality gate

Minimum required checks:

```text
lint
test
build / typecheck
```

Deployment must depend on those checks succeeding.

#### Merge gate

Target flow:

```text
PR
→ required checks pass
→ review
→ merge
```

CI is not a safety gate if developers can merge around it.

#### Migration verification

At minimum:

```text
migration runs on clean DB
migration runs on representative existing schema
rollback/recovery procedure exists
```

Application tests passing does not prove DB migration safety.

---

## Test strategy

Use the smallest useful layer.

```text
Unit
→ isolated logic / branching

Integration
→ TypeORM + PostgreSQL / persistence semantics

E2E
→ critical HTTP user journeys
```

Examples:

```text
AuthService token generation
→ Unit

AccountRepository + PostgreSQL
→ Integration

POST /auth/login
→ E2E
```

Rule:

```text
Don't mock the thing you are trying to test.
```

---

## Coverage policy

Do not make a fixed percentage such as 90% the primary migration criterion.

Prefer:

```text
risk coverage
behavior coverage
critical-path coverage
```

Then use line/branch coverage as a supporting signal.

A lower coverage percentage that protects login, RBAC, account mutation, DB constraints and migrations can be more valuable than high coverage dominated by low-risk code.

---

## Characterization-test workflow

For legacy migration:

```text
Understand current behavior
        ↓
Write characterization tests
        ↓
Establish CI gates
        ↓
Migrate/refactor a small slice
        ↓
Run tests
        ↓
Compare behavior/contracts
        ↓
Deploy safely
        ↓
Observe
```

A characterization test may initially preserve legacy behavior even if that behavior is not ideal.

If the product intentionally changes behavior:

```text
new requirement
→ update expected contract/test
→ change implementation
```

This avoids accidental behavior changes during migration.

---

## Migration blockers

Before substantial implementation migration begins, the new repository must have a minimum executable safety path.

Block implementation migration if there is no way to automatically detect regressions in:

```text
authentication
authorization
critical account mutation
API contract
database migration
```

Not every P2 concern must be solved first, but these critical paths must have protection.

---

## Migration Classification

```text
Current Hello World E2E     → DROP / replace with meaningful smoke test
Legacy test baseline        → REWRITE
CI quality gates            → REWRITE
Build/deploy automation     → MIGRATE concept, redesign pipeline
Critical behavior tests     → ADD
DB integration tests        → ADD
API contract tests          → ADD
Migration verification      → ADD
Coverage percentage target  → DO NOT use as primary gate
```

---

## Result

**Round 5 project audit: PASS**

The project has enough evidence to define the migration safety baseline.

This does **not** mean the required tests/CI already exist. It means the current gaps and target guardrails are now explicitly defined.

Next:

**Round 6 — Migration Decision & Final Synthesis**

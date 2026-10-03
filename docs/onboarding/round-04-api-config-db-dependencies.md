# Round 4 — API + Config + DB + Dependencies

Status: **Passed — Project Audit**

## Scope

- API response contract
- Pagination
- DTO transform
- Exception / HTTP semantics
- Swagger accuracy
- TypeORM configuration
- Migrations / constraints
- Environment drift
- Duplicate / obsolete dependencies
- Delete strategy

## Verified findings

### API response / pagination — P1

`AccountService.getAllAccounts()` and Dish list logic can wrap an already-serialized collection again:

```ts
items: [dataSerialized]
```

If `dataSerialized` is already an array, the API can return `items: [[...]]` instead of `items: [...]`.

Decision: **REFACTOR** response shaping and protect status/body/pagination with contract tests.

### Exception semantics — P1

Services throw plain errors such as:

```ts
throw new Error('Account not found')
```

The global exception filter only derives structured HTTP details inside the `HttpException` branch. Plain errors therefore do not produce a reliable status/error contract.

Decision: **REFACTOR** known failures to explicit HTTP/domain errors and map unknown failures to safe HTTP 500 responses with logging.

### Config/environment drift — P1

Verified drift:

- `.env.example` describes MongoDB and `DATABASE_*` variables.
- Runtime uses PostgreSQL and `DB_*`.
- Joi requires `DB_URI`, but TypeORM does not consume it.
- TypeORM consumes `DB_NAME`, but Joi does not validate it and the example env does not define it.
- stale application naming remains in the example env.

Decision: **REWRITE** the configuration contract so example env, validation schema, and runtime reads match exactly.

### Dependencies — P2, compatibility review required

Target classification:

```text
KEEP
- typeorm
- @nestjs/typeorm
- pg
- @nestjs/common
- @nestjs/core
- cross-env

STANDARDIZE
- bcrypt / bcryptjs → choose one implementation

REMOVE after stale-code cleanup
- mongoose
- @nestjs/mongoose

REMOVE candidate
- postgres
- crossenv

REVIEW COMPATIBILITY
- Nest core majors vs Nest integration package majors
```

Legacy shared code still imports Mongoose types, so stale code must be removed before uninstalling those packages.

### Order / DishSnapshot model — P1

Current schema models `Order ↔ DishSnapshot` as one-to-one and enforces a unique `dish_snapshot_id`.

If the intended business model requires an order to contain multiple line items or reuse snapshot semantics differently, the current relation is too restrictive.

Decision: **REVIEW / REFACTOR** the aggregate before migration. Do not remove the unique constraint blindly. Define `Order 1 → N OrderItem` and immutable historical price/name semantics first.

### Delete strategy

Decision:

```text
Account → soft delete / inactive lifecycle by default
Dish    → soft delete when historical orders may reference it
Hard delete → only with explicit domain justification
```

Soft delete is not a history/versioning mechanism. Historical dish pricing requires snapshot/version data.

## Migration classification

```text
API response shaping          → REFACTOR
Exception semantics           → REFACTOR
Environment/config contract   → REWRITE
PostgreSQL                    → KEEP
TypeORM                       → KEEP
Dependency set                → REFACTOR
Order/DishSnapshot relation   → REVIEW / REFACTOR
Account delete behavior       → REFACTOR
```

## Result

**Round 4 project audit: PASS**

Candidate skill gaps remain separate from project status and should be retested during implementation.

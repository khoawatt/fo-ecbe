# Round 6 — Migration Decision & Final Synthesis

Status: **PASS — FO-001 Complete**

## Scope

- KEEP / MIGRATE / REFACTOR / REWRITE / DROP
- P0 / P1 / P2 findings
- Migration boundary
- Migration order
- Deferred work / non-goals
- Exactly three next implementation tickets
- Final FO-001 synthesis

## Final deliverable

Completed:

```text
docs/migration/legacy-backend-assessment.md
```

Pinned legacy baseline:

```text
khoawatt/bookingnow-sv
167e02833ba2c406022afdc8f1c0681c3f40cbca
```

## Final classification summary

```text
KEEP
- PostgreSQL
- TypeORM for the initial target

MIGRATE / REFACTOR
- NestJS modular behavior
- Auth
- Account self-service
- Dish
- refresh-token behavior
- repository/service pattern

REWRITE
- Account-management RBAC wiring
- environment/config contract
- tests / CI safety baseline

DROP
- Mongo/Mongoose remnants
- obsolete duplicate dependencies
- Hello World E2E as meaningful safety baseline
```

## Highest-priority findings

### P0

- anonymous Account provisioning path
- authenticated non-admin can modify another account
- authenticated non-admin can permanently delete another account

### P1

- account read/enumeration authorization gaps
- role representation mismatch
- nested collection response contract
- unreliable exception/HTTP semantics
- environment/config drift
- Order/DishSnapshot cardinality risk
- missing migration safety baseline
- Media upload swallowed-error behavior

### P2

- TypeORM leakage through generic service/repository contracts
- stale/duplicate dependency set

## Migration order

```text
FO-002 Foundation + Config + CI
        ↓
FO-003 Auth + Account + RBAC
        ↓
FO-004 Dish + persistence model
```

## Exactly three next tickets

1. #2 — `[FO-002][Phase 1] Establish backend foundation, config contract and CI safety gate`
2. #3 — `[FO-003][Phase 2] Migrate Auth + Account vertical slice with corrected RBAC`
3. #4 — `[FO-004][Phase 2] Migrate Dish API and resolve Order/DishSnapshot persistence model`

## Architecture constraint

ADR-001 remains accepted:

```text
Controller / Service / Repository Interface
→ no TypeORM

BaseRepositoryAbstract / Concrete Repository
→ TypeORM allowed
```

Use project-owned contracts and Symbol DI tokens.

## Deferred

Do not bundle the initial migration with:

- Nest major-version upgrade
- mass dependency upgrade
- strict Clean Architecture rewrite
- authentication replacement
- full DTO/API rewrite
- whole-database redesign
- microservices split

## Result

**Round 6: PASS**

**FO-001 assessment is complete.**

The target migration strategy is incremental vertical-slice migration protected by automated safety gates, not a big-bang rewrite.

Source of truth:

`docs/migration/legacy-backend-assessment.md`

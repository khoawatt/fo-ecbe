# ADR-001 — Repository and Service Abstraction

- **Status:** Accepted
- **Scope:** FO-001 / Round 2 — Persistence & Repository Architecture
- **Implementation status:** Deferred until FO-001 assessment is complete

## Context

The legacy backend currently uses a layered abstraction chain around TypeORM:

```text
AccountService
→ BaseServiceAbstract
→ AccountRepositoryInterface
→ BaseRepositoryInterface
→ AccountRepository
→ BaseRepositoryAbstract
→ TypeORM
→ PostgreSQL
```

The current implementation exposes TypeORM-specific types such as:

```text
FindManyOptions
FindOneOptions
DeepPartial
Repository<T>
```

across generic repository/service boundaries.

This causes ORM details to leak upward and weakens the purpose of the abstraction.

At the same time, this project is intentionally used to practice a complete enterprise-style NestJS architecture including:

- interfaces
- abstract classes
- generics
- inheritance
- `implements`
- dependency injection
- dependency inversion
- repository pattern
- service abstraction

The target design therefore keeps these architectural concepts while correcting their responsibilities and boundaries.

---

## Decision

The target architecture is:

```text
AccountController
      ↓
AccountService
      ↓ extends
BaseServiceAbstract
      ↓ depends on
AccountRepositoryInterface
      ↓ extends
BaseRepositoryInterface
      ↑ implements
AccountRepository
      ↓ extends
BaseRepositoryAbstract
      ↓
TypeORM Repository<AccountEntity>
      ↓
PostgreSQL
```

The following components are retained:

```text
BaseRepositoryInterface
BaseRepositoryAbstract

AccountRepositoryInterface
AccountRepository

BaseServiceInterface
BaseServiceAbstract

AccountService
AccountController
```

The following additional persistence abstraction is explicitly rejected:

```text
PersistenceRepositoryInterface
PERSISTENCE_REPOSITORY
```

No additional generic persistence adapter will be introduced at this stage.

---

## Architectural Boundary

The ORM boundary is fixed as follows:

```text
Controller                ❌ TypeORM
Feature Service           ❌ TypeORM
Base Service              ❌ TypeORM
Repository Interfaces     ❌ TypeORM

BaseRepositoryAbstract    ✅ TypeORM
Concrete Repository       ✅ TypeORM / Nest persistence wiring
```

### Core rule

> `BaseRepositoryAbstract` may depend on TypeORM.  
> Repository interfaces and the entire service layer must remain independent of TypeORM.

This means TypeORM is treated as a persistence-layer implementation detail rather than an application/service-layer dependency.

---

## Base Repository Contract

`BaseRepositoryInterface` defines generic repository behavior using project-owned contracts.

Example target shape:

```ts
export interface BaseRepositoryInterface<
  TEntity,
  TCreate,
  TUpdate
> {
  findById(id: string): Promise<TEntity | null>;

  findAll(
    query: PageQuery
  ): Promise<PageResult<TEntity>>;

  create(data: TCreate): Promise<TEntity>;

  update(
    id: string,
    data: TUpdate
  ): Promise<TEntity | null>;

  softDelete(id: string): Promise<boolean>;

  permanentlyDelete(id: string): Promise<boolean>;
}
```

The following TypeORM types must not appear in this interface:

```text
FindManyOptions
FindOneOptions
DeepPartial
Repository<T>
```

---

## Base Repository Implementation

`BaseRepositoryAbstract` is the generic TypeORM-backed implementation.

Example target shape:

```ts
export abstract class BaseRepositoryAbstract<
  TEntity extends ObjectLiteral,
  TCreate,
  TUpdate
> implements BaseRepositoryInterface<
  TEntity,
  TCreate,
  TUpdate
> {
  protected constructor(
    protected readonly repository: Repository<TEntity>
  ) {}

  // generic TypeORM CRUD implementation
}
```

Responsibilities:

- provide reusable TypeORM CRUD behavior
- centralize common persistence operations
- implement the generic repository contract
- hide TypeORM details from upper layers

It is acceptable for this class to depend directly on TypeORM because it belongs to the persistence layer.

---

## Feature Repository Contract

Each feature owns its repository contract.

Example:

```ts
export interface AccountRepositoryInterface
  extends BaseRepositoryInterface<
    AccountEntity,
    CreateAccountData,
    UpdateAccountData
  > {
  findByEmail(
    email: string
  ): Promise<AccountEntity | null>;

  existsByEmail(
    email: string
  ): Promise<boolean>;
}
```

Feature-specific repository contracts should express domain/application needs rather than expose raw ORM query APIs.

---

## Feature Repository Implementation

Example target:

```ts
@Injectable()
export class AccountRepository
  extends BaseRepositoryAbstract<
    AccountEntity,
    CreateAccountData,
    UpdateAccountData
  >
  implements AccountRepositoryInterface
{
  constructor(
    @InjectRepository(AccountEntity)
    repository: Repository<AccountEntity>
  ) {
    super(repository);
  }

  // Account-specific persistence behavior
}
```

`AccountRepository` is part of the persistence layer, therefore it may know about:

```text
@InjectRepository(...)
Repository<AccountEntity>
TypeORM query primitives
```

This dependency must not propagate into the service or interface layers.

---

## Base Service Contract

The generic service contract remains part of the target design.

Target relationship:

```text
ReadService
     ┐
     ├── BaseServiceInterface
WriteService
```

Example:

```ts
export interface ReadService<TEntity> {
  findById(id: string): Promise<TEntity>;
  findAll(query: PageQuery): Promise<PageResult<TEntity>>;
}

export interface WriteService<
  TEntity,
  TCreate,
  TUpdate
> {
  create(data: TCreate): Promise<TEntity>;
  update(id: string, data: TUpdate): Promise<TEntity>;
  remove(id: string): Promise<void>;
}

export interface BaseServiceInterface<
  TEntity,
  TCreate,
  TUpdate
> extends
  ReadService<TEntity>,
  WriteService<TEntity, TCreate, TUpdate> {}
```

---

## Base Service Implementation

`BaseServiceAbstract` contains generic application/service behavior.

Example target:

```ts
export abstract class BaseServiceAbstract<
  TEntity,
  TCreate,
  TUpdate
> implements BaseServiceInterface<
  TEntity,
  TCreate,
  TUpdate
> {
  protected constructor(
    protected readonly repository:
      BaseRepositoryInterface<TEntity, TCreate, TUpdate>
  ) {}

  // generic service behavior
}
```

It may contain generic operations such as:

```text
findById
findAll
create
update
remove
```

It must not import or depend on TypeORM.

---

## Feature Service Responsibilities

Feature services extend the generic base service and contain feature-specific business/application behavior.

Example:

```text
AccountService
  extends BaseServiceAbstract
```

Feature-specific behavior belongs here:

```text
register
changePassword
assignRole
resetPassword
lockAccount
```

These behaviors must not be pushed into the generic base service.

---

## Dependency Injection

Repository injection must use explicit runtime tokens.

Use:

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

Service:

```ts
constructor(
  @Inject(ACCOUNT_REPOSITORY)
  private readonly accountRepository:
    AccountRepositoryInterface
) {
  super(accountRepository);
}
```

Do not use magic-string tokens such as:

```ts
'AccountRepositoryInterface'
```

Reason:

TypeScript interfaces are erased at runtime, so NestJS requires an explicit runtime injection token.

---

## Rejected Alternative — PersistenceRepository Layer

The following design was considered:

```text
AccountRepository
→ BaseRepositoryAbstract
→ PersistenceRepositoryInterface
→ TypeOrmRepository
→ TypeORM
```

It was rejected because it adds another indirection layer without a demonstrated requirement.

It would only become justified if the system later requires capabilities such as:

- multiple persistence engines in parallel
- runtime persistence switching
- strict hexagonal adapters
- reusable in-memory persistence adapter
- external persistence service adapter

Those requirements do not currently exist.

---

## Why This Design Was Chosen

The design deliberately balances two goals.

### 1. Architectural practice

The project retains:

```text
interface
abstract class
generics
extends
implements
dependency injection
dependency inversion
repository pattern
service abstraction
```

This makes the project suitable for practicing a complete layered NestJS architecture.

### 2. Avoid unnecessary indirection

The project does not introduce abstraction purely for architectural appearance.

The following principle applies:

> Every layer must have a clear responsibility and justify its existence.

The rejected `PERSISTENCE_REPOSITORY` layer did not currently meet that threshold.

---

## Consequences

### Positive

- Service layer remains ORM-independent.
- Repository interfaces remain ORM-independent.
- Generic TypeORM behavior is centralized.
- Feature repositories can add domain-specific persistence methods.
- Generic repository/service patterns remain available for learning and reuse.
- Dependency direction is explicit.
- TypeScript generics, interface inheritance, abstract classes, DI, and DIP are all exercised.

### Trade-offs

- Concrete feature repositories still know TypeORM because they belong to the persistence layer.
- Replacing TypeORM would require rewriting persistence implementations.
- Generic abstractions increase indirection compared with a minimal NestJS architecture.
- The design must be monitored to ensure base classes do not become dumping grounds for unrelated behavior.

---

## Migration Classification

Current Round 2 candidate classification:

```text
BaseRepositoryInterface     → REFACTOR
BaseRepositoryAbstract      → REFACTOR

AccountRepositoryInterface  → REFACTOR
AccountRepository           → REFACTOR

BaseServiceInterface        → REFACTOR
BaseServiceAbstract         → REFACTOR

AccountService              → MIGRATE / REFACTOR by behavior
TypeORM                     → KEEP for now
PostgreSQL                  → KEEP for now
```

Final migration classification remains subject to the complete FO-001 assessment.

---

## Implementation Timing

This ADR records the approved target architecture.

It does **not** authorize implementation yet.

Implementation begins only after:

```text
Round 3 — Auth & Authorization
Round 4 — API + Config + DB + Dependencies
Round 5 — Tests + CI + Safety
Round 6 — Migration Decision & Final Synthesis
```

are complete and FO-001 defines the final migration sequence.

If a later round identifies a conflicting constraint, this ADR must be amended or superseded rather than silently violated.

# FO-ECBE

New NestJS backend migrated incrementally from the legacy BookingNow backend.

## Architecture sources

- `docs/migration/legacy-backend-assessment.md`
- `docs/architecture/decisions/ADR-001-repository-service-abstraction.md`
- `docs/architecture/rfcs/RFC-001-source-architecture.md`

## Local bootstrap

1. Install Node.js 24.21.0 (`nvm use` reads the pinned `.nvmrc`).
2. Copy `.env.example` to `.env`.
3. Start PostgreSQL 18.6 (`docker compose up -d postgres`) or create the configured database locally.
4. Run `npm ci`.
5. Run `npm run migration:run`.
6. Run `npm run start:dev`.
7. Verify `GET /health` returns `{"status":"ok"}`.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

TypeORM runs against the compiled native ESM DataSource. Each migration command
builds the project before invoking the CLI:

```bash
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:show
npm run migration:run
npm run migration:revert
```

FO-002 establishes foundation only. Auth/Account migration belongs to FO-003.

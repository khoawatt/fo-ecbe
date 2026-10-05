# FO-ECBE

New NestJS backend migrated incrementally from the legacy BookingNow backend.

## Architecture sources

- `docs/migration/legacy-backend-assessment.md`
- `docs/architecture/decisions/ADR-001-repository-service-abstraction.md`
- `docs/architecture/rfcs/RFC-001-source-architecture.md`

## Local bootstrap

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL and create the configured database.
3. Run `npm install`.
4. Run `npm run migration:run`.
5. Run `npm run start:dev`.
6. Verify `GET /health` returns `{"status":"ok"}`.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

FO-002 establishes foundation only. Auth/Account migration belongs to FO-003.

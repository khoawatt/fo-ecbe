# FO-ECBE

Backend migration and architecture-practice repository.

## Architecture sources

- `docs/migration/legacy-backend-assessment.md`
- `docs/architecture/decisions/ADR-001-repository-service-abstraction.md`
- `docs/architecture/rfcs/RFC-001-source-architecture.md`

## Local setup

1. Install Node.js 18 and PostgreSQL.
2. Copy the environment example:

```bash
cp .env.example .env
```

3. Create the database configured by `DB_NAME`.
4. Install dependencies:

```bash
npm install
```

5. Run migrations:

```bash
npm run migration:run
```

6. Start the app:

```bash
npm run start:dev
```

Health endpoint:

```text
GET /api/health
```

## Quality checks

```bash
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```

Integration/E2E tests require PostgreSQL using the test environment variables.

## Migration order

```text
FO-002 Foundation
→ FO-003 Auth + Account
→ FO-004 Dish + persistence model
```

Do not copy legacy implementation without checking the migration classification and accepted architecture documents.

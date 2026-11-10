# FO-003C — Auth and Session ERD (proposed)

**Status:** Phase 01 design proposal for [issue #9](https://github.com/khoawatt/fo-ecbe/issues/9).

The new table extends the existing FO-003A persistence foundation without modifying historical migrations.

~~~mermaid
erDiagram
    ACCOUNT ||--o{ ACCOUNT_SESSION : owns
    ACCOUNT ||--o{ ACCOUNT_ROLE : has
    ROLE ||--o{ ACCOUNT_ROLE : assigned

    ACCOUNT {
        uuid id PK
        varchar email UK
        varchar status
        timestamptz deleted_at
    }

    ACCOUNT_SESSION {
        uuid id PK
        uuid account_id FK
        char_64 refresh_token_hash
        varchar device_id "nullable"
        varchar device_name "nullable"
        varchar user_agent "nullable"
        timestamptz created_at
        timestamptz last_used_at "nullable"
        timestamptz expires_at
        timestamptz revoked_at "nullable"
    }

    ROLE {
        uuid id PK
        varchar code UK
    }

    ACCOUNT_ROLE {
        uuid id PK
        uuid account_id FK
        uuid role_id FK
    }
~~~

## Invariants

- A single Account can have multiple concurrent AccountSession records; session uniqueness is the session UUID, not the account UUID.
- A refresh JWT carries a UUID sid; only a SHA-256 fingerprint of the whole token is persisted.
- Every token rotation atomically replaces the hash for one session. A stale hash must never update a session.
- Revoked or expired sessions cannot refresh. A deleted or non-ACTIVE Account cannot refresh.
- Device fields are optional untrusted metadata, never proof of identity.
- Access JWT verification stays stateless and does not read this table.
- Physical Account deletion cascades to sessions; soft deletion prevents refresh through the Account-active gate.
- Schema naming follows snake_case PostgreSQL and camelCase TypeScript/HTTP.

See [refresh/session contract](../auth-refresh-sessions.md) and [test matrix](../../testing/fo-003c-acceptance-matrix.md).

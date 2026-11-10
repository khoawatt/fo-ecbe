# FO-003C — AccountSession and Refresh Token Contract (Phase 01)

**Status:** Proposed for Principal Mentor / Tech Lead review. No runtime implementation in this PR.

**Tracking:** [#9](https://github.com/khoawatt/fo-ecbe/issues/9); parent [#3](https://github.com/khoawatt/fo-ecbe/issues/3).

**Baseline:** main at d45d7b747f60ff762d398828b9370cdb15047185 (FO-003B, PR #26).

## 1. Current system and boundaries

FO-003B provides POST /auth/login (LocalAuthGuard), AuthService, AccountService.verifyCredentials(), an HS256 access JWT with a maximum 900-second TTL, and JwtAccessTokenGuard. The response contains accessToken, tokenType and expiresIn. The access JWT is verified without a database lookup. No session persistence or refresh token exists yet.

FO-003C adds first-class AccountSession state only for refresh and logout. It MUST NOT add a DB lookup to access-token verification, expose password hashes, change the five existing RBAC tables, or implement Store/Product/Order ownership logic. Preserve ADR-001: no TypeORM types in controllers, feature services or repository contracts; use Symbol-based DI for the persistence boundary.

## 2. Data model (proposed)

Create a new additive migration and AccountSession entity mapped to account_sessions:

| Column | PostgreSQL type | Rule |
| --- | --- | --- |
| id | uuid | PK; generated UUID |
| account_id | uuid | NOT NULL; FK to accounts.id; ON DELETE CASCADE |
| refresh_token_hash | char(64) | NOT NULL; lowercase SHA-256 hex of the complete serialized refresh JWT |
| device_id | varchar(128) | NULL; untrusted UX metadata only |
| device_name | varchar(128) | NULL; untrusted UX metadata only |
| user_agent | varchar(512) | NULL; untrusted UX metadata only |
| created_at | timestamptz | NOT NULL; default now() |
| last_used_at | timestamptz | NULL; set on successful rotation |
| expires_at | timestamptz | NOT NULL; expiration of the CURRENT refresh token |
| revoked_at | timestamptz | NULL; set when this session is logged out/revoked |

Suggested indexes: ix_account_sessions_account_id and ix_account_sessions_expires_at. No global UNIQUE(account_id): multiple independent devices/sessions per Account are required. Add a CHECK for expires_at > created_at, as appropriate to TypeORM metadata parity. Historical migrations remain unchanged.

One Account has zero or more AccountSessions. Expired and revoked rows may be retained for audit/cleanup; cleanup policy is a separate operational decision, not proof of authentication.

This version uses a **sliding refresh TTL**: each successful rotation updates expires_at to the newly issued refresh token expiration. An **absolute session lifetime** is intentionally not part of FO-003C; do not label refresh TTL as an absolute session limit.

## 3. Token format and configuration (proposed)

Continue access JWT format and validation exactly as currently implemented (sub, roleCodes, tokenType=access, iss, aud, iat, exp). No sid or session query is necessary for existing bearer-protected routes.

Issue refresh JWTs using HS256 with an independent signing secret and audience:

- JWT_REFRESH_SECRET: required; at least 32 UTF-8 bytes; MUST differ from JWT_ACCESS_SECRET.
- JWT_REFRESH_TTL_SECONDS: integer 60..2592000, default 604800 (7 days).
- JWT_REFRESH_ISSUER: nonempty, default fo-ecbe.
- JWT_REFRESH_AUDIENCE: nonempty, default fo-ecbe-refresh; distinct from JWT_ACCESS_AUDIENCE.
- Existing JWT_ACCESS_* and BCRYPT_* rules remain unchanged.

Refresh claims: sub = Account UUID, sid = AccountSession UUID, jti = freshly generated UUID PER issuance, tokenType = refresh, iss, aud, iat, exp. Do not include roleCodes, credentials, profile details or business-resource data. Validate signature, algorithm, issuer, audience, exp, iat, TTL bound, type, sub, sid and jti; reject access tokens at refresh endpoints.

Hash the complete signed refresh JWT using SHA-256 before writing it to PostgreSQL. Because the JWT is a cryptographically signed, high-entropy token with a unique random jti, this is a non-password token fingerprint; do not use the password bcrypt path for token hashes. Never persist or log plaintext RTs. Redact both access and refresh tokens in monitoring and errors.

## 4. Public HTTP contract (proposed)

All JSON properties are camelCase and existing auth error semantics remain stable.

| Route | Input | Success | Auth failure |
| --- | --- | --- | --- |
| POST /auth/login | { email, password } | 200 TokenPairResponse | 401 for unknown, bad password, inactive or deleted account |
| POST /auth/refresh | { refreshToken } | 200 TokenPairResponse | 401 for invalid, expired, mismatched, reused or revoked RT; inactive/deleted account |
| POST /auth/logout | { refreshToken } | 204 empty body | 401 for invalid, expired, mismatched, reused or revoked RT |

TokenPairResponse extends the existing successful login response additively:

~~~json
{
  "accessToken": "<signed access JWT>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshToken": "<signed refresh JWT>",
  "refreshExpiresIn": 604800
}
~~~

The actual expiresIn values reflect validated configuration. Login still performs **one** credential verification via AccountService. Existing access-only clients can ignore additional login fields, but consumers storing the refresh token must update. A future cookie transport requires separate CSRF and SameSite design; this phase does NOT assume localStorage is safe.

Validate DTO types and reject unknown request properties. Use a uniform 401 for token authentication failures; do not reveal whether an Account, Session or token hash existed. Rate limiting and sensitive audit logging remain production security requirements.

## 5. Application and persistence boundaries

Proposed dependency graph:

~~~text
AuthController
  -> AuthService                  (login/refresh/logout orchestration)
     -> AccountService            (credential check; ACTIVE/deletion check; current canonical roles)
     -> AccountSessionService     (issue/verify refresh JWT; session lifecycle)
        -> ACCOUNT_SESSION_REPOSITORY (Symbol token)
        -> AccountSessionRepository (TypeORM/PostgreSQL boundary)
        -> refresh-specific JwtService
~~~

No circular dependency between AuthService and AccountSessionService. AccountSessionService does not sign access JWTs. AuthService reuses the existing access JWT signing path to create the access half of each token pair. Only the concrete repository knows TypeORM/query-runner details; the repository interface exposes domain operations rather than leaking SQL or Repository<Entity>.

Minimum repository operations (names provisional):

- createSession(accountId, sessionId, tokenHash, expiry, optionalMetadata): persist one session.
- rotateIfCurrent(accountId, sessionId, expectedHash, nextHash, nextExpiry, now): compare-and-swap update exactly one active session; return true only when exactly one row changed.
- revokeIfCurrent(accountId, sessionId, expectedHash, now): atomically revoke exactly one active session; return true only when exactly one row changed.

The atomic SQL condition for rotation MUST include: matching account_id + id + current token hash, revoked_at IS NULL, expires_at > database NOW(), and existence of an ACTIVE and not soft-deleted Account. The update changes refresh_token_hash, expires_at and last_used_at together. This is a single database statement, not separate SELECT + UPDATE. Revocation must use equivalent matching and active/expiry conditions. Persist new token hashes only after refresh JWT generation succeeds.

## 6. State transitions and concurrency

~~~text
Login: verified ACTIVE Account
  -> create Session A, hash(RT1), expiresAt(RT1)
  -> AT1 + RT1

Refresh Session A: verified RT1 signature/claims
  -> check ACTIVE Account and load current roles
  -> generate AT2 + RT2 with fresh jti
  -> atomic CAS(hash(RT1) -> hash(RT2), update expiresAt/lastUsedAt)
  -> 200 AT2 + RT2 ONLY IF CAS succeeds

Concurrent refresh using RT1:
  -> exactly one CAS can succeed
  -> all other callers receive 401
  -> RT1 is unusable immediately after the successful rotation

Logout Session A: verified CURRENT RT
  -> CAS revoke Session A by matching current hash
  -> 204; RT cannot refresh again
  -> Session B remains untouched
~~~

Handle signature/claim failures, a missing session, hash mismatch, revocation, expiry, account status and database row-count mismatches as 401. Do not auto-revoke unrelated sessions on a hash mismatch. In this phase, stale-token reuse is rejected, but a stale JWT alone cannot reliably distinguish malicious replay from a legitimate parallel refresh; document this limitation instead of claiming full replay-family detection.

Access tokens already issued remain valid until expiration under the current stateless FO-003B contract even after logout or account disable. This is an intentional existing trade-off, not an immediate AT revocation guarantee.

## 7. Build sequence after Phase 01 review

1. Add AccountSession entity, additive migration, TypeORM runtime entity registration and schema drift assertions.
2. Add feature-owned repository contract, Symbol token, atomic repository implementation and provider module.
3. Add refresh signing/verification and hashing service with independent config.
4. Extend AuthService login response and add refresh/logout routes and DTO validation.
5. Add unit tests, isolated PostgreSQL integration tests and full HTTP E2E tests per the acceptance matrix.
6. Verify migration run/revert/run, metadata zero drift, lint, typecheck, build, full npm test, CI and GitGuardian; request Principal Mentor review and Tech Lead approval before merge.

## 8. Review gates / open decisions

- **Proposed:** seven-day sliding refresh TTL; absolute session lifetime deferred. Confirm product/security expectation.
- **Proposed:** body-based refresh token transport for current backend API; secure-cookie transport deferred until frontend/CSRF requirements are specified.
- **Proposed:** logout requires current, unexpired RT and returns 204; retry with revoked RT returns 401.
- **Required:** explicit DB-level atomic CAS for rotation/revoke, rather than read-then-write.
- **Required:** separate refresh secret/audience; prevent cross-acceptance of access and refresh tokens.
- **Required:** deployment preflight/rollback plan and CI acceptance before runtime rollout.

This document specifies a reviewable proposal only. It does not claim the feature, migration, tests or CI have been implemented.

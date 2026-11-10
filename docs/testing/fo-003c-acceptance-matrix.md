# FO-003C — Acceptance and Security Test Matrix (Phase 01)

**Related issue:** [#9](https://github.com/khoawatt/fo-ecbe/issues/9)  
**Status:** Test specification only; not executed.

## Unit / contract checks

| ID | Test | Expected |
| --- | --- | --- |
| CFG-01 | Missing/short refresh secret | Fail validation |
| CFG-02 | Refresh secret equals access secret | Fail validation |
| CFG-03 | Refresh TTL below 60 or above 2592000/noninteger | Fail validation |
| CFG-04 | Default refresh config | Seven-day TTL, distinct refresh audience |
| JWT-01 | Signed valid refresh claims | sub/sid/jti UUID; type refresh; proper iss/aud/iat/exp |
| JWT-02 | Forged, expired or malformed refresh JWT | 401 |
| JWT-03 | Wrong issuer/audience/algorithm | 401 |
| JWT-04 | Missing/invalid sub, sid or jti; access token used as refresh | 401 |
| JWT-05 | Each rotation signs a new jti; no roleCodes/password in RT | Pass |
| HASH-01 | Persisted token hash is lowercase SHA-256 hex | No raw JWT persisted |
| API-01 | Unknown fields or wrong types in refresh/logout DTO | Reject before session mutation |
| API-02 | Login response preserves access fields and adds refresh fields | Additive HTTP 200 contract |

## PostgreSQL integration and concurrency checks

Run each case in an isolated PostgreSQL schema with the existing foundation and canonicalization migrations followed by the new additive session migration.

| ID | Test | Expected |
| --- | --- | --- |
| DB-01 | Migration up/down/reapply | All succeed; earlier migrations unchanged |
| DB-02 | TypeORM metadata/schema diff | Zero unexpected up/down queries |
| DB-03 | Insert sessions A and B for one Account | Two independent rows |
| DB-04 | Store/lookup a new session | Only token hash persists, optional metadata bounded |
| CAS-01 | Valid current hash for active unexpired A | Exactly one A row updated |
| CAS-02 | Old RT1 hash after successful rotation | No update, 401 |
| CAS-03 | Parallel refresh of RT1 | Exactly one 200; all others 401 |
| CAS-04 | Rotate A | B's hash, expiry, lastUsedAt, revokedAt unchanged |
| CAS-05 | Revoke A | A marked revoked; B unchanged |
| CAS-06 | Refresh revoked/expired/nonexistent session | 401 |
| CAS-07 | Account disabled or soft deleted | Refresh CAS denied even with valid JWT/hash |
| CAS-08 | Attempt token with mismatched account id or sid | 401, no mutation |
| CAS-09 | New token expiresAt and lastUsedAt | Updated atomically with token hash |
| CAS-10 | Rollback migration after session data (test schema) | Only new session schema removed; historical tables preserved |

## HTTP E2E scenarios

| ID | Sequence | Expected |
| --- | --- | --- |
| E2E-01 | POST login with valid ACTIVE credentials | AT1 + RT1, 200, one Session |
| E2E-02 | Two logins with same credentials | Separate session IDs, both RTs usable |
| E2E-03 | Refresh session A RT1 | AT2 + RT2, same session, new jti |
| E2E-04 | Refresh session A with used RT1 | 401, RT2 remains usable |
| E2E-05 | Refresh session B after A rotation/logout | Success |
| E2E-06 | Logout A with current RT | 204; A refresh denied, B still works |
| E2E-07 | Invalid/expired/wrong-secret/wrong-type RT | Uniform 401 |
| E2E-08 | Disable or soft delete Account then refresh | 401 |
| E2E-09 | Access JWT verification with PostgreSQL disconnected | Still succeeds until token expiry |
| E2E-10 | Login credential failures | Same 401 semantics as FO-003B |
| E2E-11 | Access claims after refresh | Current canonical roleCodes, no session/RT hash/password |
| E2E-12 | No sensitive secrets/RT plaintext in responses to errors | No leak |

## Required verification evidence before requesting merge

- Node 24.21.0 and npm 11.19.0: npm ci, npm ls, npm run typecheck, npm run lint, npm run build.
- Run unit, PostgreSQL integration and E2E tests at least once (prefer two full npm test passes).
- Migration CLI smoke, show/run/revert/run, metadata zero-drift checks, production health startup.
- Record GitHub CI and GitGuardian checks with exact commit SHA.
- Document old-RT replay behavior and the fact that access-token revocation is not immediate.
- Do not merge automatically; Principal Mentor review and Tech Lead approval are required.

# Round 3 — Authentication & Authorization

Status: **Passed — Project Audit**

## Scope

- Login flow
- Access token / refresh token
- Guards / strategies
- RBAC
- `@ApiBearerAuth` vs `@UseGuards(JwtAccessTokenGuard)` vs `@UserAuth(...)`
- Authorization risks in Account endpoints
- Failure scenarios and severity

## Questions

1. Khi user login, request đi qua những component nào từ controller đến lúc access token + refresh token được tạo?
2. `JwtAccessTokenGuard` thực sự xác thực cái gì? User được attach vào request ở đâu?
3. `RolesGuard` lấy role yêu cầu từ đâu, và lấy role hiện tại của user từ đâu?
4. `@ApiBearerAuth`, `@UseGuards(JwtAccessTokenGuard)` và `@UserAuth([ROLE.X])` khác nhau thế nào?
5. Tìm ít nhất 2 endpoint trong `AccountController` mà authorization hiện tại có vấn đề. Với mỗi endpoint ghi:
   - current protection
   - expected protection
   - failure scenario

---

## Q1–Q4 — Candidate Assessment

Questions 1–4 were completed as cold-answer evidence on 2026-10-02.

### Interim capability assessment

- **State:** Yellow
- **Estimated mastery:** L2 — Use
- LocalAuthGuard → Passport local strategy → validate → AuthService flow is mostly understood.
- Main corrections:
  - Access JWT is verified cryptographically using the signing secret; it is not compared with a server-stored access token.
  - Passport attaches the strategy `validate()` return value to `request.user`; `roles.decorator.ts` does not.
  - `RolesGuard` reads required-role metadata via `Reflector` and current role from `request.user.role`.
  - `@ApiBearerAuth` is Swagger/OpenAPI documentation metadata only; it does not enforce runtime authentication.
  - In this legacy implementation, `AuthController.login()` ignores the `req.user` produced by `LocalStrategy` and calls `AuthService.login(request)`, which performs another account lookup.

Detailed capability assessment:

`khoawatt/storage/management/career-development/assessments/mock-tests/2026-10-02-nestjs-auth-authorization-round-03.md`

---

## Q5 — PO Authorization Decision

Question 5 was completed as a project-level PO/architecture decision rather than candidate evidence.

The target policy follows **least privilege**:

| Endpoint | Current protection | Target protection | Failure scenario | Severity |
|---|---|---|---|---|
| `GET /account` | None. `@ApiBearerAuth` is documentation only; previous `@UserAuth` is commented out. | `ADMIN` only | Anonymous caller can enumerate account records. | **P1** |
| `POST /account` | None | `ADMIN` only | Anonymous caller can provision an account through the employee-management endpoint. | **P0** |
| `GET /account/detail/:id` | `JwtAccessTokenGuard` only | `ADMIN` only | Any authenticated account can read another account by arbitrary ID. | **P1** |
| `PUT /account/detail/:id` | `JwtAccessTokenGuard` only | `ADMIN` only | Any authenticated account can modify another account by arbitrary ID. | **P0** |
| `DELETE /account/detail/:id` | `JwtAccessTokenGuard` only | `ADMIN` only | Any authenticated account can permanently delete another account by arbitrary ID. | **P0** |
| `GET /account/me` | `JwtAccessTokenGuard` | Authenticated user | Correct ownership boundary because ID comes from `req.user.id`. | Keep |
| `PUT /account/me` | `JwtAccessTokenGuard` | Authenticated user | Correct ownership boundary because update target comes from `req.user.id`. | Keep |
| `PUT /account/change-password` | `JwtAccessTokenGuard` | Authenticated user | Correct ownership boundary because account ID comes from `req.user.id` and current password is verified. | Keep |

### PO rule

Account-management endpoints are administrative operations.

Target policy:

```text
/account/me
/account/change-password
→ authenticated account

/account
/account/detail/:id
→ ADMIN only
```

Do not authorize administrative account-management routes with `EMPLOYEE` merely because an old comment suggests it. Until a business requirement proves otherwise, use least privilege.

---

## Additional Security Finding — Role Representation

The code enum defines:

```ts
ROLE.EMPLOYEE = 'EMPLOYEE'
```

while the Account entity and migration default the database role to:

```text
Employee
```

`RolesGuard` performs direct membership comparison, so these values are not equivalent.

### Impact

- newly created accounts can receive a role value that does not match the application's RBAC enum;
- legitimate users may fail authorization unexpectedly;
- authorization behavior becomes data-dependent and inconsistent.

### Decision

**P1 — REFACTOR before relying on RBAC.**

The new system must use one canonical role representation end-to-end:

```text
DTO/domain enum
→ persistence
→ JWT payload
→ request.user.role
→ RolesGuard
```

No mixed casing or implicit database defaults.

---

## Migration Decisions

```text
JwtAccessTokenGuard       → MIGRATE / REFACTOR
JwtAccessTokenStrategy    → MIGRATE / REFACTOR
JwtRefreshTokenGuard      → MIGRATE / REFACTOR
JwtRefreshTokenStrategy   → MIGRATE / REFACTOR
RolesGuard                → MIGRATE / REFACTOR
UserAuth decorator        → MIGRATE / REFACTOR
ApiBearerAuth usage       → KEEP as documentation only
Account self-service RBAC → KEEP behavior
Account admin RBAC        → REWRITE policy/wiring
Role representation       → REFACTOR
```

### Implementation guardrail

Before migrating account-management endpoints, add tests proving:

```text
anonymous → 401/403
authenticated non-admin → 403
admin → allowed
self-service account → only own resource
```

---

## Result

**Round 3 project audit: PASS**

The project-level auth/RBAC assessment is complete enough to proceed to Round 4.

Important distinction:

- **Project audit status:** PASS
- **Candidate skill state:** Yellow / L2
- Candidate mastery is not upgraded by the PO-supplied Q5 decision.
- JWT/Passport/RBAC corrections remain in the 7–14 day retest queue.

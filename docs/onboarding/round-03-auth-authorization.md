# Round 3 — Authentication & Authorization

Status: **In Progress**

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

## Progress — 2026-10-02

Questions 1–4 completed as cold-answer evidence.

### Interim assessment

- **State:** Yellow
- **Estimated mastery:** L2 — Use
- LocalAuthGuard → Passport local strategy → validate → AuthService flow is mostly understood.
- Main corrections:
  - Access JWT is verified cryptographically using the signing secret; it is not compared with a server-stored access token.
  - Passport attaches the strategy validate() return value to request.user; roles.decorator.ts does not.
  - RolesGuard reads required-role metadata via Reflector and current role from request.user.role.
  - ApiBearerAuth is Swagger/OpenAPI documentation metadata only; it does not enforce runtime authentication.
  - In this legacy implementation, AuthController.login() ignores the req.user produced by LocalStrategy and calls AuthService.login(request), which performs another account lookup.

Detailed capability assessment:

khoawatt/storage/management/career-development/assessments/mock-tests/2026-10-02-nestjs-auth-authorization-round-03.md

## Remaining

Question 5 — concrete authorization audit of AccountController.

## Result

Pending Question 5 and re-answer/correction check.

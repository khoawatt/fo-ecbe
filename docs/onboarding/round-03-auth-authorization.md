# Round 3 — Authentication & Authorization

Status: **Pending**

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

## Result

TBD

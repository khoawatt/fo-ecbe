# Local login and access tokens

`POST /auth/login` accepts camelCase JSON with `email` and `password`. A valid ACTIVE account receives HTTP 200 and `{ "accessToken": "...", "tokenType": "Bearer", "expiresIn": 900 }` (or the configured shorter duration). Unknown accounts, incorrect passwords, and inactive accounts all receive HTTP 401 without revealing the reason. Invalid request shapes receive a client error. No refresh token is issued.

The Local Passport strategy calls `AuthService.validateCredentials()`, which delegates to `AccountService.verifyCredentials()` once. The controller signs the resulting safe account context without another account lookup. Protected routes use `Authorization: Bearer <access-token>` and `JwtAccessTokenGuard`.

Access tokens use HS256 and contain only `sub` (account UUID), canonical `roleCodes`, `tokenType: "access"`, and standard `iss`, `aud`, `iat`, and `exp` claims. Verification checks the signature, algorithm, issuer, audience, expiration, token type, and claim structure. A successful request receives `request.user = { id, roleCodes }`. JWT verification does not query PostgreSQL.

Role codes are a snapshot at login. Changes to account roles or status do not alter an issued access token until it expires. The configured lifetime cannot exceed 900 seconds. Deployments must provide a unique random `JWT_ACCESS_SECRET` of at least 32 UTF-8 bytes. Login rate limiting remains a production security follow-up. Refresh sessions and authorization policies are separate future work.

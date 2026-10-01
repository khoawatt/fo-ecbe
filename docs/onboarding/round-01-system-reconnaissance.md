# Phần 1 — Điều tra app

## Câu hỏi

1. Backend này đang dùng framework + DB + ORM gì?
2. App khởi động từ đâu và AppModule load những module nào?
3. Các business module hiện tại là gì?
4. Một request Account đi qua những layer nào?
5. Theo quan sát ban đầu, đâu là 3 chỗ bạn muốn điều tra sâu nhất? Vì sao?

## Trả lời và đánh giá

Bạn làm Round 1 khá ổn ở mức reconnaissance, nhưng có 3 lỗi kỹ thuật cần sửa ngay trước khi đi tiếp.

1. Câu 1 sai ở database. Repo này hiện chạy **PostgreSQL + TypeORM**, không phải MongoDB. `TypeOrmConfigService` cấu hình `type: 'postgres'`, dùng `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME`, và register các entity `Account, Dish, DishSnapshot, Guest, Order, TableInfo`. Việc `package.json` vẫn còn `mongoose` và `@nestjs/mongoose` chỉ cho thấy dependency dư/legacy, không chứng minh runtime đang dùng MongoDB.

Câu đúng nên là:

```text
NestJS + PostgreSQL + TypeORM
```

2. Câu 2 và 3 đúng. `main.ts` bootstrap app, còn `AppModule` load:

```text
ConfigModule
AccountModule
AuthModule
MediaModule
DishModule
```

Trong đó business-oriented modules hiện tại là `Account`, `Auth`, `Media`, `Dish`. `ConfigModule` là infrastructure/configuration chứ không phải business module.

3. Câu 4 có ý đúng nhưng lifecycle đang bị lẫn thứ tự và trách nhiệm.

Luồng khái quát của NestJS nên nhớ là:

```text
Request
  ↓
Middleware
  ↓
Guards
  ↓
Interceptor (before)
  ↓
Pipes
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
TypeORM Repository
  ↓
PostgreSQL
  ↓
Interceptor (after / response mapping)
  ↓
Response
```

Nếu có exception không được xử lý:

```text
Exception
  ↓
Exception Filter
  ↓
HTTP error response
```

Có hai điểm đặc biệt quan trọng:

**`@ApiBearerAuth()` không làm authentication.**

Trong `AccountController` có:

```ts
@ApiBearerAuth(HTTP_HEADERS.AUTHORIZATION)
```

nhưng đây là decorator của **Swagger**, mục đích là mô tả API docs rằng endpoint dùng bearer token.

Nó không verify JWT.

Thứ thực sự enforce auth là dạng:

```ts
@UseGuards(JwtAccessTokenGuard)
```

hoặc custom composition như `@UserAuth(...)`.

Đây là distinction rất quan trọng khi review backend security.

Thứ hai, repo này có `GlobalValidationPipe` được register trong `main.ts`, và pipe đó thực hiện DTO validation + whitelist. Nó không phải “validation API/header/auth” nói chung. Auth thuộc Guard; header có thể được đọc ở các thành phần khác; DTO validation thuộc Pipe.

Ngoài ra `TransformResponseInterceptor` hiện tại chủ yếu wrap response thành response envelope và pagination. Nó không làm `instanceToClass` như bạn suy đoán.

4. Với Account, flow cụ thể hơn là:

```text
HTTP request
    ↓
AccountController
    ↓
JwtAccessTokenGuard
    ↓        (chỉ ở endpoint nào có @UseGuards)
GlobalValidationPipe
    ↓
AccountController method
    ↓
AccountService
    ↓
BaseServiceAbstract hoặc AccountRepository
    ↓
AccountRepository
    ↓
BaseRepositoryAbstract
    ↓
TypeORM Repository<Account>
    ↓
PostgreSQL
```

Ví dụ `getAllAccounts()`:

```text
GET /account
    ↓
AccountController.findAll()
    ↓
AccountService.getAllAccounts()
    ↓
BaseServiceAbstract.findAll()
    ↓
AccountRepository/BaseRepositoryAbstract
    ↓
TypeORM
    ↓
PostgreSQL
```

Và chính endpoint này đáng điều tra vì hiện `@UserAuth([ROLE.EMPLOYEE])` đang bị comment.

5. Ba khu vực bạn chọn điều tra tiếp là hợp lý, nhưng cái thứ ba `"phần kết nối api"` còn quá mơ hồ.

Tôi muốn bạn refine thành:

```text
1. Repository / persistence abstraction
2. Authentication + authorization
3. HTTP API contract + request/response pipeline
```

Như vậy rõ hơn nhiều.

Về `repository pattern`, cảm giác “rối” của bạn là dấu hiệu đúng để điều tra, nhưng chưa được kết luận là thiết kế sai. Hiện tại chain của nó thực tế là:

```text
AccountService
    ↓
AccountRepositoryInterface
    ↓
AccountRepository
    ↓
BaseRepositoryAbstract<Account>
    ↓
TypeORM Repository<Account>
```

Điểm cần hỏi không phải:

> Repository pattern này có đẹp không?

Mà là:

> Mỗi layer đang tạo abstraction value gì, và layer nào chỉ forward TypeORM API sang layer khác?

Đó mới là câu Lead nên hỏi.

### Round 1 result

Tôi đánh giá bạn **pass có correction**.

Bạn đã nhìn đúng structure tổng thể, nhưng cần sửa mental model ở ba điểm:

```text
MongoDB → PostgreSQL

@ApiBearerAuth = auth
→ Sai, chỉ Swagger documentation

Pipe / Guard / Interceptor lifecycle
→ cần phân biệt responsibility rõ hơn
```

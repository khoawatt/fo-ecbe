# Round 2 — Persistence / Repository Abstraction

## Câu hỏi Round 2

Đọc:

```text
src/modules/account/account.service.ts
src/modules/account/interfaces/account.interface.ts
src/repositories/account.repository.ts
src/repositories/base/base.abstract.repository.ts
src/services/base/base.abstract.service.ts
```

Sau đó trả lời:

```text
1. AccountService đang phụ thuộc trực tiếp vào class nào/interface nào?

2. Khi AccountService gọi findOneByCondition(),
   method thực sự đi qua những class nào cho tới TypeORM?

3. BaseServiceAbstract và BaseRepositoryAbstract đang giải quyết vấn đề gì?
   Bạn thấy lợi ích thực tế nào?

4. Có abstraction nào trong chain này mà bạn nghi là thừa không?
   Nếu có, chỉ ra bằng evidence; chưa được đề xuất xóa.
```

---

## Câu trả lời của bạn

### 1

> phụ thuộc vào base.abstract.service là lớp implement cho những phương thức trong lớp trừu tượng được khai báo trong base service interface.

### 2

> method đi theo thứ tự sau: kiểm tra phương thức được kế thừa tương ứng ở lớp dẫn xuất (lớp cha), tức là BaseServiceAbstract, nếu phg thức tồn tại thì đi tiếp tới phần gọi đến repository của hàm findOneByCondition tức là findOne kèm điều kiện where, đây là hàm tương tác trực tiếp với database mà typeorm định nghĩa (có kiểu BaseRepositoryInterface)

### 3

> BaseServiceAbstract implement các phương thức đặt ra trong **base interface service** và thực tế vẫn access tới **base interface repository** (Gọi **BaseRepositoryInterface** trong constructor), là một tầng trừu tượng không access trực tiếp tới database, chỉ xử lý logic nghiệp vụ.  
> BaseRepositoryAbstract implement các phương thức trong **base interface repository, nơi gọi đến cơ sở dữ liệu.**

### 4

> Tôi chịu, code cũ nhìn rối quá, không biết có triển khai đúng chưa nữa

---

## Review và correction

Round 2 **chưa pass hoàn toàn**, nhưng bạn đã bắt đầu nhìn đúng vấn đề. Phần còn thiếu chính là distinction giữa **inheritance**, **DI**, **interface**, và **runtime implementation**.

### 1. AccountService phụ thuộc vào cái gì?

Câu của bạn chưa đủ chính xác.

`AccountService` có hai quan hệ khác nhau:

```ts
export class AccountService extends BaseServiceAbstract<Account>
```

Đây là **inheritance**:

```text
AccountService
    extends
BaseServiceAbstract<Account>
```

Nhưng dependency persistence mà nó inject trực tiếp là:

```ts
@Inject('AccountRepositoryInterface')
private readonly accountRepository: AccountRepositoryInterface
```

Tức source code của `AccountService` phụ thuộc vào:

```text
BaseServiceAbstract<Account>     ← inheritance
AccountRepositoryInterface       ← dependency injection
ConfigService                    ← dependency injection
```

Còn runtime NestJS map token:

```text
'AccountRepositoryInterface'
        ↓
AccountRepository
```

trong `AccountModule`.

Điểm rất quan trọng:

> `AccountService` không inject `BaseRepositoryInterface` trực tiếp.

Nó inject `AccountRepositoryInterface`, mà interface này:

```ts
export interface AccountRepositoryInterface
  extends BaseRepositoryInterface<Account>
```

---

### 2. `findOneByCondition()` thực sự chạy thế nào?

Bạn hiểu ý chính nhưng terminology đang lẫn.

Bạn nói:

> lớp dẫn xuất (lớp cha)

Hai cái này ngược nhau:

```text
BaseServiceAbstract = base class / lớp cha
AccountService      = derived class / lớp con
```

Khi gọi:

```ts
this.findOneByCondition(...)
```

trên `AccountService`, `AccountService` không override method đó nên JS tìm lên prototype chain:

```text
AccountService
    ↓ không có findOneByCondition()
BaseServiceAbstract
    ↓ có
findOneByCondition()
```

Implementation:

```ts
async findOneByCondition(filter: Partial<T>) {
  return await this.repository.findOne({
    where: filter
  });
}
```

Nhưng `this.repository` ở đây là gì?

Constructor của `AccountService`:

```ts
constructor(
  @Inject('AccountRepositoryInterface')
  private readonly accountRepository: AccountRepositoryInterface,
  ...
) {
  super(accountRepository);
}
```

Nghĩa là instance `AccountRepository` được truyền cho `BaseServiceAbstract`.

Toàn bộ runtime chain là:

```text
AccountService
    ↓
BaseServiceAbstract.findOneByCondition()
    ↓
BaseServiceAbstract.repository
    │
    │ actual object = AccountRepository
    ↓
AccountRepository
    ↓
BaseRepositoryAbstract.findOne()
    ↓
TypeORM Repository<Account>.findOne()
    ↓
PostgreSQL
```

Đây là mental model bạn cần giữ.

---

### 3. BaseServiceAbstract / BaseRepositoryAbstract

Phần này bạn hiểu khoảng đúng, nhưng có một nhận định cần sửa:

> BaseServiceAbstract chỉ xử lý logic nghiệp vụ.

Không hẳn.

`BaseServiceAbstract` hiện có:

```text
create
findAll
findOne
findOneByCondition
update
softDelete
permanentlyDelete
```

Đây chủ yếu là **generic CRUD/application orchestration**, không phải business logic đặc thù.

Ví dụ:

```ts
findAll(options?: FindManyOptions<T>)
```

thậm chí nhận thẳng `FindManyOptions` của TypeORM.

Vì vậy hiện tại boundary thực tế là:

```text
AccountService
    ↓
generic service abstraction
    ↓
generic repository abstraction
    ↓
TypeORM
```

chứ chưa phải:

```text
Business Layer
    ↓
ORM-independent persistence abstraction
```

Còn phần bạn nói về `BaseRepositoryAbstract` là đúng:

```text
BaseRepositoryAbstract
    ↓
TypeORM Repository<T>
    ↓
Database
```

Nó là layer trực tiếp wrap TypeORM repository.

---

## Phân tích abstraction

Nhìn `BaseRepositoryInterface`:

```ts
findOne(options: FindOneOptions<T>)
findAll(options?: FindManyOptions<T>)
create(entity: DeepPartial<T>)
```

Ba type này:

```text
FindOneOptions
FindManyOptions
DeepPartial
```

đều là **TypeORM types**.

Trong khi repository abstraction thường được tạo ra với một trong các mục tiêu:

```text
Service
    ↓
Repository abstraction
    ↓
Persistence implementation

Service không cần biết ORM bên dưới là gì.
```

Nhưng ở code hiện tại:

```text
Service
    ↓
FindManyOptions<TypeORM>
    ↓
BaseRepositoryInterface
    ↓
BaseRepositoryAbstract
    ↓
Repository<TypeORM>
```

Tức là abstraction phía trên **vẫn biết TypeORM**.

Đây là evidence đầu tiên để nghi ngờ nó là **leaky abstraction**.

Tiếp theo nhìn `BaseRepositoryAbstract`:

```ts
findOne(...)
{
  return this.repository.findOne(...)
}
```

```ts
findAll(...)
{
  return this.repository.find(...)
}
```

```ts
count(...)
{
  return this.repository.count(...)
}
```

Rất nhiều method về cơ bản là:

```text
our abstraction
    ↓
forward 1:1
    ↓
TypeORM
```

Thế nên câu hỏi Lead phải đặt ra là:

> Nếu layer này không che TypeORM, không thêm domain semantics, và chủ yếu forward method, thì nó đang tạo giá trị gì đủ lớn để justify thêm một abstraction layer?

**Chưa được kết luận là phải xóa.**

Đó mới chỉ là evidence để audit tiếp.

---

## Candidate abstraction đáng nghi nhất hiện tại

Không phải `AccountRepository` trước.

`AccountRepository` ít nhất còn có chỗ cho domain-specific query:

```ts
findByEmail(email)
```

Candidate đáng điều tra là bộ generic:

```text
BaseServiceInterface
        ↓
BaseServiceAbstract
        ↓
BaseRepositoryInterface
        ↓
BaseRepositoryAbstract
        ↓
TypeORM Repository
```

Vấn đề tiềm năng:

```text
nhiều indirection
+
ORM vẫn leak lên trên
+
đa số method chỉ forward
=
có khả năng over-abstraction
```

Nhưng cũng có benefit:

```text
centralized CRUD
centralized pagination
common soft/permanent delete behavior
substitution/testing boundary
less duplicated boilerplate
```

Nên chưa được nói:

> Repository pattern này sai.

Phải nói:

> Generic persistence/service abstraction hiện có dấu hiệu không tạo được ORM boundary rõ ràng; cần kiểm tra value của nó so với complexity mà nó tạo ra.

Đó là cách viết technical assessment tốt hơn.

---

## Kết quả Round 2 trước mini re-test

Bạn đã hiểu đúng ba thứ:

```text
Service không trực tiếp query DB.

Repository là layer gần persistence hơn.

Generic base classes đang tạo thêm abstraction.
```

Nhưng cần sửa ba mental model:

```text
extends != dependency injection

interface != runtime object

BaseServiceAbstract != business logic thuần
```

Và phát hiện kỹ thuật đầu tiên của bạn có thể ghi vào FO-001 dưới dạng **observation**, chưa phải finding:

> The generic service/repository abstractions expose TypeORM-specific types (`FindManyOptions`, `FindOneOptions`, `DeepPartial`) across their public interfaces and largely forward CRUD operations to TypeORM. This may indicate a leaky/low-value abstraction and requires further evaluation before migration.

Đây mới là evidence-based reasoning.

---

## Mini re-test

### Câu hỏi

> Nếu ngày mai team thay TypeORM bằng Prisma, với architecture hiện tại thì `BaseRepositoryAbstract` là layer duy nhất phải sửa, hay các layer phía trên cũng bị ảnh hưởng? Chỉ ra evidence từ code.

### Câu trả lời của bạn

> nếu như bạn nói thì thay bằng prisma, phần đáng lẽ ra k bị thay đổi là base interface service và base abstract service, nhưng nó đang gọi tới các phương thức của orm thì chắc chắn có ảnh hưởng rồi.

---

## Review mini re-test

Đúng hướng. **Round 2 pass.**

Nhưng chỉnh một điểm quan trọng: vấn đề không chỉ là `BaseServiceAbstract` “gọi tới phương thức ORM”. Thực tế nó còn **phụ thuộc trực tiếp vào TypeORM ở compile-time** vì import type của TypeORM:

```ts
import { DeepPartial, FindManyOptions, FindOneOptions } from 'typeorm';
```

`BaseServiceInterface` cũng vậy:

```ts
import { FindManyOptions, FindOneOptions } from 'typeorm';
```

Nên nếu thay TypeORM bằng Prisma, impact hiện tại sẽ lan như sau:

```text
TypeORM → Prisma
    ↓
BaseRepositoryAbstract            // chắc chắn sửa
BaseRepositoryInterface           // chắc chắn sửa
    ↓
BaseServiceAbstract               // bị ảnh hưởng vì dùng TypeORM types
BaseServiceInterface              // bị ảnh hưởng vì dùng TypeORM types
    ↓
AccountRepositoryInterface        // extends BaseRepositoryInterface
AccountRepository                 // implementation persistence
    ↓
AccountService                    // có thể bị ảnh hưởng theo contract mới
```

Đây chính là bằng chứng rằng abstraction hiện tại **không thực sự cô lập ORM**.

Một boundary tốt hơn về mặt ý tưởng sẽ là:

```text
AccountService
    ↓
Repository contract của mình
    ↓
Prisma / TypeORM / bất kỳ persistence implementation nào
```

Ví dụ thay vì để service biết:

```ts
FindManyOptions<Account>
```

contract của mình có thể là kiểu:

```ts
type AccountQuery = {
  page?: number;
  limit?: number;
  email?: string;
  role?: Role;
};
```

Repository implementation mới chuyển:

```text
AccountQuery
    ↓
TypeORM query
```

hoặc:

```text
AccountQuery
    ↓
Prisma query
```

Khi đó ORM change chủ yếu nằm dưới persistence boundary.

Điểm cần nhớ từ Round 2:

> **Abstraction không có giá trị chỉ vì có interface và abstract class. Giá trị của abstraction nằm ở thứ nó che giấu khỏi caller.**

Code hiện tại có:

```text
Interface
Abstract class
Repository pattern
```

nhưng vẫn expose:

```text
FindManyOptions
FindOneOptions
DeepPartial
```

nên ORM vẫn leak xuyên qua boundary.

Đây là một finding tốt cho FO-001, nhưng hiện tại nên ghi là **P2 Architecture / maintainability**, không phải P0/P1. Nó làm migration/refactor khó hơn, nhưng bản thân nó chưa chứng minh security/correctness failure.

---

## Round 2 result

**PASS**

### Key learning

```text
Inheritance != Dependency Injection
Interface != Runtime implementation
Generic service != Business logic
Repository abstraction chỉ có giá trị nếu nó che giấu được persistence detail
TypeORM types đang leak lên service boundary
```

### FO-001 observation

```text
Severity: P2 — Architecture / Maintainability

Observation:
The generic service/repository abstractions expose TypeORM-specific types
(FindManyOptions, FindOneOptions, DeepPartial) across public interfaces
and largely forward CRUD operations to TypeORM.

Implication:
The current abstraction does not fully isolate persistence technology,
so replacing TypeORM would affect multiple upper layers.

Status:
Verified observation; migration decision not yet finalized.
```

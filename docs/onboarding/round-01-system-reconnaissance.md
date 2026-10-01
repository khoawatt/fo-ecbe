Có. Với vai trò PM/Principal guide, bước tiếp theo của bạn **không phải code**. Vì bạn mới vào dự án, mục tiêu 1–2 giờ đầu là hiểu hệ thống đủ để không đưa ra quyết định sai.

Tôi muốn bạn làm FO-001 theo thứ tự này:

1. **Đọc ticket FO-001 từ đầu đến cuối**, nhưng chưa cố trả lời ngay. Chỉ cần hiểu deliverable cuối cùng là: “cái gì giữ, cái gì migrate, cái gì refactor/rewrite/drop, và vì sao”.

2. **Clone cả hai repo về máy**, để cạnh nhau:

```bash
git clone https://github.com/khoawatt/bookingnow-sv.git
git clone https://github.com/khoawatt/fo-ecbe.git
```

Trong legacy:

```bash
cd bookingnow-sv
git checkout 167e02833ba2c406022afdc8f1c0681c3f40cbca
```

Quan trọng: FO-001 phải audit đúng SHA này, không audit “main hiện tại” nếu nó thay đổi sau đó.

3. **Đừng đọc từng file từ trên xuống.** Đọc theo luồng runtime này trước:

```text
package.json
    ↓
src/main.ts
    ↓
src/app.module.ts
    ↓
src/configs/*
    ↓
src/modules/*
    ↓
controllers
    ↓
services
    ↓
repositories
    ↓
entities
    ↓
database/migrations
```

Mục tiêu của vòng đầu chỉ là trả lời:

```text
App start thế nào?
Module nào tồn tại?
Module phụ thuộc module nào?
Request đi từ controller xuống DB thế nào?
Auth chen vào đâu?
```

4. Sau đó mở riêng các khu vực này:

```text
src/modules/auth
src/modules/account
src/modules/dish
src/modules/media
src/repositories
src/services
src/entities
test
.gitlab-ci.yml
.env.example
package.json
```

**Không sửa gì.**

5. Bắt đầu ghi note cho từng area theo format rất ngắn:

```text
Area: Account

Capability:
Quản lý tài khoản / employee.

Current implementation:
AccountController
→ AccountService
→ AccountRepository
→ Account entity

Dependencies:
Auth
TypeORM
bcrypt
shared DTO/util

Initial observations:
- ...
- ...

Decision:
Chưa quyết định.
```

Ở vòng đầu, `Decision: Chưa quyết định` hoàn toàn bình thường. Tôi không muốn bạn thấy code xấu rồi lập tức kết luận `REWRITE`.

6. Sau khi hiểu structure, mới bắt đầu **risk pass**. Với mỗi vấn đề, đừng chỉ ghi:

> RBAC bị lỗi.

Phải nghĩ theo Lead:

```text
Evidence:
GET /account không có guard X.

Expected behavior:
Endpoint này đáng lẽ chỉ Employee/Admin dùng?

Failure scenario:
Unauthenticated caller có thể đọc dữ liệu gì?

Impact:
Security / data exposure / business rule?

Severity:
P0/P1/P2?

Migration implication:
Không được copy nguyên implementation này sang repo mới.
```

Đây là kỹ năng tôi muốn train cho bạn nhất. **Code smell ≠ risk. Bug ≠ P0. Architecture xấu ≠ cần rewrite.**

7. Khi đã audit các phần chính, mới lập bảng migration:

| Capability | Legacy implementation | Need in FO-ECBE? | Decision |
|---|---|---:|---|
| Config | `src/configs` | Yes | TBD |
| Auth | `modules/auth` | Yes | TBD |
| Account | `modules/account` | Yes | TBD |
| Dish | `modules/dish` | ? | TBD |
| Media | `modules/media` | ? | TBD |
| Generic Repository | `repositories` | ? | TBD |

Đặc biệt với `Dish`, đừng mặc định migrate chỉ vì nó đã tồn tại. Trước tiên phải hỏi: **FO-ECBE thực sự là domain gì và capability này có còn thuộc target không?**

Có một điểm quy trình tôi muốn sửa ngay: `fo-ecbe` hiện đang **trống hoàn toàn**, nên chưa cần cố commit `docs/migration/legacy-backend-assessment.md` ngay. Bạn có thể làm assessment trước ở local/note. Khi đã có bản draft đủ tốt, tôi sẽ quyết định cách bootstrap `main` tối thiểu để FO-001 có thể đi qua branch → PR → review đúng quy trình, thay vì commit linh tinh trực tiếp vào repo mới.

### Việc bạn làm ngay bây giờ

Chỉ làm **Round 1 — System Reconnaissance**, chưa audit sâu.

Đọc:

```text
package.json
src/main.ts
src/app.module.ts
src/configs/
src/modules/
```

Sau đó quay lại trả lời tôi 5 câu, bằng lời của bạn:

```text
1. Backend này đang dùng framework + DB + ORM gì?
2. App khởi động từ đâu và AppModule load những module nào?
3. Các business module hiện tại là gì?
4. Một request Account đi qua những layer nào?
5. Theo quan sát ban đầu, đâu là 3 chỗ bạn muốn điều tra sâu nhất? Vì sao?
```

Đừng tra đáp án của tôi trước. Tôi sẽ review câu trả lời của bạn như Principal review một Lead mới vào project: chỗ nào đúng, chỗ nào đang suy diễn, chỗ nào bỏ sót, rồi mới cho bạn qua Round 2.

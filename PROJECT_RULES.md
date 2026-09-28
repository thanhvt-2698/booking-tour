# Booking Tour - Project Rules

Tài liệu này là checklist bắt buộc khi implement, review hoặc delivery code trong project.

## 1. Phân chia trách nhiệm

### Controller

- Controller chỉ nhận request, lấy dữ liệu từ decorator và gọi một method của service.
- Không viết business logic trong controller.
- Không khai báo biến cục bộ để xử lý hoặc biến đổi dữ liệu.
- Không gọi nhiều service để tự phối hợp flow.
- Không thực hiện mapping entity sang response DTO trong controller.
- Không thực hiện query database trực tiếp trong controller.
- Các decorator của NestJS như `@Body`, `@Param`, `@Query`, `@CurrentUser`, guard và pipe được phép sử dụng.

Ví dụ hợp lệ:

```ts
login(@Body() input: LoginDto): Promise<AuthResponseDto> {
  return this.authService.login(input);
}
```

### Service

- Service chịu trách nhiệm toàn bộ business logic, orchestration, mapping response và xử lý lỗi nghiệp vụ.
- Các method service cần có kiểu trả về rõ ràng.
- Không trả password hash, refresh token hash hoặc dữ liệu nhạy cảm ra response.
- Transaction chỉ dùng khi cần bảo toàn tính nhất quán dữ liệu; phải giải thích rõ lý do khi review.

### Interface và kiểu dữ liệu dùng chung

- Không khai báo `interface` bên trong file controller hoặc service.
- Đặt interface của module trong `src/<module>/interfaces/<name>.interface.ts` và import vào nơi sử dụng.
- Mỗi interface có một file riêng; tên file dùng kebab-case và hậu tố `.interface.ts`.
- DTO request/response thuộc `src/<module>/dto/`, entity thuộc `src/<module>/entities/`; không dùng interface thay thế các cấu trúc này.

### Bố trí class có hành vi

- Mỗi class có hành vi runtime (controller, service, store/repository, processor, adapter hoặc transaction store) phải nằm trong một file riêng.
- Không để class phụ `private` hoặc không `export` chung file với class chính chỉ để giảm số file; tách thành file đúng vai trò và import class đó khi cần.
- Quy tắc này không áp dụng cho DTO response nhỏ chỉ chứa cấu trúc dữ liệu, trừ khi DTO đó có logic riêng đáng kể.

## 2. Database query và dữ liệu trả về

- Mọi query đọc dữ liệu bắt buộc phải khai báo `select` rõ ràng.
- Chỉ chọn các field thực sự cần cho use case hiện tại.
- Không dùng query lấy toàn bộ entity nếu chỉ cần một vài field.
- Đặc biệt không được trả thừa `passwordHash`, token, token hash, thông tin nội bộ hoặc relation không cần thiết.
- Query phục vụ login được phép select `passwordHash` nhưng chỉ dùng nội bộ để verify password.
- Query phục vụ update chỉ select các field cần để kiểm tra và cập nhật.
- Query phục vụ response phải select đúng các field của response DTO.
- Khi thêm query mới, phải cập nhật unit test để kiểm tra options `select` nếu phù hợp.
- Không dùng `findOneBy`, `find`, `findOne` hoặc QueryBuilder mà không giới hạn field, trừ khi có lý do kỹ thuật rõ ràng.

## 3. Constants và magic values

- Không hard-code error code, timeout, rate limit, số byte, độ dài hoặc giá trị cấu hình trong business logic.
- Các giá trị dùng nhiều lần hoặc khó hiểu phải đưa vào file `*.constants.ts` phù hợp với module.
- Constant chỉ phục vụ một module phải đặt trong `src/<module>/constants/`, không khai báo rải rác trong service.
- Danh sách field dùng cho `select`, QueryBuilder hoặc response mapping phải đặt tên rõ nghĩa và gom vào constant của module tương ứng.
- Tên constant phải mô tả rõ ý nghĩa, ví dụ `POSTGRES_UNIQUE_VIOLATION_CODE`, `DEFAULT_RATE_LIMIT_WINDOW_MS`, `PASSWORD_HASH_ROUNDS`.

## 4. Validation và security

- DTO phải khai báo validation bằng `class-validator`.
- Validation global phải giữ `transform: true`, `whitelist: true` và `forbidNonWhitelisted: true`.
- Password phải có độ dài từ 12 đến 64 ký tự.
- Login phải có rate limiting hoặc brute-force protection.
- Auth response phải có anti-cache headers phù hợp.
- Logout phải revoke refresh token.
- Refresh token phải được hash trước khi lưu hoặc query.
- Không log password, access token, refresh token, token hash hoặc dữ liệu nhạy cảm.
- Không đưa secret thật vào source code hoặc commit vào Git.
- Authorization phải được kiểm tra bằng guard/decorator và business rule phải được bảo vệ ở service layer.
- Không dùng các field định danh không cần thiết trong domain/API; schema, DTO, JWT, seeder, test và tài liệu phải nhất quán với field đã chốt.

## 5. Error handling và logging

- Không throw `Error` chung chung trong business code nếu có thể dùng custom error class hoặc NestJS exception phù hợp.
- Error response bên ngoài phải generic, không làm lộ database hoặc implementation.
- Database constraint error phải được map sang exception nghiệp vụ phù hợp.
- Chỉ tạo custom exception khi có nơi xử lý rõ ràng và cần semantics riêng; lỗi hệ thống không thuộc nghiệp vụ phải được chuyển lên global exception filter.
- Global exception filter phải log lỗi hệ thống với context tĩnh/an toàn và trả response generic; không log trực tiếp path, header, query hoặc input chưa được sanitize.
- Không nuốt lỗi và không dùng empty `catch`.
- Log phải có context cần thiết nhưng không chứa dữ liệu nhạy cảm.

## 6. Test structure

- Unit test đặt cạnh source code trong `src`:

```text
src/users/users.service.ts
src/users/users.service.spec.ts
```

- E2E test đặt trong thư mục `test`:

```text
test/auth.e2e-spec.ts
test/rbac.e2e-spec.ts
```

- Mọi business logic mới phải có unit test phù hợp.
- Endpoint mới hoặc thay đổi behavior phải cập nhật e2e test.
- Test phải kiểm tra success case, validation error, authorization error và edge case quan trọng.
- Không bỏ qua test đang fail bằng cách thay đổi assertion cho implementation sai.

## 7. SunLint và code quality

Trước khi commit phải chạy:

```bash
npm run build
npm run lint -- --no-fix
npm run lint:sun
npm test -- --runInBand
```

Quy định:

- Không sử dụng `sunlint-disable`, `sunlint-disable-next-line` hoặc cơ chế bypass tương tự.
- Warning phải được sửa bằng code hoặc đưa ra review riêng với lý do kỹ thuật rõ ràng.
- Không thêm warning mới trong phạm vi task; nếu lỗi được chuyển lên global filter thì phải bảo đảm filter có logging và response generic phù hợp.
- Không chạy `npm run lint` mà không kiểm tra diff sau đó vì script có `--fix`.
- Không commit các file report tạm như `sunlint-summary.json`.

## 8. Migration và database schema

- Không bật `synchronize: true` trong môi trường production.
- Entity thay đổi phải được kiểm tra bằng migration tương ứng.
- Migration phải được generate từ entity sau khi review entity và relation.
- Không chỉnh sửa migration đã chạy trên môi trường dùng chung; tạo migration mới.
- Seeder phải idempotent và không được reset database production.

## 9. Git và delivery

- Mỗi task độc lập nên nằm trên branch riêng.
- Commit phải nhỏ, mô tả đúng một nhóm thay đổi.
- Không commit `.env`, `Plans/`, `docs/` hoặc file build/report bị ignore.
- Trước khi tạo PR cần kiểm tra:

```bash
git status
git diff --check
git diff --stat
```

- Không tự merge PR nếu chưa có yêu cầu rõ ràng.

### Mẫu mô tả Pull Request

- Mô tả PR phải ngắn gọn, dùng tiếng Anh và chỉ gồm đúng ba phần dưới đây.
- `Implement` mô tả ngắn gọn outcome của PR.
- Chỉ liệt kê endpoint mới ở `New` và endpoint thay đổi behavior/contract ở `Update`; bỏ mục không có endpoint tương ứng.
- Giữ trống phần `Swagger image` để người review tự thêm ảnh chụp.

```md
## Summary

Implement:
- <Short English description of the delivered outcome.>

## API Endpoint

Update:
- `<METHOD> /api/...` — <Short English description.>

New:
- `<METHOD> /api/...` — <Short English description.>

## Swagger image
```

## 10. Checklist review nhanh

- [ ] Controller chỉ gọi service, không chứa business logic.
- [ ] Interface không nằm trực tiếp trong controller/service; mỗi interface có file riêng trong thư mục module phù hợp.
- [ ] Service xử lý logic và mapping response.
- [ ] Tất cả query đọc có `select` giới hạn field.
- [ ] Không trả password/token/hash hoặc relation thừa.
- [ ] Không còn magic value khó hiểu.
- [ ] Constant thuộc module nằm đúng file `constants` của module.
- [ ] Validation và authorization đầy đủ.
- [ ] Lỗi nghiệp vụ được map tại service; lỗi hệ thống được xử lý bởi global exception filter.
- [ ] Log không chứa dữ liệu request chưa sanitize hoặc thông tin nhạy cảm.
- [ ] Error handling không làm lộ implementation.
- [ ] Unit test và e2e test đã cập nhật.
- [ ] `npm run build` pass.
- [ ] ESLint pass.
- [ ] SunLint pass hoặc warning đã được xử lý thật, không bypass.
- [ ] Test pass.
- [ ] Working tree và diff đã được kiểm tra trước commit/PR.

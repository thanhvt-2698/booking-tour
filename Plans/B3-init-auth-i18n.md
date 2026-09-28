# B3 — Init, login từ tutorials, i18n và migration cơ bản

## Đối chiếu hiện tại

- Init đã vào remote main qua PR #1.
- Foundation: `feature/foundation-common` / `885e567`.
- User model/service: `feature/users-profile` / `03f9ab5`.
- Login/register/refresh/logout + profile HTTP: `feature/auth-jwt` / `ab38777`.
- DataSource/CLI migration và `synchronize: false` đã có; migrations users/refresh_tokens đã có local.
- **Chưa có i18n**: không có dependency, module, resolver hoặc translations trong project. Tutorial hiện cũng chưa có i18n; cần bổ sung mới.
- Code auth cùng hướng Passport/JWT/TypeORM với tutorial; cần đối chiếu khi delivery, không khẳng định đã copy nguyên implementation.

## PR nhỏ và thứ tự

1. B3.1 Foundation: tái sử dụng delta Plan 01 trên main sau PR #1; config, validation, Swagger, pagination, error contract.
2. B3.2 Basic persistence: lấy user entity/constants/migration và service tối thiểu từ Plan 02; migration refresh_tokens đi cùng auth ở PR tiếp theo. Không kéo schema tour/booking vào B3.
3. B3.3 Auth: đối chiếu `../nestjs-tutorial/src/auth`, config JWT và user service; tái sử dụng login/JWT guard, giữ password hash an toàn. Tận dụng register/refresh/logout hiện có và test tương ứng. Profile HTTP có thể giữ cùng delta auth vì đã có code, không mở rộng thêm.
4. B3.4 i18n: nhánh đề xuất `codex/b3-i18n` (chưa tạo), dựa trên B3.3; setup `nestjs-i18n`, translations và tích hợp validation/error messages.

## i18n — phạm vi nghiệm thu

- [ ] Mặc định đề xuất vi/en, fallback en; đọc Accept-Language, ghi rõ contract. Đây là giả định để triển khai, không phải yêu cầu ngôn ngữ đã được xác nhận.
- [ ] Cấu hình translation assets được copy vào dist; chạy được dev và production build.
- [ ] Auth/validation/common errors dùng message key + params; error code/status ổn định, không dịch key JSON, enum DB hay dữ liệu user.
- [ ] Resolver/filter/adapter xử lý ngôn ngữ; không đưa logic dịch/nghiệp vụ vào controller.
- [ ] Test vi/en, locale không hỗ trợ, thiếu key, interpolation, isolation giữa request song song và production assets.
- [ ] Các feature B5 phải dùng chung convention i18n, không tiếp tục thêm message hard-code.

## Gate hoàn thành B3

- [ ] Build/lint/unit/e2e auth pass; login lấy token và private API reject token thiếu/sai.
- [ ] Migration chạy trên DB test trống và upgrade từ setup; không dùng synchronize để tạo schema.
- [ ] i18n hoạt động trong response thực tế; không chỉ thêm thư mục JSON.
- [ ] Không lộ password/token/secret; không copy nguyên `.env` tutorial.
- [ ] PR B3 đã merge và smoke test đạt; hiện chưa được tick hoàn thành chỉ vì có code local.

Sau B3 mới triển khai delivery B4. Các bug/gate auth/foundation đã ghi trong docs/delivery-checklist.md vẫn có hiệu lực.

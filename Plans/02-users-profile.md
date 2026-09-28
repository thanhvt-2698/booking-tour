# Plan 02 — Users và Profile

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Xây dựng user model và profile API để auth, booking và review có một nguồn dữ liệu user thống nhất.

## Phạm vi

- User entity/migration: id, email, password hash, role, status, bio, avatar metadata, timestamps.
- Unique email, normalize email lowercase.
- `GET /api/users/me` và `PATCH /api/users/me`.
- Mapping response không expose password hash hoặc internal fields.

## API

```text
GET   /api/users/me
PATCH /api/users/me
```

`PATCH` chỉ nhận bio, avatar URL/file reference và các field profile đã chốt; không nhận role/status/email nếu không có admin use case.

## Implementation

1. Tạo entity, migration, repository/service và response DTO.
2. Tạo unique constraint/index cho email.
3. Tạo mapper tập trung và database conflict mapping thành `409`.
4. Tạo current-user contract để auth/guard dùng ở các plan sau.

## Test và nghiệm thu

- Email duplicate bị từ chối.
- Update một phần không làm mất dữ liệu cũ.
- Password hash không xuất hiện trong response.
- User chỉ sửa được chính profile của mình.
- Migration chạy được trên database test.

## Phụ thuộc/loại trừ

Phụ thuộc Plan 01. Chưa làm register/login, social login hoặc admin user management.

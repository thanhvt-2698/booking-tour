# Plan 03 — Register/Login với JWT

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Hoàn thiện password authentication dựa trên kiến thức tutorial và tạo guard nền tảng cho private endpoints.

## API

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

Register/login trả access token và refresh token theo response DTO thống nhất. Refresh token phải được hash khi lưu và rotate khi refresh.

## Implementation

1. Tạo register/login DTO, bcrypt hashing và generic credential error.
2. Tạo JWT strategy, guard và `@CurrentUser()` decorator.
3. Tạo refresh-token entity/migration với expiry, revoke time và token family nếu cần.
4. Implement refresh rotation; logout revoke refresh token hiện tại.
5. Không đưa password, password hash hoặc refresh token raw vào log/response.

## Test và nghiệm thu

- Register/login thành công và password được hash.
- Duplicate email trả `409`.
- Sai credentials trả `401` với message generic.
- Private route reject thiếu/sai JWT.
- Refresh token rotate; token cũ không dùng lại được.
- Logout revoke refresh token.

## Phụ thuộc/loại trừ

Phụ thuộc Plan 02. Chưa làm OAuth/social login, email verification hoặc forgot-password.

# Plan 14 — Social Login

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Thêm đăng nhập Google OAuth mà không phá vỡ password/JWT flow hiện tại.

## API

```text
GET /api/auth/google
GET /api/auth/google/callback
```

## Implementation

- Tạo OAuth strategy, allow-list redirect URI theo environment.
- Tìm hoặc tạo user bằng provider + provider account id.
- Không overwrite email/profile đã có nếu chưa có linking policy.
- Phát cùng access/refresh token contract với login password.
- Chống account collision và callback CSRF/state theo thư viện OAuth.

## Test và nghiệm thu

- Unit test profile mapping và account linking.
- Reject callback thiếu/invalid state.
- Không tạo duplicate user khi callback lặp.
- Không expose provider token.
- E2E dùng mocked provider, không phụ thuộc Google thật.

## Phụ thuộc/loại trừ

Phụ thuộc Plan 03. Chỉ triển khai provider đầu tiên (khuyến nghị Google); Facebook/Apple để plan riêng.

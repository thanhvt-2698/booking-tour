# Plan 01 — Foundation và Common Infrastructure

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Biến skeleton hiện tại thành nền tảng dùng chung cho tất cả module, không chứa business logic tour/booking.

## Phạm vi

- Validate environment khi app khởi động.
- Chuẩn hóa API prefix, Swagger, error response.
- Global exception filter cho validation/domain/database error.
- Request ID và structured logging tối thiểu.
- Common pagination DTO/helper.
- Test module bootstrap và health endpoint.

## Implementation

1. Tạo `ConfigModule` với schema cho database, JWT, Redis, mail và upload limits.
2. Tạo `common/filters`, `common/interceptors`, `common/decorators`, `common/pipes`.
3. Chuẩn hóa lỗi `400/401/403/404/409/422/429/500`.
4. Thêm `requestId` vào response header và log context.
5. Tách hằng số port/rate-limit/maximum page size khỏi module.
6. Cập nhật README và Swagger metadata.

## Test và nghiệm thu

- App không boot nếu thiếu biến môi trường bắt buộc ở production.
- Unknown body fields bị reject.
- Validation error có format thống nhất.
- Health endpoint và Swagger hoạt động.
- Pagination reject limit âm, offset âm và limit vượt max.

## Không làm trong PR này

- Không tạo entity domain.
- Không thêm auth, role hoặc business endpoint.
- Không thêm logger/external monitoring phức tạp.

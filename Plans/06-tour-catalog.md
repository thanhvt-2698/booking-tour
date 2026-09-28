# Plan 06 — Tour Catalog CRUD và Public Detail

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Quản lý thông tin tour độc lập với lịch khởi hành và booking.

## API

```text
GET    /api/tours
GET    /api/tours/:id
POST   /api/admin/tours
GET    /api/admin/tours/:id
PATCH  /api/admin/tours/:id
DELETE /api/admin/tours/:id
```

## Data model

`Tour`: id, code/slug, title, description, base price, category id, status (`DRAFT`, `PUBLISHED`, `ARCHIVED`), timestamps.

## Implementation

1. Entity/migration/index cho slug, status và category.
2. Admin CRUD; public chỉ đọc `PUBLISHED`.
3. DTO không nhận author/system fields từ client.
4. Detail query dùng select/join có kiểm soát, chưa join booking/review nặng.
5. Pagination và stable ordering `createdAt DESC, id DESC`.

## Test và nghiệm thu

- Guest chỉ thấy tour published.
- Admin tạo/sửa/archive tour.
- Slug unique và không bị query injection.
- Tour không tồn tại trả `404`.
- E2E kiểm tra ownership không áp dụng nhầm cho admin resource.

## Phụ thuộc/loại trừ

Phụ thuộc Plans 01, 04, 05. Chưa làm departure, file ảnh, booking hoặc review.

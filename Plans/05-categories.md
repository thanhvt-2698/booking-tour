# Plan 05 — Category CRUD

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Hoàn thiện category độc lập trước khi xây tour catalog.

## API

```text
GET    /api/categories
GET    /api/categories/:id
POST   /api/admin/categories
PATCH  /api/admin/categories/:id
DELETE /api/admin/categories/:id
```

## Implementation

- Category entity/migration: name, slug, description, status, timestamps.
- Unique name/slug và normalize slug.
- Public list chỉ trả category active.
- Admin CRUD có validation, pagination nếu cần và soft-delete/archive policy.
- Không cho xóa category đang được tour active sử dụng; trả `409` hoặc yêu cầu archive.

## Test và nghiệm thu

- Public không thấy category inactive.
- Duplicate name/slug bị reject.
- User không gọi được admin CRUD.
- Không xóa category đang được tham chiếu sai policy.
- Unit test slug normalization và e2e CRUD.

## Phụ thuộc/loại trừ

Phụ thuộc Plans 01 và 04. Không tạo tour trong PR này.

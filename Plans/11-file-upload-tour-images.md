# Plan 11 — File Upload và Tour Images

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Đưa xử lý file thành một abstraction riêng, sau đó tích hợp ảnh tour mà không làm phình tour CRUD PR.

## Phạm vi

- Multipart upload với giới hạn size/count.
- Validate MIME type, extension và filename.
- Storage interface; local disk adapter cho development.
- File metadata entity và tour image relation.
- Admin upload/list/delete ảnh của tour.

## API

```text
POST   /api/admin/tours/:tourId/images
GET    /api/tours/:tourId/images
DELETE /api/admin/tours/:tourId/images/:imageId
```

## Test và nghiệm thu

- Reject file rỗng, quá size, MIME không cho phép, filename/path traversal.
- Storage key không dùng trực tiếp tên file client.
- Delete chỉ xóa metadata/file đúng owner/resource.
- Cleanup file nếu database transaction thất bại.
- E2E multipart upload thành công và các lỗi chính.

## Phụ thuộc/loại trừ

Phụ thuộc Plans 04 và 06. Chưa làm S3/cloud adapter, image processing hoặc CDN.

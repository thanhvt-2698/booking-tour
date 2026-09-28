# Plan 09 — Admin Booking Management

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Hoàn thiện toàn bộ quản lý yêu cầu đặt tour phía admin trong một PR có thể review được. Chưa phụ thuộc email provider.

## API

```text
GET   /api/admin/bookings
GET   /api/admin/bookings/:id
PATCH /api/admin/bookings/:id/approve
PATCH /api/admin/bookings/:id/reject
```

## Implementation

- Admin filters theo status, date, user, tour và pagination; list/detail dùng select field cần thiết.
- State machine chỉ cho `PENDING -> APPROVED/REJECTED`; approve/reject idempotent hoặc trả conflict rõ ràng.
- Reject release capacity trong transaction và ghi `booking_status_histories` gồm actor, from/to, reason, createdAt.
- Publish application event `booking.status.changed`; event payload không chứa secret.

## Test và nghiệm thu

- User không gọi được admin endpoint.
- Approve/reject đúng transition và audit record.
- Booking không thể approve sau khi đã cancel/reject.
- Reject trả lại capacity đúng một lần.
- Event được phát sau commit, không phát khi transaction rollback.

## Phụ thuộc/loại trừ

Phụ thuộc Plans 04 và 08. Email xử lý ở Plan 12 sau Plan 09, scheduler ở Plan 13.

# Plan 08 — User Booking Flow

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Cho phép user tạo và quản lý booking của mình với transaction chống overbooking.

Trạng thái 25/09/2026: toàn bộ lát cắt 08 nằm tại [PR #9](https://github.com/thanhvt-2698/booking-tour/pull/9), nhánh `feature/user-booking-management`, commit `ac22df3`; đã rebase lên `main` sau PR #8 và đang chờ review.

## API

```text
POST  /api/bookings
GET   /api/bookings/me
GET   /api/bookings/:id
PATCH /api/bookings/:id/cancel
```

## Data model

`Booking`: booking code, user id, departure id, quantity, unit price snapshot, total amount, status (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), timestamps.

## Implementation

1. Validate departure open, quantity và user authenticated.
2. Trong transaction lock departure, kiểm tra `capacity - bookedSeats`, tăng booked seats và tạo booking.
3. Lưu giá snapshot, không đọc lại base price khi hiển thị lịch sử.
4. Query booking theo cả `id` và `userId` để bảo vệ ownership.
5. User chỉ cancel booking `PENDING`; hoàn capacity trong transaction.
6. Tạo status history hoặc domain event contract, chưa nối SMTP.

Lát cắt 08 đã có transaction lock, kiểm tra lịch `OPEN`, chưa bắt đầu/hết hạn, snapshot giá chính xác, idempotency key theo payload, ownership, hủy `PENDING`, hoàn ghế đúng một lần và history hủy.

## Test và nghiệm thu

- Đặt thành công và tạo đúng total snapshot.
- Concurrent/over-capacity không tạo booking vượt capacity.
- User không xem/hủy booking của user khác.
- Cancel pending idempotent theo policy; cancel approved trả `409`.
- Tour/departure invalid trả `404`/`409` phù hợp.

## Phụ thuộc/loại trừ

Phụ thuộc Plans 03 và 07. Chưa có admin approve/reject và email processor.

# Plan 13 — Scheduler và Reminder Jobs

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Đưa các tác vụ định kỳ ra khỏi request path, có thể chạy lại an toàn và quan sát được.

## Jobs đề xuất

- Đóng/cập nhật departure đã qua hoặc hết hạn.
- Enqueue reminder trước 24 giờ cho booking approved.
- Xử lý booking pending quá thời hạn theo policy.

## Implementation

1. Dùng `@nestjs/schedule` cho cron trigger.
2. Cron gọi service/use case; không đặt business logic trực tiếp trong decorator.
3. Job có idempotency key theo booking/departure/ngày.
4. Batch theo limit để tránh query và queue burst.
5. Có command chạy thủ công trong development/debug.

## Test và nghiệm thu

- Unit test use case với fixed clock.
- Không enqueue duplicate reminder khi cron chạy lại.
- Không sửa departure/booking ngoài allowed state.
- E2E hoặc integration test với fake queue.
- Log số record scanned/updated/enqueued, không log dữ liệu nhạy cảm.

## Phụ thuộc/loại trừ

Phụ thuộc Plans 07, 08 và 12. Chưa làm distributed lock nếu chỉ chạy một worker; ghi rõ giới hạn này.

# Plan 12 — Email Queue với Bull và Redis

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Gửi email bất đồng bộ khi booking được approve/reject mà không làm chậm HTTP request.

## Phạm vi

- `@nestjs/bull` queue `booking-notification`.
- Mail service/SMTP adapter và template tối thiểu.
- Processor, retry/backoff, failed-job logging và job-id ổn định để giảm gửi trùng.
- Consume event từ Plan 09.

## Job contract

```text
booking-status-notification {
  bookingId,
  recipientUserId,
  status: APPROVED | REJECTED,
  reason
}
```

Job chỉ truyền identifier/snapshot cần thiết, không truyền password/token.

## Test và nghiệm thu

- Approve/reject enqueue đúng job sau commit.
- SMTP lỗi được retry theo backoff, không throw ngược về request đã thành công.
- Job duplicate có `jobId`/idempotency policy.
- Processor không leak SMTP credentials hoặc dữ liệu nhạy cảm.
- Unit test processor bằng fake mailer; integration test queue bằng Redis local.

## Phụ thuộc/loại trừ

Phụ thuộc Plan 09 và Redis. Chưa làm scheduled reminder; Plan 13 dùng lại queue này.

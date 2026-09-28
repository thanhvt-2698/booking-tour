# Plan 16 — Hardening, Performance và Observability

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Rà soát hệ thống sau khi core flow chạy được, tập trung vào performance, security và debug production-like.

## Phạm vi

- Query review: indexes, select fields, relation loading, N+1.
- Benchmark tour search và booking transaction với dataset seeded.
- Rate limit riêng cho login/register/upload.
- Request ID, structured log, queue metrics và failed-job inspection.
- Security headers, CORS policy, payload/file limits, generic errors.
- Debug guide và troubleshooting commands.

## Implementation

1. Dùng `EXPLAIN ANALYZE` cho các query chính trước khi thêm index.
2. Đo p95 latency và query count cho list/detail/booking.
3. Kiểm tra transaction isolation và deadlock retry policy.
4. Thêm cleanup/retention cho refresh token, status history, failed jobs.
5. Cập nhật Swagger/error docs và production checklist.

## Test và nghiệm thu

- Regression unit/e2e toàn bộ core flow.
- Load/smoke test tối thiểu cho search và booking capacity.
- Không leak stack trace/secrets ở production mode.
- Log đủ request/job context để debug nhưng không chứa PII không cần thiết.
- Build, lint, coverage threshold và migration review pass.

## Phụ thuộc/loại trừ

Chỉ thực hiện sau các plan core. Không tối ưu theo cảm tính; mọi thay đổi index/cache phải có benchmark hoặc query evidence.

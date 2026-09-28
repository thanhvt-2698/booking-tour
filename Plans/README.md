# Implementation Plans — B3 → B4 → B5

Cập nhật 25/09/2026 theo delivery thực tế: B3 init/login/i18n/migrate cơ bản → B4 entities/relations/migrations → B5 chức năng theo ưu tiên. PR #2, #4–#8 đã merge; PR #9 User Booking + Cancellation đang chờ review.

## So sánh với yêu cầu

| Bước | Đã có | Thiếu / cần thay đổi | Kết luận |
| --- | --- | --- | --- |
| B3 | Init đã merge PR #1; foundation, i18n, user persistence, JWT auth/profile đã có | PR #4 cần review/merge và smoke test | Đã code; auth/profile chờ delivery |
| B4 | 10 entities, relations, migrations và metadata đã merge trong PR #2 | Migration incremental chỉ thêm khi feature phát sinh schema mới | Đã delivery |
| B5 | 15 nhánh implementation tích lũy, phần lớn API đã có code | Thiếu merge, QA/security gate và các gap trong delivery checklist | Tái sử dụng code theo ưu tiên |

## Plan điều phối có hiệu lực

1. [B3 — Init/auth/i18n/basic migrations](B3-init-auth-i18n.md): nền tảng đã merge; auth/profile nằm trong PR #4.
2. [B4 — Entities/relations/migrations](B4-entities-relations-migrations.md): đã merge trong PR #2; map đủ 13 quan hệ.
3. [B5 — Priority delivery](B5-priority-delivery.md): hoàn thành luồng guest tour → user booking → admin decision → email → user review trước; các tính năng còn lại làm sau.

Trạng thái delivery và nguồn branch/commit: [checklist](../docs/delivery-checklist.md). 15 nhánh cũ vẫn được giữ nguyên, chưa thực hiện tổ chức lại Git.

## Cách đọc 16 plan chi tiết hiện có

Các file 01–16 vẫn giữ đặc tả nghiệp vụ/test. B3/B4/B5 quyết định thứ tự, tách PR và phạm vi schema; nếu nội dung cũ khác, áp dụng plan B mới.

| Plan cũ | Phân bổ mới |
| --- | --- |
| 01 Foundation | B3.1; i18n bổ sung ở B3.4 |
| 02 Users/profile | Persistence cơ bản ở giai đoạn nền tảng; profile HTTP đã có trong Authentication/Profile |
| 03 Auth/JWT | Authentication/Profile |
| 04 RBAC | RBAC + Admin Users |
| 05 Categories | Category Management |
| 06 Tour catalog | Tour Catalog |
| 07 Departures/search | Departure Management + Date Search |
| 08 User bookings | User Booking + Cancellation |
| 09 Admin booking | Admin Booking Management |
| 10 Reviews | User Review Submission (10a) + Public Review/Moderation (10b) |
| 11 Files/images | Tour Image Upload |
| 12 Email | Booking Email Notifications |
| 13 Scheduler | Scheduler + Reminders |
| 14 Social login | Google Social Login |
| 15 Seeder CLI | Domain Seeder + Console |
| 16 Hardening | Security, Performance, CI và Observability |

## Quy tắc PR và nghiệm thu

- Một PR một outcome, độc lập tối đa trong giới hạn phụ thuộc thật; B3+B4 là ngoại lệ đã được gộp và merge ở PR #2.
- B4 sở hữu schema có sẵn, B5 chỉ tái sử dụng; migration mới cho yêu cầu phát sinh đi cùng feature tương ứng.
- Không sửa/xóa migration đã chạy ở DB dùng chung; không tạo lại users/refresh_tokens đã vào B3.
- Controllers chỉ tiếp nhận request và gọi service; nghiệp vụ, ownership, transaction nằm ở service.
- Mỗi PR có unit/e2e liên quan, i18n convention, build/lint/format-check và kiểm tra migration trên DB test cô lập.
- Không push, rewrite lịch sử hoặc reset DB chỉ để thay đổi plan.
- Plans/ và docs/ tiếp tục local/gitignored; chưa commit các tài liệu này.

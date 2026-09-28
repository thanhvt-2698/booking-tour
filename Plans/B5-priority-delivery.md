# B5 — Implement/delivery theo ưu tiên

## Điều kiện vào B5

B3+B4 đã merge trong PR #2; PR #4 `authentication` và PR #5 `Category Management` đã merge. Phần feature đã implement local là nguồn tái sử dụng, không cần viết lại từ đầu. Chỉ đánh dấu delivery hoàn tất sau merge và smoke test.

## Backlog ưu tiên bắt buộc

Chỉ triển khai các mục dưới đây trước khi chuyển sang upload ảnh, seeder domain, scheduler, social login và hardening độc lập. Thứ tự delivery bảo đảm hoàn thành được một luồng tour end-to-end: guest xem/tìm tour → user đăng nhập và đặt/xem/hủy booking → admin xem, duyệt hoặc từ chối booking → system gửi email; user review được mở sau khi đã có booking `APPROVED`.

Các API public tour không cần endpoint riêng cho user: user đã đăng nhập dùng cùng `GET /api/tours` và `GET /api/tours/:tourId` với guest.

| Yêu cầu bắt buộc | Delivery tương ứng | Trạng thái 25/09/2026 |
| --- | --- | --- |
| Guest xem danh sách và chi tiết tour | Tour Catalog | Đã merge PR #6 |
| User đăng nhập/đăng xuất | Authentication | Đã merge PR #4 |
| User xem và tìm kiếm tour | Tour Catalog + Tour Date Search | Đã merge PR #6 + PR #8 |
| User đặt, xem và hủy booking pending | User Booking + Cancellation | PR #9 đang review |
| Admin CRUD tour | Tour Catalog | Đã merge PR #6 |
| Admin quản lý yêu cầu đặt tour | Admin Booking Management (09) | Đã chuẩn bị cục bộ trên `feature/admin-booking-management`; chờ PR #9 merge để rebase và mở PR |
| System email approve/reject | Booking Email Notifications | Làm sau Admin Booking Management |
| User thêm review | User Review Submission (10a) | Làm sau Admin Booking Management vì cần booking `APPROVED` |

| Ưu tiên / thứ tự | Outcome / Plan cũ | Code nguồn hiện có | Phụ thuộc B5 | Trạng thái/gap trước delivery |
| --- | --- | --- | --- | --- |
| Guest tour list/detail | Public tour APIs / 06 | PR #6 | Category Management | Đã merge tại `05a2c34`: `GET /api/tours`, `GET /api/tours/:tourId` |
| User login/logout | Authentication / 03 | PR #4 | Foundation | Đã merge tại `7ba3db6` |
| Tour search | Public search / 06, 07b | PR #6 + PR #8 | Departure Schedule Management | Đã merge tại `05a2c34` và `0b0e908`: keyword/category/status và khoảng ngày khởi hành |
| Admin tour CRUD | Tour catalog / 06 | PR #6 | RBAC + Admin Users | Đã merge tại `05a2c34` |
| User Booking + Cancellation | User booking create/list/detail/cancel / 08 | `feature/user-booking-management` | Departure Schedule Management | [PR #9 đang chờ review](https://github.com/thanhvt-2698/booking-tour/pull/9), commit `ac22df3`; transaction lock, idempotency, ownership, cancellation release/history, Swagger, unit/e2e |
| Admin Booking Management | Admin booking list/detail/approve/reject / 09 | `feature/admin-booking-management` | User Booking + Cancellation; RBAC + Admin Users | Đã chuẩn bị cục bộ từ `main@0b0e908`: list/detail, filter/pagination, transition `PENDING`, history, reject release seat và event sau commit. Chờ PR #9 merge để rebase, kiểm thử tích hợp và mở PR |
| Booking Email Notifications | Mail approve/reject / 12 | feature/booking-notifications | Admin Booking Management | Bull + Redis + SMTP, retry/backoff và integration test cho cả approve/reject |
| User Review Submission | Create own review / 10a | feature/reviews | Admin Booking Management; Tour Catalog | `POST /api/tours/:tourId/reviews`; chỉ booking `APPROVED` đã kết thúc, one review/user/tour |
| Authentication/Profile bổ sung | Profile bổ sung / 02 | PR #4, branch `authentication` | Nền tảng đã merge | Đã có trong PR #4; chỉ bổ sung nếu review phát hiện gap |
| Public Review Read + Moderation | Review read/moderation / 10b | feature/reviews | User Review Submission; RBAC + Admin Users | Làm sau core: public list, owner update/delete và admin moderation |
| Tour Image Upload | Upload/serve ảnh / 11 | feature/tour-images | Tour Catalog; RBAC + Admin Users | Làm sau core: có code; thiếu serve URL và test file lỗi |
| Domain Seeder + Console | Domain seeder/console / 15 | feature/seeder-cli | Nền tảng đã merge | Initial admin seeder đã có PR #4; domain fixtures, console và reset guard còn thiếu |
| Scheduler + Reminders | Scheduler / 13 | feature/scheduler-reminders | Departure Schedule Management; Admin Booking Management; Booking Email Notifications | Có một phần; CLOSED→COMPLETED, dedup/batch; pending expiry chưa có, cần policy |
| Security, Performance, CI và Observability | Hardening/debug/performance / 16 | Rải rác, chưa nhánh riêng | Core phù hợp | Thiếu CI, coverage, benchmark, runbook/metrics |
| Google Social Login | Google login / 14 | feature/social-login | Nền tảng đã merge | Có code; cần linking verified-email policy, session store và mocked OAuth e2e |

Không mở delivery riêng cho seeder, CI/test harness hoặc các phần hậu core trước khi luồng bắt buộc hoàn tất. Chỉ bổ sung fixture/test tối thiểu ngay trong PR core khi cần để nghiệm thu; quality/security gate vẫn áp dụng ở từng PR.

## Tổ chức lại nhánh delivery

- [ ] Giữ nguyên 15 nhánh local cũ làm nguồn tham khảo; chưa push/rebase/cherry-pick trong lần sửa plan.
- [ ] Tạo nhánh delivery mới từ base đã merge thích hợp; dùng tên branch ngắn, mô tả đúng outcome.
- [ ] B3 tái sử dụng delta foundation/users/auth; B4 lấy **chỉ entity/constants/migration và metadata tests** từ các commit feature.
- [ ] Khi làm B5, loại phần schema đã vào B4 khỏi delta; không cherry-pick nguyên commit cũ vì sẽ kéo schema trùng và thay app.module ngoài phạm vi.
- [ ] Review diff với base: chỉ controller/service/DTO/module/tests/i18n của outcome đang delivery. Nếu cần schema mới ngoài B4, thêm migration incremental trong chính PR đó.
- [ ] AppModule/package.json là điểm conflict chung: thống nhất integration commit/merge thứ tự; không hứa các nhánh song song sẽ không conflict.
- [x] PR #5 Category Management, PR #6 Tour Catalog và PR #7 Departure Schedule Management đã merge; PR #7 merge SHA `c938b33`.
- [x] Đã tách Tour Date Search sang một PR riêng (07b); PR #8 đã merge tại `0b0e908`.
- [x] Đã mở PR #9 User Booking + Cancellation trên base `main` mới nhất; chưa merge.
- [ ] Không làm Review Moderation, image upload, seeder domain, scheduler, social login hoặc hardening trước khi hoàn thành toàn bộ dòng ưu tiên bắt buộc.
- [ ] Giữ một PR một outcome; cố gắng không quá khoảng 400–600 dòng logic review (không là giới hạn cứng). Tách PR test/setup khi hợp lý, không cắt mất tính chạy được.

## DoD mỗi outcome

- [ ] Thin controller, service sở hữu business rule và transaction/ownership.
- [ ] Unit + e2e happy/error/concurrency liên quan; build/lint/format-check pass ở chính branch.
- [ ] i18n vi/en theo B3, response/error contract không thay theo locale.
- [ ] Schema dùng B4, không duplicate migrations; test upgrade nếu có schema mới.
- [ ] Swagger và config example không chứa secret; security/performance được kiểm tra theo mức rủi ro.
- [ ] Merge, smoke test và ghi trạng thái vào docs/delivery-checklist.md; code local chưa tính delivery.

# Booking Tour — Delivery checklist

Cập nhật 28/09/2026: **PR #2 Foundation, PR #4 Authentication/RBAC, PR #5 Category Management, PR #6 Tour Catalog, PR #7 Departure Schedule Management, PR #8 Tour Date Search, PR #9 User Booking + Cancellation và PR #10 Admin Booking Management đã merge.**

Tài liệu này là nguồn quyết định về **ranh giới PR**. Các file [B3](../Plans/B3-init-auth-i18n.md), [B4](../Plans/B4-entities-relations-migrations.md), [B5](../Plans/B5-priority-delivery.md) vẫn dùng để tra cứu yêu cầu và test, nhưng đề xuất cũ “4 PR B3 + 3 PR B4” không còn áp dụng. Các phần đó trở thành nhóm commit/checklist trong **một PR Foundation**, không phải các PR riêng.

## 1. Trạng thái và quy ước

- [x] PR #1 — Init project đã merge vào remote main: `3b7ac0f`.
- [x] Có 15 nhánh feature local nguồn đã commit; giữ nguyên để tái sử dụng. Đã checkout nhánh delivery `setup-project-and-entities-relation-migrate`.
- [x] PR gộp B3+B4 đã merge: [PR #2](https://github.com/thanhvt-2698/booking-tour/pull/2), merge vào `main` tại `10aeffe`.
- [x] PR authentication/profile + RBAC/admin users + initial admin seeder đã merge: [PR #4](https://github.com/thanhvt-2698/booking-tour/pull/4), merge SHA `7ba3db6`.
- [x] PR Category Management đã merge: [PR #5](https://github.com/thanhvt-2698/booking-tour/pull/5), merge SHA `1ab50c0`.
- [x] PR Tour Catalog đã merge: [PR #6](https://github.com/thanhvt-2698/booking-tour/pull/6), merge SHA `05a2c34`.
- [x] PR Departure Schedule Management đã merge: [PR #7](https://github.com/thanhvt-2698/booking-tour/pull/7), merge SHA `c938b33`; branch head `2368e24`.
- [x] PR Tour Date Search đã merge: [PR #8](https://github.com/thanhvt-2698/booking-tour/pull/8), merge SHA `0b0e908`.
- [x] PR User Booking + Cancellation đã merge: [PR #9](https://github.com/thanhvt-2698/booking-tour/pull/9), merge SHA `2428c58`.
- [x] PR Admin Booking Management đã merge: [PR #10](https://github.com/thanhvt-2698/booking-tour/pull/10), merge SHA `5f2fb58`.
- [x] PR B5 đầu tiên (Category Management) đã merge; các PR B5 còn lại vẫn chờ triển khai và nghiệm thu.
- [x] PR #9 đã rebase lên `origin/main@0b0e908` sau khi PR #8 merge.
- [ ] Hardening: có một số nền tảng nhưng chưa có bộ CI/performance/observability hoàn chỉnh.

Đã fetch và đối chiếu origin/main ngày 28/09/2026: `5f2fb58`. PR #2, PR #4 đến PR #10 đã merge.

Các mục delivery dùng tên chức năng thay vì mã kỹ thuật. Checkbox chỉ tick khi đã merge và smoke test đạt; có code, test pass, merge và deploy production là các trạng thái khác nhau.

Các nhánh cũ nối tiếp nhau. Dùng chúng làm **nguồn code**, không merge nguyên chuỗi và không mở PR từ nhánh cuối lên main.

## 2. Foundation — Một PR duy nhất gộp B3 + B4

- Trạng thái: **đã merge và là nền tảng hiện tại của main**.
- Tên PR đề xuất: `feat: foundation, authentication, i18n and database schema`.
- Nhánh: `setup-project-and-entities-relation-migrate` — đã rebase main, commit và push. Subagent Carver (gpt-5.6-luna, xhigh) hoàn tất entities/relations/migrations; đã nghiệm thu tích hợp.
- Base: main đã chứa PR #1; không đưa lại commit init vào phạm vi thay đổi.
- Nguồn: foundation/users/auth, cộng **chỉ entity/constants/migrations** từ các nhánh domain trong mục 6.

### Phạm vi B3 trong Foundation

- [x] Tái sử dụng foundation/common: config validation, API prefix, Swagger, validation/error contract, request ID và pagination.
- [x] Authentication/Profile: đã được delivery ở PR #4 sau khi Foundation merge; branch hiện tại là `authentication`.
- [x] Bổ sung i18n — **đã có code**: ngôn ngữ đề xuất vi/en, fallback en, Accept-Language và asset copy khi build.
- [x] Chuẩn hóa message key/params cho common validation/errors; auth messages đi cùng PR authentication/profile.
- [x] Test ngôn ngữ, fallback, request isolation và dist assets; không đưa logic dịch/nghiệp vụ vào controller.
- [x] Basic migration/DataSource/CLI hoạt động, `synchronize: false`; không copy secret từ tutorial.

### Phạm vi B4 trong cùng Foundation

- [x] Tích hợp 10 entity: users, refresh_tokens, social_accounts, categories, tours, tour_departures, tour_images, bookings, booking_status_histories, reviews.
- [x] Tái sử dụng 9 migrations hiện có, giữ timestamp và thứ tự FK; không tạo lại migration users/refresh_tokens đã lấy ở phần B3.
- [x] Bổ sung 13 ORM relations theo [mapping B4](../Plans/B4-entities-relations-migrations.md): ManyToOne/OneToMany/JoinColumn khớp các FK SQL.
- [x] Giữ scalar FK và đúng tên cột; không tạo thêm cột quan hệ trùng, không bật eager/cascade write mặc định.
- [x] Đồng bộ enumName, defaults, nullable, unique/index/check constraint và ON DELETE giữa metadata với SQL.
- [x] Test metadata, relation joins/inverse, nullable actor và FK constraints trên DB test.
- [x] Migration chạy được từ DB trống và từ base PR #1; kiểm tra schema drift bằng thao tác read-only.
- [x] Không sửa migration đã chạy ở DB dùng chung; nếu cần thay schema thật thì thêm migration incremental, không reset DB để né lỗi.

### Không đưa vào Foundation

- CRUD category/tour/departure; booking/review workflows.
- Upload/storage, seeder domain, queue/SMTP, scheduler, OAuth endpoints/provider/session setup.
- Schema social_accounts có trong Foundation nhưng Google login chỉ bật ở Google Social Login.
- Không bắt production bootstrap cung cấp Google/SMTP credentials cho các tính năng chưa delivery. Chỉ lấy schema, không kéo config/provider của nhánh social/mail.
- Không kéo toàn bộ AppModule/dependencies của HEAD tích lũy; chỉ wire nền tảng/auth và entity discovery cần cho Foundation.

### Cách review một PR nền tảng lớn hơn bình thường

Một PR theo yêu cầu, commit tích hợp `5f92a20`. Review theo nhóm: foundation → users/auth → i18n → catalog schema → booking/review schema → identity relations/metadata → integration tests.

- [x] Build/lint/format-check pass; test Foundation đã đạt yêu cầu.
- [x] Foundation + i18n + 9 migrations up/down/up chạy trên DB test cô lập; schema drift = 0. Compiled production bootstrap pass, không cần Redis/SMTP/OAuth.
- [ ] Dependency remediation trước production: audit còn dependency cần đánh giá; không tự nâng major trong Foundation.
- [x] Reviewer đã đối chiếu schema, migration và boot config trước merge.
- [x] Foundation merge + smoke test đạt. PR URL: https://github.com/thanhvt-2698/booking-tour/pull/2 | Merge SHA: `10aeffe` | Ngày tạo: 22/09/2026

## 3. B5 — PR nhỏ theo cụm tính năng

Các branch delivery còn lại dưới đây là **đề xuất cho các PR tiếp theo**. “Có code” chỉ nói nguồn nhánh cũ; các gate ở mục 4 vẫn phải xử lý. Mỗi PR mang API/service/DTO/tests/i18n của cụm đó, **không lặp entity/migration đã delivery trong Foundation**.

| Done | Mã / ưu tiên | Cụm tính năng / nhánh đề xuất | Code nguồn | Phụ thuộc phải có | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| [x] | RBAC + Admin Users | PR #4, branch `authentication` | đã có trong PR #4 | Foundation | Đã merge tại `7ba3db6`; code và test đã có |
| [x] | Category Management | PR #5, branch `feature/category-management` | feature/categories | RBAC + Admin Users | Đã merge tại `1ab50c0`; đã có test visibility/conflict/authorization |
| [x] | Tour Catalog | PR #6, `feature/tour-catalog-management` | feature/tour-catalog | Category Management | Đã merge tại `05a2c34`; public list/detail, admin CRUD/archive, visibility, i18n, Swagger và tests |
| [x] | Departure Schedule Management | `feature/tour-departure-management` | feature/tour-departures | Tour Catalog | [PR #7 đã merge](https://github.com/thanhvt-2698/booking-tour/pull/7), merge SHA `c938b33` |
| [x] | Tour Date Search | `feature/tour-date-search` | feature/tour-departures | Departure Schedule Management | [PR #8 đã merge](https://github.com/thanhvt-2698/booking-tour/pull/8) tại `0b0e908`; cặp ngày `YYYY-MM-DD`, tính cả ngày bắt đầu/kết thúc, lọc lịch khả dụng theo overlap |
| [x] | User Booking + Cancellation | `feature/user-booking-management` | Local branch mới từ `main` | Departure Schedule Management | [PR #9 đã merge](https://github.com/thanhvt-2698/booking-tour/pull/9) tại `2428c58`; create/list/detail/cancel, transaction lock, idempotency, ownership, hoàn ghế/history, Swagger, unit/e2e |
| [x] | Admin Booking Management | `feature/admin-booking-management` | Local branch từ `main@0b0e908` | User Booking + Cancellation; RBAC + Admin Users | [PR #10 đã merge](https://github.com/thanhvt-2698/booking-tour/pull/10) tại `5f2fb58`; list/detail, filter/pagination, approve/reject, history, reject release seat và event sau commit |
| [ ] | Booking Email Notifications | `feature/booking-email-notifications` | Local branch từ `main@5f2fb58` | Admin Booking Management | Đang triển khai: Bull + Redis + SMTP, retry/backoff, job idempotency và integration approve/reject |
| [ ] | User Review Submission | `user-review-submission` | feature/reviews | Admin Booking Management; Tour Catalog | Tạo review cho booking `APPROVED` đã kết thúc; test eligibility/ownership |
| [ ] | Public Review Read + Moderation | `review-moderation` | feature/reviews | User Review Submission; RBAC + Admin Users | Làm sau core: public list, owner update/delete và admin moderation |
| [ ] | Tour Image Upload | `tour-image-upload` | feature/tour-images | Tour Catalog; RBAC + Admin Users | Upload có; serve URL chưa có |
| [ ] | Domain Seeder + Console | `domain-seeder` | feature/seeder-cli | Foundation | Initial admin seeder đã có ở PR #4; domain fixtures và console còn thiếu |
| [ ] | Scheduler + Reminders | `scheduler-reminders` | feature/scheduler-reminders | Departure Management + Date Search; Admin Booking Management; Booking Email Notifications | Có một phần; state/batch/dedup thiếu |
| [ ] | Google Social Login | `google-social-login` | feature/social-login | Foundation | Có code; verified-email linking/session/e2e thiếu |
| [ ] | CI + Test Harness | `ci-test-harness` | Scripts/test hiện có, chưa có CI pipeline | Foundation | Chưa có cụm triển khai hoàn chỉnh |
| [ ] | Security Hardening | `security-hardening` | Nền tảng rải rác | Các feature đã merge | Chưa đầy đủ |
| [ ] | Performance Baseline | `performance-baseline` | Index/query hiện có | Departure Management + Date Search; User Booking + Cancellation | Chưa có benchmark/EXPLAIN baseline |
| [ ] | Observability + Debug Runbook | `observability-debug` | Request ID/logs/scripts debug rải rác | Foundation; queue cần Booking Email Notifications và Scheduler + Reminders | Chưa đầy đủ |

### Thứ tự và khả năng làm song song

- Luồng bắt buộc: **Guest tour list/detail → Authentication → Tour Search → Admin Tour CRUD → User Booking + Cancellation → Admin Booking Management → Booking Email Notifications → User Review Submission**. Các mục đến Admin Booking Management đã merge; Booking Email Notifications là gate hiện tại.
- `GET /api/tours` và `GET /api/tours/:tourId` phục vụ đồng thời guest và user, nên không tạo API xem tour riêng cho user.
- Review được đặt sau Admin Booking Management vì policy yêu cầu booking `APPROVED` và departure đã kết thúc. Public review/moderation là bước sau core.
- Domain Seeder + Console, CI + Test Harness, image upload, scheduler, social login, hardening/performance/observability chỉ làm sau khi luồng bắt buộc hoàn tất.
- Security Hardening, Performance Baseline và Observability + Debug Runbook là các PR riêng, không gộp thành một PR lớn.
- PR #4 authentication/profile + RBAC/admin users đến PR #10 Admin Booking Management đã merge; cụm hiện tại là Booking Email Notifications.
- Các PR cùng sửa AppModule/package.json/config cần điều phối tích hợp; song song nghiệp vụ không đảm bảo không conflict Git.
- Nếu một cụm quá lớn: chia PR tiếp nối trong cùng cụm (ví dụ queue transport rồi status-email integration), giữ mỗi PR chạy được; không gộp mail+scheduler hay user-booking+admin-workflow thành một PR.

## 4. Checklist nghiệm thu theo cụm PR

### Foundation (phần B3)

- Có: config validation, prefix, Swagger, error filter, request ID, pagination; unit pagination và health test.
- [ ] Test bootstrap production thiếu/sai config; không chỉ test happy path.
- [ ] Test unknown fields, error shape, request ID cho cả request bị guard từ chối.
- [x] Structured request logging qua middleware, request ID có trước guards; không ghi query/token/body.
- [ ] Rà soát mapping lỗi DB; global filter hiện coi lỗi không phải HttpException là 500.

### PR #4 — Authentication/profile + RBAC/admin users — đã merge

- [x] Có: register/login/refresh/logout, JWT, profile, RBAC/admin users và Swagger.
- [x] Có unit/e2e cho credentials, refresh replay, logout/revocation, blocked user, profile và admin authorization.
- [x] Seeder tạo admin đầu tiên idempotent, không reset database và không log password.
- [x] Review/merge PR #4 và chạy smoke test trên database đã migrate.

### RBAC và quản lý tài khoản (đã nằm trong PR #4)

- [x] Có: role guard, admin users, e2e phân quyền và bảo vệ admin cuối.
- [x] Controller chỉ nhận DTO/context và gọi service; ownership/state rule ở service.
- [x] Sau merge: smoke test blocked account, escalation và thao tác đồng thời làm mất admin cuối.

### Category Management — PR #5 đã merge

- [x] CRUD/archive, public visibility, filter/pagination, slug helper và Swagger.
- [x] Test conflict, dữ liệu invalid, pagination, authorization và resource không tồn tại.
- [x] Không tạo migration trùng; dùng schema category đã có trong Foundation.

### Tour Catalog — PR #6 đã merge

- [x] Public list/detail chỉ hiển thị tour `PUBLISHED`; admin CRUD/publish/archive, Swagger, i18n, query select và tests đã delivery.
- [x] Không đưa departure, image upload hoặc migration trùng schema Foundation vào PR #6.

### Departure Schedule Management — PR #7 đã merge (smoke test sau merge còn pending)

- Phạm vi PR: admin tạo/cập nhật/hủy lịch và khách xem lịch `OPEN` còn chỗ của tour đã xuất bản; không thêm lọc khoảng ngày vào tour search.
- PR: [#7 — feat: add tour departure management](https://github.com/thanhvt-2698/booking-tour/pull/7), merge SHA `c938b33`, branch head `2368e24`.
- [ ] Chọn field cần thiết cho mọi truy vấn; Swagger, i18n, DTO validation và role ADMIN.
- [ ] Xử lý timezone/biên ngày, booking deadline, lịch đã bắt đầu, capacity không thấp hơn ghế đã đặt.
- [ ] Khóa lịch trong transaction khi update/cancel; chưa có luồng hủy booking/refund nên từ chối hủy hoặc đổi lịch khi đã có ghế đặt.
- [ ] Unit/e2e cho authorization, visibility, capacity, deadline và conflict; không thêm migration/entity đã có trong Foundation.

### Tour Date Search — PR #8 đã merge

- Phạm vi: thêm bộ lọc vào public `GET /api/tours`; không thay admin tour listing và không thêm entity/migration.
- Contract đã chốt cho PR này: `departureFrom` và `departureTo` phải truyền cùng nhau theo `YYYY-MM-DD`; cả ngày bắt đầu/kết thúc đều được tính và cho phép tìm một ngày (`from = to`). Service quy đổi thành khoảng UTC nửa mở nội bộ.
- PR: [#8 — feat: add public tour date search](https://github.com/thanhvt-2698/booking-tour/pull/8), merge SHA `0b0e908`.
- [x] Lọc bằng `EXISTS` trên departure thuộc khoảng giao nhau (`start_at < to AND end_at > from`), `OPEN`, còn chỗ, chưa bắt đầu và booking deadline còn hiệu lực.
- [x] Swagger, i18n, validation cho cặp filter ngày và khoảng không hợp lệ.
- [x] Unit/e2e cho biên nửa mở nội bộ, một ngày, nhiều departure không nhân đôi tour, full/closed/cancelled/expired/started và pagination.

### Tour Image Upload

- Có: local storage abstraction, UUID key, MIME/extension/size/name validation, rollback file khi lưu DB lỗi, e2e upload/list/delete.
- [ ] Hoàn thiện phục vụ URL `/uploads/...`: adapter trả URL này nhưng chưa thấy static server/route tương ứng trong app. Test tải byte ảnh, không chỉ metadata.
- [ ] Test file rỗng, quá dung lượng, traversal, DB/storage lỗi và cleanup; hiện kiểm MIME dựa trên metadata, cân nhắc kiểm chữ ký nội dung file.
- [ ] Chốt giới hạn tổng số ảnh/mỗi tour và lifecycle xóa file; hiện upload một ảnh/lần.

### Domain Seeder + Console

- Có: admin, categories, draft/published tours, các lịch open/full/cancelled/completed; chạy theo stable keys và CLI summary.
- [ ] **Sửa an toàn reset trước delivery:** script `db:seed:reset` hiện ép `NODE_ENV=development`, có thể vô hiệu guard từ chối production khi DB config vẫn trỏ DB thật (`package.json`, `src/database/seeds/seed.ts`).
- [ ] Guard bằng môi trường thật + DB allow-list/explicit confirmation; không chạy reset để nghiệm thu trên dữ liệu đang dùng.
- [ ] Test seed hai lần, production reset rejection, lỗi exit code; chưa có seeder test suite.
- [ ] Không ghi đè `bookedSeats` từ số liệu seed khi đã có booking thật; seed hiện gán lại số ghế theo fixture.

### User Booking + Cancellation (08, PR #9 đang review)

- Nhánh: `feature/user-booking-management`, commit `ac22df3`, đã rebase lên `main@0b0e908`; [PR #9](https://github.com/thanhvt-2698/booking-tour/pull/9) đang chờ review.
- Có: `POST /api/bookings`, `GET /api/bookings/me`, `GET /api/bookings/:id`, `PATCH /api/bookings/:id/cancel`; Swagger, JWT guard, ownership, pagination/filter status, select field giới hạn, i18n vi/en và status history.
- Có: transaction lock departure, chặn lịch không `OPEN`/đã bắt đầu/quá hạn/không đủ chỗ, snapshot giá BigInt, idempotency key bắt buộc và trả `409` khi key được dùng với payload khác.
- Có: chỉ hủy booking `PENDING`, lock booking + departure, hoàn ghế đúng một lần, lưu lý do/history; retry cancel trả cùng booking mà không hoàn ghế thêm.
- Có: unit test nghiệp vụ và e2e authorization, ownership, retry idempotent, key conflict, hai request đồng thời không overbook và cancel retry.
- [ ] Chờ reviewer approve, merge PR #9 và smoke test sau merge; không coi code/PR đang review là delivery hoàn tất.

### Admin Booking Management (09, đã chuẩn bị cục bộ — chờ PR #9 merge)

- Nhánh local: `feature/admin-booking-management`, base `main@0b0e908`; chưa push, chưa tạo PR để không tách base khỏi PR #9.
- [x] `GET /api/admin/bookings`, `GET /api/admin/bookings/:bookingId`, filter status/ngày tạo/user/tour/departure, pagination, select field và role ADMIN.
- [x] `PATCH /api/admin/bookings/:bookingId/approve` và `/reject`: chỉ transition `PENDING -> APPROVED/REJECTED`; reject hoàn ghế đúng một lần, ghi actor/reason/history và publish event sau commit.
- [x] Unit test state transition/filter/select và e2e authorization, filter, approve/reject, history, seat release, conflict, event sau commit.
- [ ] Sau khi PR #9 merge: rebase lên `main`, giải quyết các file booking/i18n/module nếu có conflict, chạy lại toàn bộ test rồi push và mở PR.

### Booking Email Notifications

- Có: listener, Bull job, retry/backoff, SMTP processor và hàm `retryJob`; unit test enqueue approval bằng mock.
- [ ] Integration Redis + SMTP test server: approve/reject thực sự gửi mail, SMTP lỗi được retry, failed job có thể vận hành retry.
- [ ] Thêm processor/mailer unit tests và test reject; hiện chưa có test processor riêng.
- [ ] Bảo đảm không mất thông báo khi DB commit nhưng enqueue Redis lỗi. Hiện listener bất đồng bộ chỉ log lỗi; cần outbox/reconciliation hoặc quyết định giới hạn có chủ đích trước production.
- [ ] Chốt dedup sau completed: `removeOnComplete: true` xóa job nên jobId không bảo vệ việc enqueue lại mãi mãi.
- [ ] Viết CLI/runbook retry job; hiện chỉ có method service, chưa có thao tác vận hành hoàn chỉnh.

### User Review Submission (10a, sau Admin Booking Management)

- Có ở source cũ: eligibility, unique user/tour, ownership và e2e review; chỉ lấy phần tạo review trong lượt delivery này.
- [ ] Delivery: `POST /api/tours/:tourId/reviews`, rating/body validation, one review/user/tour và eligibility booking `APPROVED` với departure đã kết thúc.
- [ ] Unit/e2e cho eligibility, rating boundary, ownership và conflict unique.

### Public Review Read + Moderation (10b, sau core bắt buộc)

- [ ] Public list review, owner update/delete và admin moderation; không đưa vào 10a để giữ PR nhỏ.

### Scheduler + Reminders

- Có: cron mỗi giờ, update departure OPEN, batch reminder khoảng 24h, CLI và unit mock.
- [ ] Hoàn thiện CLOSED → COMPLETED: query maintenance hiện chỉ lấy OPEN nên lịch đã đóng không được cập nhật tiếp.
- [ ] Chốt policy pending quá hạn; **chưa có code expiry/release booking PENDING**.
- [ ] Kiểm tra reminder cho departure CLOSED nhưng booking APPROVED, batch vượt limit và chạy lại sau job completed; hiện reminder chỉ lấy departure OPEN và remove completed job.
- [ ] Test integration/fixed clock và concurrent runs; single runner hoặc distributed lock theo mô hình deploy.

### Google Social Login

- Có: Google strategy `state: true`, account mapping, social_accounts migration, token contract chung; 2 unit tests service mapping.
- [ ] **Chốt/sửa linking policy trước delivery:** hiện tự liên kết theo email có sẵn; strategy fallback email đầu tiên nếu không có verified email. Không tự link tài khoản nhạy cảm bằng email chưa xác minh.
- [ ] E2E mocked OAuth: state thiếu/sai, callback lặp/concurrent, collision và blocked account; chưa có suite này.
- [ ] Production session store + proxy/cookie setup: `express-session` hiện chưa cấu hình store riêng (MemoryStore mặc định).
- [ ] Cấu hình Google redirect URI/client secrets ở môi trường chạy; không commit secret; smoke test callback thực tế trước mở tính năng.



### CI, Security, Performance và Observability

- [ ] CI + Test Harness: CI build/lint không autofix/unit/e2e trên PostgreSQL/Redis test cô lập; bootstrap migrations và coverage threshold.
- [ ] Security Hardening: rate limit riêng login/register/upload; CORS allow-list theo consumer, security headers, config/secret/log redaction.
- [ ] Performance Baseline: EXPLAIN ANALYZE, p95/query count cho search/booking với dataset kiểm soát; rà soát N+1, lock/deadlock; chỉ tối ưu index/cache khi có số liệu.
- [ ] Observability + Debug Runbook: structured request/job logs, queue metrics, failed-job retry runbook, retention token/history/jobs, debug/troubleshooting và deployment/rollback.
- [ ] Mỗi cụm cập nhật Swagger/error/config docs ngay trong PR của mình, không đẩy hết tài liệu sang PR cuối.
- [ ] Pending expiry cần chốt policy rồi mới implement trong một follow-up nhỏ thuộc Scheduler + Reminders; không coi là đã có code.

## 5. Checklist chung để chuẩn bị và đóng PR

### Chuẩn bị code

- [ ] Kiểm tra main/remote thực tế trước khi tạo nhánh; giữ 15 nhánh nguồn cũ làm tham chiếu.
- [ ] Foundation được dựng từ main sau PR #1, lấy nền/auth và schema có chọn lọc; không cherry-pick nguyên feature commits chỉ để lấy entity.
- [ ] Các feature tiếp theo được dựng từ base có Foundation + phụ thuộc đã merge; chỉ lấy business delta cần thiết.
- [ ] Nếu dùng stacked PR để review sớm, ghi base rõ và cập nhật sau merge/squash; tránh đưa lại commit đã merge.
- [ ] Migration/schema thay đổi mới ngoài Foundation dùng migration incremental có test; không sửa lịch sử đã chạy.
- [ ] Controller không có business logic; service quản lý ownership, state transition, transaction.
- [ ] DTO whitelist/validation, i18n vi/en theo Foundation; không leak password/token/secret.
- [ ] Unit/e2e happy/error/concurrency liên quan; build/lint/format-check pass trên chính branch delivery.
- [ ] Swagger/README/config examples đồng bộ; Plans/, docs/, .env không đưa vào commit.

### Merge và release

- [ ] Reviewer approve; ghi PR URL/merge SHA/ngày vào dòng F tương ứng, không tự gán số PR GitHub.
- [ ] Merge và smoke test đúng phạm vi feature trước khi tick Done.
- [ ] Deploy có config/secrets/PostgreSQL/Redis/SMTP/upload volume/OAuth/session store theo feature đã bật.
- [ ] Backup DB và kế hoạch rollback tương thích; không tự động revert migration phá dữ liệu.
- [ ] Smoke test core: guest → login → booking → approve/reject → email; kiểm tra user/admin isolation.
- [ ] Với feature bổ sung: tải ảnh thực tế, review eligibility, cron/reminder, OAuth callback và failed jobs.
- [ ] Ghi trạng thái deploy riêng: môi trường ___ | version ___ | thời điểm ___ | kết quả ___.
- [ ] Không coi merge hoặc 13 unit tests cũ là bằng chứng đủ để deploy production.

## 6. Inventory nguồn code (không phải danh sách PR cần merge nguyên trạng)

Snapshot 21/09/2026: tất cả 15 nhánh feature dưới đây đã commit local, chưa delivery vào main tại lần đối chiếu.

| Nguồn branch | Commit | Phân bổ delivery mới |
| --- | --- | --- |
| feature/foundation-common | 885e567 | Foundation |
| feature/users-profile | 03f9ab5 | Foundation |
| feature/auth-jwt | ab38777 | Authentication/Profile |
| feature/rbac | 7f74061 | RBAC + Admin Users |
| feature/categories | a3d72a9 | Category Management |
| feature/tour-catalog | a8924fe | Tour Catalog — nguồn code |
| feature/tour-catalog-management | PR #6 | Tour Catalog — đã merge |
| feature/tour-departures | b1e2a97 | Departure Management + Date Search |
| feature/tour-departure-management | `2368e24` | Departure Schedule Management — [PR #7 đã merge](https://github.com/thanhvt-2698/booking-tour/pull/7) |
| feature/tour-date-search | `af5cdbb` | Tour Date Search — [PR #8 đã merge](https://github.com/thanhvt-2698/booking-tour/pull/8) |
| feature/tour-images | 0c810bf | Tour Image Upload |
| feature/seeder-cli | 6d7867a | Domain Seeder + Console |
| feature/user-bookings | 7b3176a | User Booking + Cancellation |
| feature/admin-booking-workflow | c16d3e1 | Admin Booking Management |
| feature/reviews | 6d4afef | User Review Submission (10a) + Public Review/Moderation (10b) |
| feature/booking-notifications | f05c5df | Booking Email Notifications |
| feature/scheduler-reminders | 6d4e9a4 | Scheduler + Reminders |
| feature/social-login | da0d70f | Google Social Login |

**Chưa có code hoàn chỉnh:** Domain Seeder + Console, CI + Test Harness, Performance Baseline và Observability + Debug Runbook. Các phần thiếu khác xem mục 4.

## 7. Bằng chứng kiểm tra đã có và bước tiếp theo

Kết quả kiểm tra dưới đây phân biệt trạng thái PR đã merge với kiểm thử sau merge.

- Các PR đã merge trước đây: build/lint không autofix và SunLint đã được kiểm tra; không dùng `sunlint-disable`.
- PR #7, branch head `2368e24`, đã merge tại `c938b33`: build, lint không autofix, Prettier check PASS; unit 11 suites / 30 tests PASS; E2E 9 suites / 23 tests PASS trên disposable PostgreSQL database. Smoke test sau merge vẫn pending.
- PR #7 chưa có kết quả SunLint đáng tin cậy: công cụ nhận diện 0 file để phân tích khi chạy trong linked checkout ở `/tmp`, dù code được chọn; không xem lần chạy đó là PASS.
- PR #7 không thêm entity/migration; sử dụng `tour_departures` đã có trong Foundation.
- PR #8, commit `af5cdbb`: build, lint không autofix, Prettier check PASS; unit 11 suites / 33 tests PASS; E2E 9 suites / 24 tests PASS trên disposable PostgreSQL database. SunLint chạy trên toàn bộ source file thay đổi PASS; lần quét toàn project vẫn báo warning ở file ngoài phạm vi, không có warning trong code của PR #8.
- PR #8 không thêm entity/migration. Kết quả kiểm thử trên nhánh chưa thay thế smoke test sau merge.
- Unit của các PR đã merge trước đây: 7 suites, 16 tests PASS tại lần tổng hợp cũ.
- Auth/RBAC và Category e2e đã được kiểm tra trước khi merge; các PR tiếp theo phải chạy lại regression trên base mới.
- Chưa kiểm chứng migrations up/down, Redis/SMTP integration, OAuth browser, load test trên các nhánh delivery mới.

Tiến độ hiện tại:

1. PR #6 Tour Catalog, PR #7 Departure Schedule Management và PR #8 Tour Date Search đã merge lần lượt tại `05a2c34`, `c938b33` và `0b0e908`.
2. Checkout chính ở nhánh `feature/user-booking-management`; PR #9 đang review trên base `main@0b0e908`.
3. Sau PR #9, delivery bắt buộc tiếp theo là Admin Booking Management (09), Booking Email Notifications và User Review Submission (10a).

Tài liệu local/gitignored; cập nhật lần này không được commit vào repository.

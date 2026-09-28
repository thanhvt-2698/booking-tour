# Booking Tour — Feature Matrix

## 1. Guest — Khách viếng thăm

- Basic
  - Xem thông tin chi tiết của tour
    - Endpoint: `GET /api/tours/:tourId`
    - Kỹ thuật áp dụng:
      - Public API.
      - Response DTO.
      - TypeORM relation với category và departure.
      - Chỉ hiển thị tour `PUBLISHED` và departure còn hiệu lực.

  - Xem các tour hiện có
    - Endpoint: `GET /api/tours?page=1&limit=20`
    - Kỹ thuật áp dụng:
      - Pagination.
      - Stable ordering.
      - QueryBuilder.
      - Select các field cần thiết.
      - Index theo `status`, `category_id`, `created_at`.

  - Đăng ký tài khoản
    - Endpoint: `POST /api/auth/register`
    - Kỹ thuật áp dụng:
      - Global `ValidationPipe`.
      - Bcrypt hash password.
      - Unique constraint cho email.
      - Transaction.
      - JWT và refresh token.
      - Generic error message.

- Advance
  - Xem review của người khác
    - Endpoint: `GET /api/tours/:tourId/reviews?page=1&limit=20`
    - Kỹ thuật áp dụng:
      - Chỉ lấy review `PUBLISHED`.
      - Pagination.
      - Index `(tour_id, status, created_at)`.
      - Không expose dữ liệu nhạy cảm.

  - Tìm kiếm tour theo ngày bắt đầu và kết thúc
    - Endpoint:
      - `GET /api/tours?startDateFrom=&startDateTo=&endDateFrom=&endDateTo=`
    - Kỹ thuật áp dụng:
      - DTO parse/validate ngày.
      - QueryBuilder join `tour_departures`.
      - Index `(status, start_at, end_at)`.
      - Stable pagination.
      - Tránh N+1 query.

## 2. User

- Basic
  - Đăng nhập/đăng xuất
    - Endpoints:
      - `POST /api/auth/login`
      - `POST /api/auth/refresh`
      - `POST /api/auth/logout`
    - Kỹ thuật áp dụng:
      - Passport JWT.
      - Bcrypt compare.
      - Access token ngắn hạn.
      - Refresh token rotation.
      - Hash refresh token.
      - Revoke token khi logout.
      - Throttling login.

  - Đặt tour
    - Endpoint: `POST /api/bookings`
    - Header: `Idempotency-Key`
    - Kỹ thuật áp dụng:
      - Database transaction.
      - `SELECT ... FOR UPDATE` trên `tour_departures`.
      - Kiểm tra capacity, deadline và status.
      - Price snapshot.
      - Booking khởi tạo ở state `PENDING`.
      - Chống overbooking.
      - Chống duplicate request.

  - Xem tour và booking của mình
    - Endpoints:
      - `GET /api/tours/:tourId`
      - `GET /api/bookings/me`
      - `GET /api/bookings/:bookingId`
    - Kỹ thuật áp dụng:
      - JWT optional cho tour public.
      - Ownership query theo `user_id`.
      - Response DTO.
      - Pagination cho danh sách booking.
      - Không trả internal fields.

  - Thêm review cho tour
    - Endpoint: `POST /api/tours/:tourId/reviews`
    - Kỹ thuật áp dụng:
      - JWT authentication.
      - Kiểm tra booking `APPROVED`.
      - Chỉ review sau khi tour kết thúc.
      - Unique `(user_id, tour_id)`.
      - Rating từ 1 đến 5.
      - Request validation.
      - Transaction.

  - Tìm kiếm tour
    - Endpoint:
      - `GET /api/tours?keyword=&categoryId=&startDateFrom=&startDateTo=&page=&limit=`
    - Kỹ thuật áp dụng:
      - Query DTO.
      - Kết hợp nhiều filter.
      - QueryBuilder.
      - Database index.
      - Giới hạn `limit`.
      - Chỉ bổ sung full-text search sau khi benchmark.

  - Quản lý profile
    - Endpoints:
      - `GET /api/users/me`
      - `PATCH /api/users/me`
    - Kỹ thuật áp dụng:
      - `@CurrentUser()` decorator.
      - Ownership theo JWT subject.
      - Partial update.
      - Mapper loại password hash.
      - Audit timestamps.

  - Hủy booking khi chưa được admin confirm
    - Endpoint: `PATCH /api/bookings/:bookingId/cancel`
    - Kỹ thuật áp dụng:
      - State machine chỉ cho phép `PENDING -> CANCELLED`.
      - Ownership check tại service.
      - Database transaction.
      - Hoàn `booked_seats`.
      - Idempotent policy.
      - Ghi booking status history.

- Advance
  - Đăng nhập thông qua mạng xã hội
    - Endpoints:
      - `GET /api/auth/google`
      - `GET /api/auth/google/callback`
    - Kỹ thuật áp dụng:
      - Passport OAuth.
      - State/CSRF protection.
      - Allow-list redirect URI.
      - Provider account linking.
      - Không lưu provider token.
      - Phát cùng JWT contract với password login.

## 3. Admin

- Basic
  - Quản lý user
    - Endpoints:
      - `GET /api/admin/users`
      - `GET /api/admin/users/:userId`
      - `PATCH /api/admin/users/:userId/status`
      - `PATCH /api/admin/users/:userId/role`
    - Kỹ thuật áp dụng:
      - JWT + `RolesGuard`.
      - RBAC.
      - Pagination và filter.
      - Không cho tự hạ admin cuối cùng.
      - Block user.
      - Audit log.
      - Không expose password hash.

  - Quản lý tour — CRUD
    - Endpoints:
      - `GET /api/admin/tours`
      - `POST /api/admin/tours`
      - `GET /api/admin/tours/:tourId`
      - `PATCH /api/admin/tours/:tourId`
      - `DELETE /api/admin/tours/:tourId`
    - Kỹ thuật áp dụng:
      - RBAC.
      - DTO whitelist.
      - Slug/code unique.
      - Database migration.
      - Soft archive thay vì hard delete khi đã có booking.
      - Transaction cho relation category/departure.

  - Quản lý review
    - Endpoints:
      - `GET /api/admin/reviews`
      - `PATCH /api/admin/reviews/:reviewId/hide`
      - `DELETE /api/admin/reviews/:reviewId`
    - Kỹ thuật áp dụng:
      - RBAC.
      - Moderation status.
      - Soft delete/hide.
      - Pagination và filter.
      - Audit actor.
      - Không hard-delete dữ liệu cần đối soát.

  - Quản lý yêu cầu đặt tour
    - Endpoints:
      - `GET /api/admin/bookings?status=PENDING`
      - `GET /api/admin/bookings/:bookingId`
      - `PATCH /api/admin/bookings/:bookingId/approve`
      - `PATCH /api/admin/bookings/:bookingId/reject`
    - Kỹ thuật áp dụng:
      - RBAC.
      - State machine.
      - Database transaction.
      - Approve/reject idempotency.
      - Reject hoàn capacity.
      - Booking status history.
      - Phát domain event sau commit.

  - Quản lý category — CRUD
    - Endpoints:
      - `GET /api/categories`
      - `POST /api/admin/categories`
      - `GET /api/admin/categories/:categoryId`
      - `PATCH /api/admin/categories/:categoryId`
      - `DELETE /api/admin/categories/:categoryId`
    - Kỹ thuật áp dụng:
      - RBAC.
      - Slug normalization.
      - Unique constraint.
      - Không xóa category đang được tour sử dụng.
      - Archive/inactive policy.
      - Request validation.

## 4. System

- Gửi email khi approve/reject booking
  - Trigger:
    - `booking.status.changed` với status `APPROVED` hoặc `REJECTED`.
    - Queue `booking-notification`.
    - Email processor gửi qua SMTP.
  - Kỹ thuật áp dụng:
    - Application event hoặc `@nestjs/event-emitter`.
    - `@nestjs/bull`.
    - Redis.
    - Retry/backoff.
    - Idempotent `jobId`.
    - Failed-job logging.
    - Không gửi email trực tiếp trong HTTP request.

- Nhắc user trước ngày khởi hành
  - Trigger:
    - `@Cron(...)` quét booking `APPROVED` trước 24 giờ.
    - Enqueue email reminder.
  - Kỹ thuật áp dụng:
    - `@nestjs/schedule`.
    - Batch query.
    - Idempotency key theo booking/ngày.
    - Bull/Redis.
    - Fixed-clock unit test.
    - Không enqueue duplicate.

- Đóng departure hết hạn
  - Trigger:
    - `@Cron(...)` cập nhật departure đã qua deadline/start date.
  - Kỹ thuật áp dụng:
    - Scheduler gọi service/use case.
    - Transaction.
    - State transition `OPEN -> CLOSED/COMPLETED`.
    - Index theo status/date.
    - Log số record đã xử lý.

- Upload ảnh tour
  - Endpoints:
    - `POST /api/admin/tours/:tourId/images`
    - `GET /api/tours/:tourId/images`
    - `DELETE /api/admin/tours/:tourId/images/:imageId`
  - Kỹ thuật áp dụng:
    - Multipart upload.
    - MIME/extension/size validation.
    - UUID storage key.
    - Local storage adapter.
    - Lưu metadata trong database.
    - Chống path traversal.
    - Cleanup orphan file.

## 5. Business rules chính

- `tours` là thông tin sản phẩm; `tour_departures` là lịch khởi hành cụ thể.
- Chỉ tour `PUBLISHED` và departure `OPEN` còn chỗ mới được đặt.
- Booking lưu snapshot `unit_price`, `total_amount`, `currency` tại thời điểm đặt.
- User chỉ được hủy booking khi booking còn `PENDING`.
- Booking phải khóa departure trong transaction để tránh overbooking.
- Chỉ user có booking `APPROVED` và đã kết thúc tour mới được review.
- Email chỉ được enqueue sau khi transaction approve/reject commit thành công.
- Tour, departure và category đã có dữ liệu liên quan không hard-delete; dùng archive/status.

## 6. Mapping với implementation plans

- Foundation, validation, error, pagination
  - `Plans/01-foundation-common.md`
- User/profile
  - `Plans/02-users-profile.md`
- Register/login/logout/JWT
  - `Plans/03-auth-jwt.md`
- RBAC và admin authorization
  - `Plans/04-rbac.md`
- Category
  - `Plans/05-categories.md`
- Tour CRUD/detail
  - `Plans/06-tour-catalog.md`
- Departure và tìm kiếm ngày
  - `Plans/07-departures-search.md`
- User booking
  - `Plans/08-user-bookings.md`
- Admin booking workflow
  - `Plans/09-admin-booking-workflow.md`
- Review
  - `Plans/10-reviews.md`
- File/upload ảnh tour
  - `Plans/11-file-upload-tour-images.md`
- Email queue
  - `Plans/12-email-queue.md`
- Scheduler
  - `Plans/13-scheduler-reminders.md`
- Social login
  - `Plans/14-social-login.md`

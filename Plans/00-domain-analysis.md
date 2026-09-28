# Domain Analysis — Booking Tour API

## 1. Phạm vi phiên bản đầu

Đây là backend API, không xây dựng frontend. Hệ thống có ba nhóm actor:

| Actor | Quyền chính |
| --- | --- |
| Guest | Xem tour đã publish, tìm kiếm theo lịch, xem review, đăng ký |
| User | Đăng nhập, đặt tour, xem booking của mình, hủy booking pending, review, quản lý profile |
| Admin | Quản lý user, category, tour, departure, booking và review |

Social login được tách thành phase riêng để không làm chậm phần core booking. Có thể bắt đầu với Google OAuth sau khi JWT/password flow ổn định.

## 2. Mô hình nghiệp vụ đề xuất

### Tour và lịch khởi hành

Không nên đặt `startDate`, `endDate`, `capacity` trực tiếp trên `tours` nếu một tour có thể mở nhiều lịch. Tách thành hai aggregate:

- `tours`: thông tin sản phẩm, title, slug, description, price cơ bản, category, status.
- `tour_departures`: một lần khởi hành cụ thể, start/end date, capacity, booked seats, status.

Tour có thể có nhiều departure. Tìm kiếm theo ngày sẽ chạy trên `tour_departures`, sau đó join về tour.

### Booking

Booking tham chiếu `user_id` và `departure_id`, lưu snapshot cần thiết như số lượng người, đơn giá tại thời điểm đặt và tổng tiền. Không tính lại lịch sử từ giá hiện tại của tour.

Trạng thái đề xuất:

```text
PENDING -> APPROVED
PENDING -> REJECTED
PENDING -> CANCELLED
```

Chỉ `PENDING` được user hủy theo yêu cầu hiện tại. Admin là bên approve/reject. Khi reject hoặc cancel phải trả lại capacity trong cùng transaction.

### Review

Review gắn với user và tour, gồm rating 1-5, comment và moderation status. Business rule đề xuất: chỉ user có booking `APPROVED` mới được review, mỗi user chỉ review một lần cho một tour. Cần chốt thêm việc review được tạo ngay sau approve hay chỉ sau `endDate`; đề xuất chỉ cho review sau khi tour kết thúc để phản ánh trải nghiệm thật.

### File

File upload phục vụ ảnh tour. Database chỉ lưu metadata: original name, MIME type, size, storage key, URL và owner. Service file nên có interface storage để MVP dùng local disk nhưng có thể đổi sang S3-compatible storage mà không sửa tour service.

## 3. API contract dự kiến

### Public/Guest

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/api/tours` | Danh sách tour publish, phân trang và tìm kiếm |
| `GET` | `/api/tours/:id` | Chi tiết tour và các departure còn mở |
| `GET` | `/api/tours/:id/reviews` | Review đã publish |
| `POST` | `/api/auth/register` | Đăng ký tài khoản |
| `GET` | `/api/categories` | Danh sách category đang dùng |

Query tour đề xuất:

```text
GET /api/tours?startDateFrom=2026-10-01&startDateTo=2026-12-31&categoryId=...&page=1&limit=20
```

`startDate` và `endDate` phải được hiểu rõ là ngày của departure, không phải ngày tạo tour.

### User

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Đăng nhập bằng email/password |
| `POST` | `/api/auth/logout` | Thu hồi refresh token nếu triển khai token rotation |
| `GET` | `/api/users/me` | Xem profile hiện tại |
| `PATCH` | `/api/users/me` | Cập nhật profile |
| `POST` | `/api/bookings` | Tạo booking cho một departure |
| `GET` | `/api/bookings/me` | Danh sách booking của user |
| `GET` | `/api/bookings/:id` | Chi tiết booking thuộc user |
| `PATCH` | `/api/bookings/:id/cancel` | Hủy booking đang pending |
| `POST` | `/api/tours/:tourId/reviews` | Tạo review hợp lệ |
| `PATCH` | `/api/tours/:tourId/reviews/:reviewId` | Sửa review của mình nếu policy cho phép |
| `DELETE` | `/api/tours/:tourId/reviews/:reviewId` | Xóa review của mình |

Đăng nhập xã hội nên thêm các endpoint OAuth callback sau khi core flow hoàn thành:

```text
GET /api/auth/google
GET /api/auth/google/callback
```

### Admin

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET/PATCH` | `/api/admin/users` | Danh sách và cập nhật trạng thái/role user |
| `POST/PATCH/DELETE` | `/api/admin/categories` | CRUD category |
| `POST/PATCH/DELETE` | `/api/admin/tours` | CRUD tour |
| `POST/PATCH/DELETE` | `/api/admin/tours/:tourId/departures` | Quản lý lịch khởi hành |
| `POST` | `/api/admin/tours/:tourId/files` | Upload ảnh tour |
| `GET` | `/api/admin/bookings` | Lọc booking theo status/date/user |
| `PATCH` | `/api/admin/bookings/:id/approve` | Duyệt booking |
| `PATCH` | `/api/admin/bookings/:id/reject` | Từ chối booking |
| `DELETE` | `/api/admin/reviews/:id` | Moderation/xóa review |

## 4. Database draft

Các bảng lõi:

```text
users
roles hoặc role trên users ở MVP
categories
tours
tour_departures
tour_images
bookings
booking_status_histories
reviews
refresh_tokens (nếu dùng logout/revoke server-side)
```

Các index cần có ngay từ đầu:

- `users(email)` unique.
- `tours(slug)` unique, `tours(status, category_id)`.
- `tour_departures(status, start_date, end_date)`.
- `bookings(user_id, created_at)`, `bookings(status, created_at)`.
- Unique `reviews(user_id, tour_id)` nếu chọn một review/user/tour.

## 5. Booking flow và tính đúng đắn

1. Validate user, tour, departure và số lượng.
2. Mở transaction.
3. Lock departure bằng `pessimistic_write` hoặc câu lệnh tương đương.
4. Tính `remainingSeats = capacity - bookedSeats`.
5. Nếu thiếu chỗ, trả `409 Conflict`.
6. Tăng `bookedSeats`, tạo booking `PENDING` và status history.
7. Commit transaction.
8. Chỉ sau khi commit mới enqueue event/email nếu cần.

Approve/reject/cancel cũng phải dùng transaction và kiểm tra state transition ở service, không chỉ dựa vào controller.

## 6. Email, Redis và scheduler

Queue đề xuất:

```text
booking-notification
  - booking.approved
  - booking.rejected
  - booking.cancelled
  - departure.reminder
```

Processor nhận job, render template và gửi mail qua SMTP. Job cần retry có backoff, giới hạn attempts và `jobId` ổn định để giảm duplicate email. Khi queue thất bại, giữ failed job để debug/retry.

Scheduler đề xuất:

- Mỗi giờ đóng departure đã qua hoặc hết hạn đăng ký.
- Mỗi ngày tìm booking đã approved có departure bắt đầu sau 24 giờ và enqueue reminder.
- Định kỳ xử lý booking `PENDING` quá thời hạn theo policy.

Cron chỉ tạo command/job; logic nghiệp vụ vẫn nằm ở service để có thể unit test và chạy thủ công.

## 7. Phân quyền

Tách hai lớp:

- `JwtAuthGuard`: xác định user.
- `RolesGuard`/`@Roles(...)`: kiểm tra role ở route.

Ownership không nên đặt hoàn toàn trong guard. Ví dụ user chỉ hủy booking của chính mình; service phải query theo cả `bookingId` và `userId`, sau đó kiểm tra trạng thái.

## 8. File handling

- Giới hạn MIME type, extension, dung lượng và số lượng file.
- Không dùng tên file từ client làm storage path.
- Generate UUID/object key, normalize metadata.
- Không lưu buffer lớn trong database.
- Xóa file orphan khi transaction tạo tour thất bại hoặc khi admin xóa ảnh.
- Test file rỗng, MIME không hợp lệ, quá dung lượng và upload nhiều file.

## 9. Test strategy

### Unit test

- Booking state transition.
- Capacity và overbooking.
- Price snapshot.
- Role/ownership rule.
- Review eligibility.
- File validation.
- Email job payload và retry policy.

### E2E test

- Register/login/private endpoint.
- Guest chỉ thấy tour published.
- User đặt tour thành công và không thể vượt capacity.
- User chỉ hủy booking pending của mình.
- Admin approve/reject; email job được enqueue.
- User khác không truy cập booking/review private.
- Upload file thành công/thất bại theo MIME và size.

Test database dùng migration riêng, không dùng `synchronize: true`. Mỗi test suite phải cleanup theo foreign-key order hoặc transaction/fixture helper.

## 10. Seeder, CLI và debug

- `npm run db:seed`: tạo category, admin và dữ liệu tour mẫu.
- Seed phải idempotent, chạy nhiều lần không tạo duplicate.
- Tách seed theo nhóm: `users`, `categories`, `tours`, `departures`.
- Log có prefix `[seed]`, `[booking]`, `[mail]` để grep dễ dàng.
- Debug local qua `start:debug`, breakpoint và log context có `requestId`.
- Không log password, JWT, SMTP password hoặc dữ liệu cá nhân không cần thiết.

## 11. Thứ tự triển khai

1. Foundation: config, database, common response/error, Swagger.
2. Auth + users + roles.
3. Category + tour + departure CRUD; guest xem list/detail và user tìm kiếm tour.
4. User booking transaction, self-service list/detail và cancel `PENDING`.
5. Admin booking management: list/detail, approve/reject state machine và audit status.
6. Redis/Bull mail gửi thông báo approve/reject.
7. User review submission cho booking `APPROVED` đã kết thúc.
8. Public review read/moderation, file upload, seeder/console và scheduler.
9. Social login, hardening, benchmark, observability và documentation.

# Booking Tour API

## Công nghệ

- Node.js, TypeScript, NestJS 11 (Express).
- PostgreSQL 16, TypeORM.
- Redis, Bull, Nodemailer/SMTP.
- Joi, class-validator, class-transformer.
- nestjs-i18n, Swagger/OpenAPI, NestJS Throttler.
- Jest, Supertest, ESLint, Prettier.
- Docker Compose.

## Yêu cầu môi trường

- Node.js >= 22.22.3 và npm.
- Docker và Docker Compose.

## Setup project

### 1. Clone và cài dependencies

```sh
git clone git@github.com:thanhvt-2698/booking-tour.git
cd booking-tour
npm ci
```

### 2. Cấu hình môi trường

```sh
cp .env.example .env
```

Cấu hình PostgreSQL local theo Docker Compose:

```dotenv
NODE_ENV=development
PORT=3001
API_PREFIX=api
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h
JWT_ISSUER=booking-tour-api
JWT_AUDIENCE=booking-tour-client
REFRESH_TOKEN_TTL_DAYS=30
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=nestjs
DB_PASSWORD=nestjs
DB_NAME=booking_tour
DB_TEST_NAME=booking_tour_test
```

### 3. Khởi động hạ tầng local và chạy migrations

```sh
docker compose up -d --wait
npm run db:migration:run
```

### 4. Tạo tài khoản admin đầu tiên

Thêm `SEED_ADMIN_PASSWORD` vào file `.env`, sau đó chạy seeder:

```sh
npm run db:seed
```

Seeder có tính idempotent: chạy lại sẽ không thay đổi mật khẩu hoặc tạo bản ghi admin trùng.

### 5. Chạy ứng dụng

```sh
npm run start:dev
```

- API: http://localhost:3001/api
- Swagger: http://localhost:3001/docs
- OpenAPI JSON: http://localhost:3001/docs-json

### 6. Build và chạy bản build

```sh
npm run build
npm run start:prod
```

## Scheduler và notification recovery

- Cron chạy mỗi phút, xử lý từng batch: đóng departure hết hạn đặt/đã khởi hành, hoàn tất departure đã kết thúc, hủy booking `PENDING` quá hạn và hoàn chỗ, tạo reminder cho booking `APPROVED` khởi hành trong 24 giờ tới.
- `BOOKING_PENDING_TTL_HOURS=24` cấu hình thời gian chờ duyệt; `SCHEDULER_BATCH_SIZE=100` giới hạn số bản ghi mỗi tác vụ mỗi lượt. `SCHEDULER_ENABLED=true` bật cron; mặc định tắt trong môi trường test.
- Approve/reject lưu notification outbox cùng transaction với booking/history. Cron khôi phục các notification chưa xử lý khi Redis enqueue lỗi hoặc job bị mất. Job đã hết số lần retry cần chạy command retry thủ công.
- Áp dụng migration mới trước khi chạy phiên bản này. Build trước khi dùng các command sau; chúng không mở HTTP server và tắt cron tự động:

```sh
npm run build
npm run scheduler:run
npm run notifications:retry
```

Reminder được kiểm tra lại trước khi gửi; không gửi cho lịch bị hủy, đã qua hoặc bị đổi thời gian. `MAIL_ENABLED=false` đánh dấu notification đã bỏ qua, không tự gửi lại khi bật mail về sau. Outbox và job ID giảm gửi trùng; SMTP có thể gửi lại nếu process dừng sau khi SMTP nhận email nhưng trước khi lưu trạng thái đã xử lý. Cấu hình một replica chạy scheduler; cursor reminder hiện nằm trong bộ nhớ process.

Các service transaction sử dụng repository từ cùng `EntityManager` để booking, số chỗ, history và outbox commit/rollback cùng nhau. SunLint C033 có thể cảnh báo các thao tác ORM này; dùng repository toàn cục thay cho repository của transaction sẽ làm mất tính nguyên tử. Các warning này cần được review theo thiết kế transaction, không tắt rule hay thêm directive bypass.

# Booking Tour API

Backend-only API cho hệ thống đặt tour du lịch, được xây dựng để thực hành và mở rộng các kiến thức trong project `nestjs-tutorial`.

## Mục tiêu học tập

- Tái sử dụng modular architecture, DTO validation, JWT, TypeORM, migration, Swagger, unit test và e2e test.
- Bổ sung RBAC, upload file, Redis/Bull queue, gửi email bất đồng bộ, scheduler, seeder CLI và kỹ thuật debug.
- Ưu tiên correctness trước, sau đó đo lường và tối ưu các query có nguy cơ trở thành bottleneck.

## Công nghệ dự kiến

- NestJS 11, TypeScript strict mode.
- PostgreSQL 16 và TypeORM.
- Redis 7 và `@nestjs/bull` cho email/background jobs.
- `@nestjs/schedule` cho các tác vụ định kỳ.
- Jest, Supertest, Swagger/OpenAPI.
- Docker Compose cho PostgreSQL và Redis.

## Khởi động

```bash
npm install
cp .env.example .env
docker compose up -d
npm run build
npm run start:dev
```

Do project dùng migration thay vì `synchronize`, migration sẽ được chạy chủ động:

```bash
npm run db:migration:run
```

Mặc định API chạy tại `http://localhost:3001/api`, Swagger tại `http://localhost:3001/docs`.

## Cấu trúc module

```text
src/
├── auth/             # register, login, logout, JWT/OAuth
├── users/            # profile và user management
├── categories/       # category CRUD
├── tours/            # tour, departure, public search, admin CRUD
├── bookings/         # đặt tour, trạng thái, approve/reject/cancel
├── reviews/          # review và moderation
├── files/            # upload và metadata file
├── notifications/    # mail service, Bull queues và processors
├── scheduler/        # cron jobs và các use case định kỳ
├── common/           # guards, decorators, filters, interceptors, pipes
├── config/           # environment và database config
└── database/         # DataSource, migration và seed
```

## Scripts chính

```bash
npm run start:dev
npm run test
npm run test:e2e -- --runInBand
npm run build
npm run db:migration:run
npm run db:migration:revert
npm run db:seed
npm run db:seed:reset
```

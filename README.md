# Booking Tour API

## Công nghệ

- Node.js, TypeScript, NestJS 11 (Express).
- PostgreSQL 16, TypeORM.
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

### 3. Khởi động database và chạy migrations

```sh
docker compose up -d --wait postgres
npm run db:migration:run
```

### 4. Chạy ứng dụng

```sh
npm run start:dev
```

- API: http://localhost:3001/api
- Swagger: http://localhost:3001/docs
- OpenAPI JSON: http://localhost:3001/docs-json

### 5. Build và chạy bản build

```sh
npm run build
npm run start:prod
```

# Booking Tour API

F00 combines B3 (foundation/auth/i18n) and B4 (entities/relations/migrations).
Business APIs are delivered later as small B5 PRs.

## Requirements and startup

- Node.js >=22.22.3, PostgreSQL 16.
- Copy `.env.example` to `.env`, set a strong JWT_SECRET (at least 32 characters).
- `npm ci`
- `docker compose up -d postgres`
- `npm run db:migration:run`
- `npm run start:dev`

HTTP defaults to port 3001. Swagger: `/docs`, OpenAPI: `/docs-json`.
Redis, SMTP, scheduler and Google OAuth are **not activated or required** in F00.
The compose Redis service is reserved for later work.

## Delivered endpoints

| Method | Route | Description |
| --- | --- | --- |
| GET | /api | Health |
| POST | /api/auth/register | Create user and token pair |
| POST | /api/auth/login | Email/password login |
| POST | /api/auth/refresh | Rotate refresh token (row-locked transaction) |
| POST | /api/auth/logout | Revoke supplied refresh token |
| GET | /api/users/me | Current user, Bearer token required |
| PATCH | /api/users/me | Update username/bio/avatarUrl only |

Auth mirrors the tutorial's NestJS/Passport/JWT/bcrypt/TypeORM structure, adding
hashed refresh tokens, rotation and active-user checks. Logout revokes the refresh
token, not an already issued access JWT; it expires according to JWT_EXPIRES_IN.
Controllers delegate business rules to services.

## Localization and errors

Use `Accept-Language: vi` or `en` (regional variants supported); fallback is English.
Translations live in `src/i18n/{en,vi}/errors.json` and are copied into dist.
Only messages are translated; DB enums, JSON field names, statusCode and code stay stable.

Error shape: `{statusCode, error, code, message, path, requestId, timestamp}`.
Example: code `errors.invalidCredentials`; message varies with locale.
Validation rejects unknown fields and returns localized field messages without values.
Every request receives `x-request-id`, including requests rejected by guards.
Missing translation keys fall back to a safe status message; internal errors never expose stacks.

## Database

10 entities, 9 ordered migrations and 13 foreign-key relationships.
Scalar FK columns remain available for explicit queries; relations are not eager-loaded
and cascading ORM writes are disabled. PostgreSQL ON DELETE rules are separate.
TypeORM synchronize is disabled. Never edit a migration already applied to a shared DB.
Inspect generated schema differences before introducing a new incremental migration.

Includes catalog, booking, review, image and social identity **schema only**.
No domain controllers, mail processors, cron jobs or OAuth endpoints are enabled here.

## Verification

```sh
npm run build
npx eslint "{src,apps,libs,test}/**/*.ts"
npm test -- --runInBand
npm run test:e2e -- --runInBand test/i18n.e2e-spec.ts
```

Database e2e tests are destructive **only to an explicitly selected disposable DB**.
Create a new database named `booking_tour_f00_<unique>_test`; do not point at development
or production data. The auth suite refuses names outside this pattern.
Use the same DB_TEST_NAME for migrations and tests:

```sh
NODE_ENV=test DB_TEST_NAME=booking_tour_f00_example_test npm run db:migration:run:test
NODE_ENV=test DB_TEST_NAME=booking_tour_f00_example_test npm run test:e2e -- --runInBand
```

The database must already exist. Do not use seed reset to prepare an existing database.
Basic seed script is a placeholder; domain seeding is deferred to B5.

## Debugging

`npm run start:debug` runs the Nest inspector; `npm run test:debug` runs Jest inspector.
Trace failures using x-request-id without logging passwords or raw tokens.
Schema files and tests are versioned; Plans/ and docs/ are local-only and ignored.

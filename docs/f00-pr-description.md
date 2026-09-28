## Scope — Foundation (foundation/i18n + B4 schema)

- Configuration validation, validation/error contract, request IDs/logging, pagination and Swagger.
- Vietnamese/English i18n with Accept-Language fallback and compiled translation assets.
- 10 entities, 13 FK/inverse relations and 9 unchanged ordered migrations; synchronize disabled.
- Plans/ and docs/ remain local-only and ignored.

## Authentication/profile deferred

At the owner's request, authentication and profile implementation has been removed from this PR's final diff. Controllers, services, DTOs, JWT guards/strategy, auth-specific translations/config validation and auth tests will be delivered in a separate PR.
User/refresh-token/social-account entities and migrations remain as B4 schema only. Existing init-project dependencies/placeholders are preserved.
The original code is retained locally on codex/deferred-auth-profile at 5f92a20. No new auth PR has been opened.

## Verification after extraction

- Build, ESLint and unit tests: 4 suites / 8 tests passed.
- E2E: 3 suites / 9 tests passed (health/routes, i18n, schema).
- Regression test verifies all deferred auth/profile routes return 404.
- Schema unchanged; prior 9-migration up/down/up and zero-drift verification remains applicable.

## Deferred / review notes

- Authentication/profile first, then B5 business APIs, RBAC/admin workflows, uploads, mail/queues, scheduler, seeders and OAuth.
- Dependency audit previously reported 5 high production findings in the NestJS/Multer chain; dependencies unchanged by extraction. Review remediation before production/upload delivery.
- Do not merge automatically.

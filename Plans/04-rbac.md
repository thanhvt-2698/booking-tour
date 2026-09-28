# Plan 04 — RBAC và Admin Authorization

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Đảm bảo endpoint admin được bảo vệ nhất quán, đồng thời tách authentication khỏi authorization và ownership.

## Phạm vi

- `Role` enum tối thiểu `USER`, `ADMIN`.
- `@Roles()` decorator và `RolesGuard`.
- User status guard cho account active/blocked.
- Admin user management tối thiểu: list, view, block/unblock, đổi role.

## API

```text
GET   /api/admin/users
GET   /api/admin/users/:id
PATCH /api/admin/users/:id/status
PATCH /api/admin/users/:id/role
```

## Implementation

1. Tạo guard/decorator trong `common`.
2. Chỉ cho phép admin đổi role/status; không cho self-demotion nếu hệ thống sẽ mất admin cuối.
3. Query admin users có filter, pagination và không trả password hash.
4. Map database constraint/state errors thành response chuẩn.

## Test và nghiệm thu

- Guest nhận `401`, user nhận `403`, admin truy cập được.
- User bị blocked không gọi được private API.
- User thường không tự nâng role.
- Không thể vô tình disable admin cuối cùng.
- E2E kiểm tra role guard trên ít nhất một endpoint.

## Phụ thuộc/loại trừ

Phụ thuộc Plans 02-03. Chưa quản lý permission granular hoặc ABAC.

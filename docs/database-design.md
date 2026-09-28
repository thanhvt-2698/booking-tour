# Booking Tour — Database Design

Tài liệu local mô tả database design dự kiến cho PostgreSQL. `docs/` được ignore theo chủ đích và không push lên repository.

## 1. ERD dạng ASCII

```text
                                   ┌──────────────────────┐
                                   │      categories      │
                                   ├──────────────────────┤
                                   │ PK id                │
                                   │    name UNIQUE       │
                                   │    slug UNIQUE       │
                                   │    status            │
                                   └──────────┬───────────┘
                                              │ 1
                                              │
                                              │ N
┌──────────────────────┐          ┌──────────▼───────────┐
│        users         │          │        tours          │
├──────────────────────┤          ├──────────────────────┤
│ PK id                │          │ PK id                │
│    email UNIQUE      │          │ FK category_id       │
│    password_hash     │          │    code UNIQUE       │         │
│    role              │          │    slug UNIQUE       │         │
│    status            │          │    title             │         │
│    bio               │          │    base_price        │         │
│    avatar_url        │          │    currency          │         │
│    created_at        │          │    status            │         │
│    updated_at        │          │    created_at        │         │
└──────┬───────────────┘          └───────┬───────────────┘         │
       │ 1                                │ 1                       │
       │                                  │                         │
       ├───────────────┐                  ├──────────────┐          │
       │ N             │ N                │ N            │ N        │
┌──────▼───────────┐ ┌─▼────────────────┐ ┌▼─────────────┐ ┌▼──────▼─────────┐
│  refresh_tokens  │ │     bookings     │ │tour_departures│ │   tour_images   │
├──────────────────┤ ├──────────────────┤ ├──────────────┤ ├─────────────────┤
│ PK id            │ │ PK id            │ │ PK id        │ │ PK id           │
│ FK user_id       │ │ FK user_id       │ │ FK tour_id   │ │ FK tour_id      │
│    token_hash    │ │ FK departure_id  │ │ start_at     │ │ storage_key     │
│    family_id     │ │    code UNIQUE    │ │ end_at       │ │ url             │
│    expires_at    │ │    quantity      │ │ capacity     │ │ original_name   │
│    revoked_at    │ │    unit_price    │ │ booked_seats │ │ mime_type       │
│    created_at    │ │    total_amount  │ │ status       │ │ size_bytes      │
└──────────────────┘ │    currency      │ └──────┬───────┘ │ sort_order      │
                     │    status        │        │ 1       └─────────────────┘
                     │    created_at    │        │
                     │    updated_at    │        │ N
                     └────────┬─────────┘  ┌────▼─────────────────┐
                              │ 1          │ bookings reference   │
                              │            │ the selected         │
                              │ N          │ departure            │
                     ┌────────▼─────────┐  └──────────────────────┘
                     │booking_status_   │
                     │histories         │
                     ├──────────────────┤
                     │ PK id            │
                     │ FK booking_id    │
                     │ FK actor_user_id │
                     │    from_status   │
                     │    to_status     │
                     │    reason        │
                     │    created_at    │
                     └──────────────────┘

┌──────────────────────┐             ┌──────────────────────┐
│        users         │ 1         N │       reviews        │
│      (reviewer)      ├─────────────┤                      │
└──────────────────────┘             ├──────────────────────┤
                                     │ PK id                │
┌──────────────────────┐ 1         N │ FK user_id           │
│        tours         ├─────────────┤ FK tour_id           │
│      (reviewed)      │             │ FK booking_id        │
└──────────────────────┘             │    rating            │
                                     │    body              │
                                     │    status            │
                                     │    created_at        │
                                     │    updated_at        │
                                     └──────────────────────┘
```

## 2. Quan hệ chính

```text
categories 1 ────── N tours
users      1 ────── N tours                 (created_by)
tours      1 ────── N tour_departures
tours      1 ────── N tour_images
users      1 ────── N refresh_tokens
users      1 ────── N bookings
tour_departures 1 ─ N bookings
bookings   1 ────── N booking_status_histories
users      1 ────── N booking_status_histories (actor_user_id, nullable)
users      1 ────── N reviews
tours      1 ────── N reviews
bookings   1 ────── N reviews                 (booking_id, policy-dependent)
```

## 3. Bảng và field đề xuất

### `users`

| Field | Type | Constraint | Mô tả |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | User identifier |
| `email` | `varchar(254)` | UNIQUE, NOT NULL | Normalize lowercase |
| `password_hash` | `varchar(255)` | NULLABLE | Null nếu user chỉ dùng OAuth |
| `role` | enum | NOT NULL, default `USER` | `USER` hoặc `ADMIN` |
| `status` | enum | NOT NULL, default `ACTIVE` | `ACTIVE` hoặc `BLOCKED` |
| `bio` | `text` | NULLABLE | Profile description |
| `avatar_url` | `varchar(2048)` | NULLABLE | URL/reference ảnh đại diện |
| `created_at` | `timestamptz` | NOT NULL | Audit |
| `updated_at` | `timestamptz` | NOT NULL | Audit |

### `refresh_tokens`

Lưu hash của refresh token, không lưu raw token. Dùng để rotate và revoke logout.

| Field | Type | Constraint | Mô tả |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Token record |
| `user_id` | `uuid` | FK `users.id`, CASCADE | Token owner |
| `token_hash` | `varchar(255)` | UNIQUE, NOT NULL | Hash token |
| `family_id` | `uuid` | NOT NULL | Token rotation family |
| `expires_at` | `timestamptz` | NOT NULL | Expiration |
| `revoked_at` | `timestamptz` | NULLABLE | Logout/reuse detection |
| `created_at` | `timestamptz` | NOT NULL | Audit |

### `categories`

| Field | Type | Constraint | Mô tả |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Category identifier |
| `name` | `varchar(100)` | UNIQUE, NOT NULL | Display name |
| `slug` | `varchar(120)` | UNIQUE, NOT NULL | URL/filter key |
| `description` | `text` | NULLABLE | Description |
| `status` | enum | NOT NULL, default `ACTIVE` | `ACTIVE`/`INACTIVE` |
| `created_at` | `timestamptz` | NOT NULL | Audit |
| `updated_at` | `timestamptz` | NOT NULL | Audit |

### `tours`

Đây là thông tin sản phẩm; không lưu một lịch khởi hành duy nhất trong bảng này.

| Field | Type | Constraint | Mô tả |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Tour identifier |
| `category_id` | `uuid` | FK `categories.id`, RESTRICT | Category |
| `created_by` | `uuid` | FK `users.id`, RESTRICT | Admin tạo tour |
| `code` | `varchar(50)` | UNIQUE, NOT NULL | Business code |
| `slug` | `varchar(180)` | UNIQUE, NOT NULL | Public URL key |
| `title` | `varchar(200)` | NOT NULL | Tour title |
| `description` | `text` | NOT NULL | Tour detail |
| `base_price` | `numeric(12,2)` | NOT NULL, >= 0 | Giá hiện tại, không dùng cho lịch sử booking |
| `currency` | `char(3)` | NOT NULL, default `VND` | Currency |
| `status` | enum | NOT NULL, default `DRAFT` | `DRAFT`/`PUBLISHED`/`ARCHIVED` |
| `created_at` | `timestamptz` | NOT NULL | Audit |
| `updated_at` | `timestamptz` | NOT NULL | Audit |

### `tour_departures`

Một tour có nhiều departure. Đây là bảng dùng để search theo ngày và kiểm soát capacity.

| Field | Type | Constraint | Mô tả |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Departure identifier |
| `tour_id` | `uuid` | FK `tours.id`, RESTRICT | Tour product |
| `start_at` | `timestamptz` | NOT NULL | Thời điểm bắt đầu |
| `end_at` | `timestamptz` | NOT NULL, > `start_at` | Thời điểm kết thúc |
| `booking_deadline` | `timestamptz` | NULLABLE | Hạn cuối nhận booking |
| `capacity` | `integer` | NOT NULL, > 0 | Tổng số chỗ |
| `booked_seats` | `integer` | NOT NULL, >= 0 | Số chỗ đã giữ |
| `status` | enum | NOT NULL, default `OPEN` | `OPEN`/`CLOSED`/`CANCELLED`/`COMPLETED` |
| `created_at` | `timestamptz` | NOT NULL | Audit |
| `updated_at` | `timestamptz` | NOT NULL | Audit |

Invariant quan trọng:

```text
0 <= booked_seats <= capacity
end_at > start_at
booking_deadline <= start_at nếu booking_deadline khác NULL
```

### `tour_images`

Lưu metadata file, không lưu binary trong PostgreSQL.

| Field | Type | Constraint | Mô tả |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Image identifier |
| `tour_id` | `uuid` | FK `tours.id`, CASCADE | Tour owner |
| `storage_key` | `varchar(500)` | UNIQUE, NOT NULL | Internal object/path key |
| `url` | `varchar(2048)` | NOT NULL | Public/signed URL |
| `original_name` | `varchar(255)` | NOT NULL | Tên hiển thị, không dùng làm path |
| `mime_type` | `varchar(100)` | NOT NULL | MIME đã validate |
| `size_bytes` | `bigint` | NOT NULL, > 0 | File size |
| `sort_order` | `integer` | NOT NULL, default `0` | Display order |
| `created_by` | `uuid` | FK `users.id`, RESTRICT | Admin upload |
| `created_at` | `timestamptz` | NOT NULL | Audit |

### `bookings`

Booking tham chiếu một departure cụ thể và lưu snapshot giá tại thời điểm đặt.

| Field | Type | Constraint | Mô tả |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Booking identifier |
| `booking_code` | `varchar(30)` | UNIQUE, NOT NULL | Mã hiển thị cho user |
| `user_id` | `uuid` | FK `users.id`, RESTRICT | Người đặt |
| `departure_id` | `uuid` | FK `tour_departures.id`, RESTRICT | Lịch đã chọn |
| `quantity` | `integer` | NOT NULL, > 0 | Số người/chỗ |
| `unit_price` | `numeric(12,2)` | NOT NULL, >= 0 | Snapshot đơn giá |
| `total_amount` | `numeric(12,2)` | NOT NULL, >= 0 | `quantity * unit_price` |
| `currency` | `char(3)` | NOT NULL | Currency snapshot |
| `status` | enum | NOT NULL, default `PENDING` | State machine |
| `cancel_reason` | `varchar(500)` | NULLABLE | Lý do hủy/reject |
| `created_at` | `timestamptz` | NOT NULL | Audit |
| `updated_at` | `timestamptz` | NOT NULL | Audit |

Booking status:

```text
PENDING ──────► APPROVED
   │
   ├───────────► REJECTED
   │
   └───────────► CANCELLED
```

### `booking_status_histories`

Audit mọi lần đổi trạng thái, phục vụ debug và admin review.

| Field | Type | Constraint | Mô tả |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | History identifier |
| `booking_id` | `uuid` | FK `bookings.id`, CASCADE | Booking |
| `actor_user_id` | `uuid` | FK `users.id`, SET NULL | User/admin thực hiện; null với system job |
| `from_status` | enum | NULLABLE | Null khi record đầu tiên |
| `to_status` | enum | NOT NULL | Status mới |
| `reason` | `varchar(500)` | NULLABLE | Lý do |
| `created_at` | `timestamptz` | NOT NULL | Audit |

### `reviews`

Review gắn với user và tour; `booking_id` giúp chứng minh eligibility.

| Field | Type | Constraint | Mô tả |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Review identifier |
| `user_id` | `uuid` | FK `users.id`, RESTRICT | Reviewer |
| `tour_id` | `uuid` | FK `tours.id`, RESTRICT | Tour được review |
| `booking_id` | `uuid` | FK `bookings.id`, RESTRICT | Booking đủ điều kiện |
| `rating` | `smallint` | NOT NULL, 1..5 | Điểm đánh giá |
| `body` | `text` | NOT NULL | Nội dung |
| `status` | enum | NOT NULL, default `PUBLISHED` | `PUBLISHED`/`HIDDEN`/`DELETED` |
| `created_at` | `timestamptz` | NOT NULL | Audit |
| `updated_at` | `timestamptz` | NOT NULL | Audit |

Unique đề xuất:

```text
UNIQUE (user_id, tour_id)
```

## 4. Foreign key policy

```text
users -> refresh_tokens              ON DELETE CASCADE
users -> bookings                    ON DELETE RESTRICT
users -> tours.created_by            ON DELETE RESTRICT
users -> reviews                     ON DELETE RESTRICT
users -> booking_status_histories    ON DELETE SET NULL
categories -> tours                  ON DELETE RESTRICT
tours -> tour_departures             ON DELETE RESTRICT
tours -> tour_images                 ON DELETE CASCADE
tours -> reviews                     ON DELETE RESTRICT
tour_departures -> bookings          ON DELETE RESTRICT
bookings -> booking_status_histories ON DELETE CASCADE
bookings -> reviews                  ON DELETE RESTRICT
```

Không hard-delete tour/departure đã có booking hoặc review; dùng `ARCHIVED`, `CANCELLED` hoặc moderation status.

## 5. Index đề xuất

```sql
CREATE UNIQUE INDEX users_email_unique ON users (email);
CREATE INDEX tours_status_category_idx ON tours (status, category_id);
CREATE UNIQUE INDEX tours_slug_unique ON tours (slug);
CREATE INDEX departures_search_idx
  ON tour_departures (status, start_at, end_at, tour_id);
CREATE INDEX bookings_user_created_idx
  ON bookings (user_id, created_at DESC, id DESC);
CREATE INDEX bookings_status_created_idx
  ON bookings (status, created_at DESC);
CREATE INDEX histories_booking_created_idx
  ON booking_status_histories (booking_id, created_at DESC);
CREATE UNIQUE INDEX reviews_user_tour_unique
  ON reviews (user_id, tour_id);
CREATE INDEX reviews_tour_status_created_idx
  ON reviews (tour_id, status, created_at DESC);
```

## 6. Transaction khi tạo booking

```text
BEGIN
  SELECT tour_departures
  WHERE id = :departureId
  FOR UPDATE;

  validate departure.status = OPEN
  validate booking_deadline chưa hết hạn
  validate booked_seats + quantity <= capacity

  UPDATE tour_departures
  SET booked_seats = booked_seats + :quantity;

  INSERT INTO bookings (...snapshot price..., status = PENDING);
  INSERT INTO booking_status_histories (..., to_status = PENDING);
COMMIT
```

Nếu thiếu capacity hoặc bất kỳ thao tác nào lỗi thì rollback toàn bộ. Email/Bull job chỉ enqueue sau khi transaction commit thành công.

## 7. Bảng không lưu trong database lõi

- Bull/Redis jobs: dữ liệu queue nằm ở Redis; có thể thêm bảng notification log ở phase hardening nếu cần audit dài hạn.
- File binary: lưu ở local storage hoặc S3-compatible storage; PostgreSQL chỉ lưu metadata trong `tour_images`.
- Access JWT: stateless, không lưu; refresh token mới cần lưu để revoke/logout.

# B4 — Entities, relations và migrations

## Đối chiếu hiện tại

- Có 10 entity và 9 file migration tạo 10 bảng ở HEAD `feature/social-login`.
- Có 13 FOREIGN KEY trong SQL migration, nhưng **chưa có ORM relations decorators** ở entity. Có cột `userId`/`tourId` không đồng nghĩa đã khai báo TypeORM relation.
- Entities/migrations đang nằm chung các commit feature. B4 phải tách phần schema ra trước B5, không merge toàn bộ business API để lấy schema.
- B3 đã sở hữu users/refresh_tokens và migration tương ứng: B4 chỉ bổ sung quan hệ/metadata, không tạo lại hai bảng.

## Cắt PR và nguồn code

1. B4.1 Catalog schema: category/tour/departure/image entity + constants + migrations từ `feature/categories`, `feature/tour-catalog`, `feature/tour-departures`, `feature/tour-images`; bổ sung relations. Base: B3.
2. B4.2 Booking schema: booking/history/review entity + constants + migrations từ `feature/user-bookings`, `feature/reviews`; bổ sung relations. Base: B4.1.
3. B4.3 Identity relations/schema: refresh-token → user, social account entity/migration từ `feature/social-login` và các inverse relation còn lại. Base: B4.2. Chỉ schema social, chưa bật OAuth.

Nhánh đề xuất chưa tạo: `codex/b4-catalog-schema`, `codex/b4-booking-schema`, `codex/b4-identity-relations`. Dùng thứ tự trên vì các PR cùng sửa UserEntity/inverse relations; không gọi chúng hoàn toàn độc lập.

## Mapping bắt buộc

Mỗi dòng: phía child dùng ManyToOne + JoinColumn trỏ đúng tên cột; parent dùng OneToMany inverse tương ứng. Mọi quan hệ bên parent đều có thể có 0..N bản ghi con.

| Child / FK | Parent | Nullable FK | ON DELETE |
| --- | --- | --- | --- |
| refresh_tokens.user_id | users.id | Không | CASCADE |
| social_accounts.user_id | users.id | Không | CASCADE |
| tours.category_id | categories.id | Không | RESTRICT |
| tours.created_by | users.id | Không | RESTRICT |
| tour_departures.tour_id | tours.id | Không | RESTRICT |
| tour_images.tour_id | tours.id | Không | CASCADE |
| bookings.user_id | users.id | Không | RESTRICT |
| bookings.departure_id | tour_departures.id | Không | RESTRICT |
| booking_status_histories.booking_id | bookings.id | Không | CASCADE |
| booking_status_histories.actor_user_id | users.id | Có | SET NULL |
| reviews.user_id | users.id | Không | RESTRICT |
| reviews.tour_id | tours.id | Không | RESTRICT |
| reviews.booking_id | bookings.id | Không | RESTRICT |

## Quy tắc triển khai

- Giữ scalar FK (`userId`, `tourId`...) để service hiện tại hoạt động; JoinColumn phải dùng chính cột đó, không sinh cột FK thứ hai.
- Không eager-load hoặc cascade write mặc định; query chọn relation rõ ràng để tránh N+1 và lộ thông tin user. DB ON DELETE không đồng nghĩa TypeORM cascade save/remove.
- Kiểm tra enumName, defaults, nullable, unique/index/check constraint giữa entity và SQL. Ví dụ enum BookingStatus trong booking/history phải map về enum DB hiện có, không tự tạo enum mới theo tên cột.
- Không đổi reviews.booking_id thành OneToOne: DB hiện không có unique booking_id; chỉ unique(user_id, tour_id).
- Giữ timestamp/tên migration cũ, thứ tự FK hợp lệ. Không sửa migration đã chạy ở DB dùng chung. Nếu cần thay schema thực tế, thêm migration mới có review; relation metadata đúng có thể không cần thay DB.
- Tách entity/constants khỏi imports nghiệp vụ. Không kéo controller/service/Bull/OAuth vào PR schema; register metadata cần thiết để kiểm thử.

## Gate hoàn thành B4

- [ ] Đủ 10 entity, 13 FK và ORM relation tương ứng; 9 migrations cũ chạy đúng thứ tự.
- [ ] Test metadata và integration join/inverse, optional actor, uniqueness và ON DELETE.
- [ ] Migrate DB test trống và upgrade từ B3; so schema DB với metadata bằng diff read-only, review mọi drift trước generate/run migration.
- [ ] Test down/up chỉ trên DB test bỏ được; không revert/reset DB người dùng.
- [ ] Response mapper không serialize vòng lặp hoặc password khi thêm relation.
- [ ] ERD/docs đồng bộ schema, nhưng file docs vẫn local/gitignored.
- [ ] B4 merge xong trước delivery controller/service nghiệp vụ B5.

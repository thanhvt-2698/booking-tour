# Plan 15 — Seeder và CLI/Console

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Có dữ liệu development/test lặp lại được để debug, demo và chạy e2e fixture nhanh.

## Commands

```text
npm run db:seed
npm run db:seed:reset
```

Có thể dùng Nest application context hoặc `nest-commander`; command không start HTTP server.

## Seed groups

- Admin user với password lấy từ environment/secret dev.
- Categories.
- Published/draft tours.
- Multiple departures gồm open/full/cancelled/completed.
- Optional users/bookings/reviews cho demo.

## Rule

- Idempotent theo stable key/slug/email.
- Reset chỉ được phép ở development/test và phải có guard rõ ràng.
- Không seed password production hoặc secret thật.
- Console log có prefix và summary count.

## Test và nghiệm thu

- Chạy seed hai lần không duplicate.
- Reset không chạy được ở production.
- Seed tạo đủ fixture cho public search và booking flow.
- CLI exit code khác 0 khi database/config lỗi.

## Phụ thuộc/loại trừ

Phụ thuộc Plans 02, 05, 06, 07. Không seed qua HTTP endpoint.

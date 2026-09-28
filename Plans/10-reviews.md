# Plan 10 — Reviews và Moderation

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Tách user review submission khỏi public read/moderation để ưu tiên hoàn thành luồng bắt buộc. User chỉ có thể review sau khi admin đã duyệt booking và departure đã kết thúc.

## API

```text
# 10a — User Review Submission
POST   /api/tours/:tourId/reviews

# 10b — Public Review Read + Moderation
GET    /api/tours/:tourId/reviews
PATCH  /api/tours/:tourId/reviews/:reviewId
DELETE /api/tours/:tourId/reviews/:reviewId
DELETE /api/admin/reviews/:reviewId
```

## Rule đề xuất

- Chỉ booking `APPROVED` có departure `endAt` đã qua mới review được.
- Mỗi user một review cho một tour.
- Public chỉ thấy review published; admin có thể hide/delete.
- User chỉ sửa/xóa review của mình.

## Implementation và test

- 10a: dùng entity/schema/index unique `(userId, tourId)` đã có từ Foundation, `POST` review, rating 1-5, body length limit, eligibility query tránh N+1 và test user ownership/eligibility.
- 10b: public list, owner update/delete, admin moderation, pagination và stable ordering.

## Phụ thuộc/loại trừ

10a phụ thuộc Plans 06, 08 và 09. 10b delivery sau 10a và phụ thuộc RBAC. Không triển khai rating aggregate/cache trong hai PR này.

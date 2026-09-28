# Plan 07 — Departure, Capacity và Search theo ngày

> Cập nhật delivery B3–B5: xem [README](README.md) và các plan B3/B4/B5. File này giữ đặc tả feature; thứ tự/phụ thuộc delivery mới có ưu tiên hơn phần cũ. Entity/migration hiện có được tách sang B3 hoặc B4 theo mapping; B5 không tạo lại schema. Mọi API B5 phải tích hợp i18n của B3 và giữ controller không có business logic.

## Mục tiêu

Tách lịch khởi hành khỏi tour để hỗ trợ nhiều đợt khởi hành và làm cơ sở chống overbooking.

## API

```text
GET    /api/tours/:tourId/departures
POST   /api/admin/tours/:tourId/departures
PATCH  /api/admin/departures/:id
DELETE /api/admin/departures/:id
GET    /api/tours?departureFrom=<YYYY-MM-DD>&departureTo=<YYYY-MM-DD>
```

Quy ước tìm kiếm ngày: phải truyền đồng thời cả hai query parameter theo định dạng `YYYY-MM-DD`. Cả ngày bắt đầu và ngày kết thúc đều được tính; cho phép tìm một ngày với `departureFrom = departureTo`. Service quy đổi thành khoảng UTC nửa mở từ đầu ngày bắt đầu đến đầu ngày kế tiếp của ngày kết thúc, rồi lọc lịch giao với khoảng này: `start_at < departureTo AND end_at > departureFrom`. Hai khoảng chỉ chạm nhau ở một đầu mút thì không được coi là giao nhau.

## Data model

`TourDeparture`: tour id, start date, end date, capacity, booked seats, status (`OPEN`, `CLOSED`, `CANCELLED`, `COMPLETED`), timestamps.

## Implementation

- Validate end date sau start date, capacity dương.
- Dùng lại index `tour_id,start_at` và `status,start_at,end_at` hiện có; không lặp schema/migration. Chỉ xem xét đổi index khi có bằng chứng từ query plan.
- Tìm kiếm công khai chỉ trả tour đã publish có lịch giao nhau, đang mở, còn chỗ, chưa khởi hành và hạn đặt còn hiệu lực hoặc không đặt hạn.
- Dùng correlated `EXISTS` để nhiều lịch phù hợp không làm lặp tour; giữ pagination ổn định và danh sách field response hiện có.
- Stable pagination; tránh N+1 khi trả departure summary.
- Không cho sửa capacity xuống dưới số ghế đã đặt.

## Test và nghiệm thu

- Kiểm tra đủ hai ngày `YYYY-MM-DD` và `departureFrom <= departureTo`.
- Test biên khoảng nửa mở nội bộ, một ngày, giao nhau và các lịch không khả dụng không làm tour xuất hiện trong kết quả.
- Không trả departure cancelled/closed cho public booking flow.
- Reject capacity invalid và ngày invalid.
- Admin không xóa departure đã có booking; dùng cancel/archive.
- Test query count và pagination với nhiều departure.

## Phụ thuộc/loại trừ

Phụ thuộc Plan 06. Chưa tạo booking và chưa gửi reminder.

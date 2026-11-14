# Gợi ý giải thích khi interview

## 1. Vì sao chọn kiến trúc này?

“Em dùng một Next.js app, route handlers cho API và SQLite. Quy mô đề chỉ có một club với chín tháng dữ liệu nên em ưu tiên dễ chạy, ít thành phần và metric có thể kiểm chứng. Frontend vẫn gọi JSON API, không truy cập DB trực tiếp, để mobile có thể dùng lại.”

- Được: một tiến trình, không phải deploy backend riêng, không thêm CORS hay đồng bộ DTO giữa hai project.
- Đổi lại: frontend/backend cùng release; truy vấn SQLite đồng bộ và tính toán trong bộ nhớ sẽ giới hạn throughput.
- Khi cần đổi: nhiều club, dữ liệu lớn hoặc nhiều request đồng thời thì chuyển aggregation xuống SQL, phân trang chi tiết và cân nhắc DB/server riêng.

## 2. Vì sao không dùng ORM, Redux và chart library?

“Schema nhỏ, API chỉ đọc và có bốn bảng. Em dùng SQL parameterized, React state và CSS bars. Các component card, chart, dialog tách riêng; metric là hàm thuần dùng chung cho summary và chart.”

- SQLite built-in giảm dependency native, nhưng yêu cầu Node 26.13.1 LTS và chưa có migration framework.
- React state đủ cho hai bộ lọc và một metric được chọn; chưa cần global store.
- Chart đơn giản dễ audit; bảng dữ liệu hỗ trợ người đọc màn hình. Khi cần zoom, tooltip phức tạp hay nhiều series thì dùng chart library.
- Một response có cả summary và drill-down giúp dữ liệu nhất quán và ít endpoint; đổi lại overfetch, nên phân trang khi tăng quy mô.

## 3. Metric khó nhất: no-show

“Không ghi attendance không chứng minh là không có ai vắng. API trả null khi hoàn toàn chưa biết; biết một phần thì trả số vắng đã quan sát và số booking chưa biết. UI không tô xanh khi số no-show giảm vì có thể chỉ do kỳ này ghi ít hơn.”

Ví dụ: buổi A có 8 present, 2 absent; buổi B có 10 booking chưa ghi nhận. Kết quả là **2 recorded no-shows, 10 unknown bookings, booking coverage 50%**, không phải 2 no-shows trên tổng attendance đầy đủ. Nếu cả hai buổi đều chưa ghi nhận thì hiển thị “Unknown”, không phải 0.

Test quan trọng: attendance flag của session là false thì attendance có sẵn trong booking cũng không được coi là đáng tin. Booking bị hủy luôn bị loại. Session đã ghi attendance nhưng vẫn còn ô trống thì những booking đó vẫn unknown.

## 4. Active player có nghĩa gì?

“Em chọn người có booking không hủy ở buổi đã kết thúc. Đây là participation qua booking, gồm cả no-show. Nếu định nghĩa là người thực sự đến chơi thì attendance thiếu sẽ gây undercount. Em công khai định nghĩa trên card và sẽ xác nhận lại với host trước khi production.”

Một người chơi hai tuần vẫn chỉ tính một lần cho cả kỳ; do đó tổng weekly uniques có thể lớn hơn period uniques. UI có giải thích điều này.

## 5. Date/time và kỳ so sánh

“Em đổi timestamp UTC sang ngày trong IANA timezone của club trước khi xếp session vào kỳ và tuần. Các phép cộng ngày dùng UTC như lịch thuần túy, không coi UTC midnight là midnight của club.”

- Chủ nhật 17:00 UTC đã là thứ Hai 00:00 tại TP.HCM.
- Chỉ session có end <= thời điểm cố định trong đề mới được tính là held.
- Chọn 28 ngày thì kỳ trước cũng 28 ngày; tuần đầu/cuối bị cắt bởi range sẽ đánh dấu partial.
- Baseline bằng 0 không tính phần trăm tăng vô hạn.

## 6. Cách đọc CSV gốc

CSV dùng `duration_minutes` nên thời điểm kết thúc được tính từ `starts_at` cộng duration. Các session đã diễn ra vẫn có status `scheduled`: không được chờ status `completed` mới tính là held.

Booking `status=booked` được ánh xạ sang `confirmed` trong model nội bộ. `attended=true` là present, `false` là absent, ô trống là unknown. Chỉ dùng attended khi session có `attendance_recorded=true` và booking chưa hủy.

Bộ dữ liệu gốc có 2 clubs, 260 players, 195 sessions và 1.893 bookings. Kỳ mặc định 7/9–4/10/2026 có 93 active players, 20 held sessions, 15 recorded no-shows và 113 booking chưa biết attendance. Những số này được tính độc lập từ CSV và lưu thành regression test.

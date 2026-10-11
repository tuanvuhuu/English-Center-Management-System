# 13. Sổ quyết định

Còn 20 quyết định nghiệp vụ cần chốt. Mỗi quyết định đã có một đề xuất mặc định để các file khác viết được quy tắc. Khi chủ dự án chốt, cập nhật cột "Trạng thái" và cột "Đề xuất mặc định" (nếu khác).

**Ưu tiên chốt trước:** QĐ-01 → QĐ-05, QĐ-11, QĐ-18.

| Mã | Câu hỏi | Đề xuất mặc định | File | Trạng thái |
| --- | --- | --- | --- | --- |
| QĐ-01 | Hình thức bán khóa học | Khóa cố định là chính; gói buổi cho kèm 1-1; theo tháng chỉ bật khi cần | 02, 04 | Chưa chốt |
| QĐ-02 | Vắng học có bị trừ buổi không | Mọi buổi lớp diễn ra đều trừ 1; vắng có phép (báo trước 24 giờ) được 1 quyền bù, hạn 30 ngày, tối đa 20% số buổi khóa | 04, 06 | Chưa chốt |
| QĐ-03 | Chính sách bảo lưu | Tối đa 3 tháng, 1 lần mỗi ghi danh, miễn phí; hết hạn mà không quay lại thì chuyển Ngừng học, số dư giữ 6 tháng | 04 | Chưa chốt |
| QĐ-04 | Công thức hoàn phí | Buổi còn lại × đơn giá thực trả − ưu đãi thu hồi − phí xử lý 10%; không hoàn sau khi học quá 50% khóa; trung tâm hủy lớp thì hoàn 100% | 04, 07 | Chưa chốt |
| QĐ-05 | Liên thông giữa 4 trung tâm | Cho học bù và chuyển trung tâm; doanh thu ghi nhận tại nơi học thực tế | 04, 05, 07 | Chưa chốt |
| QĐ-06 | Mốc năm học | 1/6 – 31/5; lớp thuộc năm học theo ngày khai giảng | 01 | Chưa chốt |
| QĐ-07 | Cộng dồn ưu đãi | Tối đa 2 ưu đãi, tổng không quá 30%; học bổng xét riêng | 07 | Chưa chốt |
| QĐ-08 | Trả góp | Tối đa 3 đợt, đợt đầu ≥ 40%, trả xong trước giữa khóa | 07 | Chưa chốt |
| QĐ-09 | Khóa điểm danh | Khóa sau 48 giờ; mở lại cần quản lý trung tâm duyệt | 06 | Chưa chốt |
| QĐ-10 | Thù lao khi buổi bị hủy | Trung tâm hủy dưới 24 giờ trước buổi: trả 50%; giáo viên tự hủy: không trả | 08 | Chưa chốt |
| QĐ-11 | Pháp nhân và hóa đơn | Cần xác nhận 4 trung tâm là mấy pháp nhân và có phải xuất hóa đơn điện tử không | 01, 07 | Chưa chốt |
| QĐ-12 | Kênh thông báo | Zalo OA là kênh chính; SMS cho tin khẩn | 10 | Chưa chốt |
| QĐ-13 | Thời điểm làm cổng phụ huynh | Thông báo tự động ở giai đoạn 1; cổng đầy đủ ở giai đoạn 2 | 10 | Chưa chốt |
| QĐ-14 | Hoa hồng tư vấn | Tính % trên tiền thực thu; thu hồi nếu hoàn phí trong 30 ngày | 09 | Chưa chốt |
| QĐ-15 | Học thử | Miễn phí 1 buổi, không tính vào khóa | 04, 09 | Chưa chốt |
| QĐ-16 | Chuyển nhượng khóa học | Chỉ cho anh chị em ruột, cần quản lý duyệt | 04 | Chưa chốt |
| QĐ-17 | Sĩ số lớp | Mở lớp khi đủ từ 6 học viên; tối đa 15 (lớp thiếu nhi 12) | 05 | Chưa chốt |
| QĐ-18 | Số dư đầu kỳ khi chuyển sang hệ thống mới | Nhập số buổi còn lại và công nợ của từng học viên tại một ngày chốt, đối chiếu với phụ huynh trước khi chạy | 04, 07 | Chưa chốt |
| QĐ-19 | Ngưỡng duyệt cấp cao | Hoàn phí trên 5 triệu hoặc ưu đãi trên 20% phải do admin tổ chức duyệt | 07, 12 | Chưa chốt |
| QĐ-20 | Hiện trạng vận hành | Cần biết công cụ đang dùng và vấn đề gây đau đầu nhất hiện nay | Tất cả | Chưa chốt |

Các con số trong cột đề xuất là mức phổ biến để làm điểm xuất phát, chưa phải chính sách của trung tâm. Code phải để các tham số này **cấu hình được theo trung tâm**, không hard-code.

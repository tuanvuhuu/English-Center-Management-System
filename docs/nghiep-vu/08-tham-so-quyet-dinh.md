# 8. Tham số và quyết định

## Quyết định đã chốt

Bản này thay thế bộ tài liệu nhiều file trước đó. Các quyết định sau đã được chốt:

1. **Không có bước duyệt.** Hoàn phí, điều chỉnh, hủy phiếu, sửa điểm danh sau khóa đều có hiệu lực ngay khi người có quyền thực hiện. Kiểm soát bằng quyền theo vai trò, lý do bắt buộc và báo cáo bất thường.
2. **Cảnh báo sắp hết buổi ở mức ≤ 3.** Danh sách cần tái ghi danh ở mức ≤ 4. Hai ngưỡng là hai tham số riêng.
3. **Mô hình bán:** mua trọn khóa cho lớp nhóm. Không có gói buổi.
4. **Không có cổng phụ huynh, không gửi tin tự động** trong bản này.
5. **Bốn cơ sở dùng chung một hệ thống;** mỗi người dùng gán một cơ sở chính.

## Tham số

Các giá trị dưới đây là mặc định, cấu hình trong `packages/domain/src/policy.ts` (hoặc file tương đương của bản code).

| Tham số | Mặc định | Ghi chú |
| --- | --- | --- |
| Báo vắng trước buổi học | 24 giờ | Báo muộn hơn thì thành vắng không phép |
| Hạn quyền bù | 30 ngày | |
| Tối đa quyền bù cùng lúc | 20% số buổi của khóa | |
| Khóa điểm danh | 48 giờ | Sau đó chỉ quản lý sửa, có lý do |
| Bảo lưu | Tối đa 3 tháng, 1 lần | Miễn phí |
| Phí xử lý khi hoàn | 10% | Tính trên phần tiền hoàn |
| Không hoàn khi đã học quá | 50% số buổi | |
| Giảm giá | Tối đa 2 mức, tổng ≤ 30% | |
| Sĩ số tối đa | 15 | Lớp thiếu nhi: 12 |
| Cảnh báo lớp dưới sĩ số | Dưới 6 học viên | |
| Cảnh báo sắp hết buổi | ≤ 3 buổi | |
| Danh sách cần tái ghi danh | ≤ 4 buổi | |
| Công giáo viên khi trung tâm hủy | Trả 50% nếu hủy dưới 24 giờ | |
| Điểm tối đa bài kiểm tra mặc định | 10 | |
| Số ngày hủy phiếu thu | Cùng ngày | Sau ngày thì lập điều chỉnh |

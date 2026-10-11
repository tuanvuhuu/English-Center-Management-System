# 0. Tổng quan

Hệ thống nội bộ cho một tổ chức tiếng Anh có **4 cơ sở**, dùng **5–6 người**. Bản này làm gọn: chỉ giữ những việc người dùng làm hằng ngày, bỏ những gì chưa có nhu cầu thật.

Ba câu hỏi hệ thống phải trả lời nhanh:
1. Học viên còn bao nhiêu buổi?
2. Học viên còn nợ bao nhiêu?
3. Hôm nay lớp nào học ở đâu, với ai?

## Nguyên tắc

1. **Số buổi còn lại và số tiền còn nợ luôn tính từ lịch sử** (buổi đã diễn ra, phiếu thu, phiếu điều chỉnh). Không có ô để sửa tay con số này.
2. **Không xóa dữ liệu đã phát sinh.** Sai thì hủy có lý do, hoặc tạo bản điều chỉnh.
3. **Mọi thay đổi quan trọng ghi nhật ký**: ai làm, lúc nào, giá trị cũ → mới, lý do.
4. **Không có bước duyệt.** Người có quyền thì thao tác có hiệu lực ngay. Kiểm soát bằng quyền theo vai trò, lý do bắt buộc và báo cáo bất thường.
5. **Chỉ thêm khi có việc thật cần.** Việc nào chưa cần thì đưa vào mục "để sau".

## Phạm vi bản này

| Mảng | Làm | Để sau |
| --- | --- | --- |
| Học viên | Hồ sơ, phụ huynh (một người liên hệ), cảnh báo trùng số điện thoại | Gộp hồ sơ tự động, cổng phụ huynh |
| Khóa và giá | Khóa học, giá theo từng cơ sở | Ngày hiệu lực của giá, combo, gói buổi |
| Lớp và lịch | Mở lớp, lịch lặp, ngày nghỉ, hủy buổi, dời buổi, đổi giáo viên | Đóng cửa hàng loạt, gộp lớp, lớp online |
| Ghi danh và điểm danh | Ghi danh, đổi lớp cùng khóa, bảo lưu, điểm danh, quyền bù | Chuyển cơ sở, chuyển nhượng, gia hạn, danh sách chờ tự động |
| Thu tiền | Giảm giá, phiếu thu, công nợ, hủy phiếu, điều chỉnh, hoàn phí | Trả góp có lịch, phiếu chi, hóa đơn điện tử, khóa sổ |
| Giáo viên | Hồ sơ, đơn giá theo buổi, bảng công tháng | Phụ cấp, giấy tờ, dự giờ |
| Tuyển sinh | Khách tiềm năng, trạng thái, chuyển thành học viên | Hoa hồng, phân công tự động, chiến dịch |
| Điểm | Bài kiểm tra theo lớp, nhập điểm, nhận xét ngắn | Rubric kỹ năng, chứng nhận, kết quả cuối khóa tự động |
| Báo cáo | Trang chủ theo cơ sở, báo cáo tháng, xuất CSV | Phân tích xu hướng, báo cáo nâng cao |
| Nhật ký | Mọi thay đổi về tiền, buổi, điểm danh, điểm, giá, người dùng | — |

## Quy mô

- 4 cơ sở, một hệ thống. Mỗi người dùng được gán một cơ sở; tài khoản quản trị xem được tất cả.
- 5–6 người dùng nội bộ. Không có tài khoản cho phụ huynh, không gửi tin tự động.
- Số liệu nhỏ, nên ưu tiên dễ đọc và dễ sửa hơn là tối ưu.

Các con số cụ thể (ngưỡng, thời hạn, phí) nằm ở [08-tham-so-quyet-dinh.md](08-tham-so-quyet-dinh.md).

# 2. Học viên, khóa học, lớp và lịch

## Học viên

- **Thông tin:** họ tên, ngày sinh (không bắt buộc), trường, ghi chú.
- **Phụ huynh:** một người liên hệ, gồm tên, số điện thoại (bắt buộc) và quan hệ với học viên.
- **Mã học viên** tự sinh, duy nhất, không dùng lại.
- **Cảnh báo trùng:** khi tạo mới, nếu số điện thoại phụ huynh và họ tên trùng với hồ sơ có sẵn thì hiện cảnh báo. Không chặn tạo mới; người tạo quyết định.
- **Không xóa** học viên đã có ghi danh. Chuyển trạng thái sang "Ngừng" thay vì xóa.

## Khóa học và giá

- **Khóa học:** mã, tên, cấp độ (không bắt buộc), số buổi chuẩn, số phút mỗi buổi.
- **Mô hình bán:** mua trọn khóa. Không có gói buổi trong bản này.
- **Giá:** mỗi cơ sở một giá (VND). Cơ sở nào ngừng bán khóa thì khóa đó ẩn ở cơ sở đó.
- **Đổi giá hoặc đổi số buổi chuẩn** chỉ áp dụng cho ghi danh mới. Ghi danh đã ký giữ giá đã ký.
- **Khóa đã có người học** không xóa, chỉ ngừng bán.

## Lớp

- **Thông tin:** mã lớp, khóa học, cơ sở, phòng, giáo viên chính, lịch lặp (thứ trong tuần, giờ bắt đầu, số phút), ngày khai giảng, sĩ số tối đa.
- **Sĩ số tối đa:** 15 mặc định; lớp thiếu nhi 12.
- **Trạng thái lớp:** Đang tuyển → Đang học → Kết thúc. Có thể chuyển sang Đã hủy.
- **Kiểm tra khi lưu lớp:** trùng phòng và trùng giáo viên trong cùng khung giờ thì báo lỗi.
- **Sinh buổi:** theo lịch lặp, bỏ qua ngày nghỉ, dừng khi đủ số buổi chuẩn. Ngày kết thúc tính tự động.
- **Cảnh báo sĩ số:** đến ngày khai giảng mà lớp có ít hơn 6 học viên thì hiện cảnh báo. Không chặn.
- **Hủy lớp:** mỗi ghi danh còn hiệu lực được chọn một trong hai cách, khi hủy: chuyển sang lớp khác cùng khóa, hoặc hoàn 100% phần chưa học (không tính phí xử lý).

## Ngày nghỉ

- Ngày nghỉ áp dụng cho **toàn hệ thống** hoặc **một cơ sở**.
- Khi thêm ngày nghỉ, hệ thống liệt kê các buổi bị ảnh hưởng. Mỗi buổi được **nối vào cuối lớp**, học viên không mất buổi.

## Buổi học

- **Trạng thái:** Dự kiến · Đã dạy · Đã hủy · Đã dời.
- **Hủy buổi** (giáo viên ốm, sự cố): buổi được nối vào cuối lớp. Không trừ buổi của học viên. Bắt buộc có lý do.
- **Dời buổi** (đổi ngày, giờ hoặc phòng cho một buổi): không trừ buổi của học viên. Bắt buộc có lý do.
- **Đổi giáo viên chính từ một ngày:** áp dụng cho các buổi từ ngày đó trở đi.
- **Buổi đã dạy** (giáo viên đã xác nhận): không đổi ngày, giờ, phòng.

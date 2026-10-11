# 7. Trang chủ, báo cáo và nhật ký

## Trang chủ theo cơ sở

Hiển thị ngay khi đăng nhập, theo cơ sở của người dùng (admin chọn cơ sở hoặc xem tất cả):

- **Hôm nay:** các buổi học, phòng, giáo viên; buổi chưa điểm danh; buổi giáo viên chưa xác nhận.
- **Sắp hết buổi:** học viên còn **≤ 3 buổi**.
- **Cần tái ghi danh:** học viên còn **≤ 4 buổi** và khóa chưa hoàn thành.
- **Lớp dưới sĩ số:** lớp có ít hơn 6 học viên trong 14 ngày tới.
- **Công nợ:** tổng số tiền nợ và số học viên đang nợ.
- **Thu trong tháng:** tổng phiếu thu còn hiệu lực trong tháng hiện tại, trừ phiếu hủy.

## Báo cáo tháng

- Theo cơ sở, hoặc gộp bốn cơ sở (chỉ admin).
- Các cột: sĩ số đang học, học viên mới, học viên nghỉ, thu trong tháng, công nợ cuối tháng, hoàn phí, số buổi đã dạy, tiền công giáo viên.
- **Xuất CSV** để mở bằng Excel. Không làm định dạng Excel riêng trong bản này.

## Nhật ký

- **Ghi lại:** ai, lúc nào, làm gì, giá trị cũ → mới, lý do (nếu có), cơ sở.
- **Ghi cho:** phiếu thu, phiếu điều chỉnh, hoàn phí, điểm danh (kể cả sửa sau khóa), buổi (hủy, dời, đổi giáo viên), ghi danh (đổi lớp, bảo lưu, nghỉ), giảm giá, điểm và lịch sử sửa điểm, khóa học và giá, lớp, người dùng.
- **Không ai sửa hoặc xóa được nhật ký**, kể cả admin.
- **Xem nhật ký:** admin xem tất cả; quản lý xem cơ sở của mình.

## Báo cáo bất thường

Danh sách các việc cần người quản lý để ý, lọc theo tháng và cơ sở:

- Hủy phiếu thu hoặc phiếu điều chỉnh.
- Hoàn phí (kèm số tiền và số buổi).
- Sửa điểm danh sau khóa.
- Sửa điểm đã nhập.
- Hủy hoặc dời buổi nhiều lần trong một lớp.

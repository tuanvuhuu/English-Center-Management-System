# 3. Ghi danh, số buổi và điểm danh

## Ghi danh

- Một ghi danh = **một học viên × một lớp × một cơ sở**, giá tính tại thời điểm ký.
- Số buổi mua = số buổi chuẩn của khóa.
- **Trạng thái:** Đang học · Bảo lưu · Đã nghỉ · Hoàn thành.
- **Cảnh báo trùng:** nếu học viên đã có ghi danh còn hiệu lực trong cùng khóa thì hiện cảnh báo. Không chặn.
- **Đổi lớp trong cùng khóa và cùng cơ sở:** giữ nguyên số buổi còn lại và số tiền.
- **Bảo lưu:** tối đa 3 tháng, một lần cho mỗi ghi danh, miễn phí. Trong thời gian bảo lưu không trừ buổi. Hết hạn mà không quay lại thì chuyển sang Đã nghỉ và xử lý như nghỉ học.
- **Đã nghỉ:** quản lý ghi lý do. Tiền hoàn xử lý theo [04-thu-tien-hoc-phi.md](04-thu-tien-hoc-phi.md), mục Hoàn phí.
- **Hoàn thành:** khi số buổi còn lại bằng 0 và đã học đủ.

## Số buổi còn lại

- **Số buổi còn lại = số buổi mua − số buổi đã trừ + các điều chỉnh (có lý do).**
- Mỗi buổi lớp đã diễn ra thì trừ 1 buổi của từng học viên trong lớp, theo trạng thái điểm danh (xem bên dưới).
- Buổi bị hủy, dời, hoặc nối cuối lớp không trừ buổi.
- Học viên và phụ huynh xem được: số buổi còn lại và số quyền bù còn hạn.
- Khi số buổi còn lại ≤ 3, dashboard cảnh báo (xem [07-bao-cao-nhat-ky.md](07-bao-cao-nhat-ky.md)).

## Điểm danh

Giáo viên điểm danh trong buổi học. Học vụ hoặc quản lý có thể sửa trong thời hạn khóa.

| Trạng thái | Trừ buổi | Ghi chú |
| --- | --- | --- |
| Có mặt | 1 | |
| Đi muộn | 1 | Tính như có mặt |
| Vắng có phép | 1 | Học viên báo trước ít nhất 24 giờ. Cấp 1 quyền bù, hạn 30 ngày |
| Vắng không phép | 1 | Báo muộn hơn 24 giờ hoặc không báo |
| Học bù | 0 | Học viên đến lớp khác để bù. Dùng 1 quyền bù |

- **Quyền bù:** tối đa 20% số buổi của khóa được có quyền bù cùng lúc. Quyền bù hết hạn sau 30 ngày thì mất, không trừ thêm buổi.
- **Xác nhận buổi:** giáo viên xác nhận đã dạy và ghi nội dung buổi. Đây là căn cứ tính bảng công.
- **Khóa điểm danh sau 48 giờ** kể từ khi buổi kết thúc. Sau đó chỉ quản lý sửa được, bắt buộc có lý do, và ghi nhật ký.
- **Nhắc khi chưa điểm danh:** buổi đã kết thúc mà chưa điểm danh thì hiện trên dashboard của học vụ và quản lý.

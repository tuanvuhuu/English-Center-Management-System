# 1. Người dùng và quyền

Có sáu vai trò. Mỗi người dùng có **một vai trò** và **một cơ sở chính**. Tài khoản quản trị (`admin`) xem và làm được ở mọi cơ sở. Tên trong ngoặc là mã vai trò trong code.

| Vai trò | Ai thường giữ | Làm được | Không làm được |
| --- | --- | --- | --- |
| Quản trị (`admin`) | Chủ hệ thống | Tất cả; sửa khóa, giá, tham số; tạo và khóa người dùng | — (mọi việc vẫn ghi nhật ký) |
| Quản lý (`manager`) | Quản lý cơ sở | Học viên, lớp, ghi danh, thu tiền, hoàn phí, điểm danh, báo cáo cơ sở; sửa điểm danh sau khóa (có lý do) | Sửa tham số toàn hệ thống; sửa nhật ký |
| Học vụ (`academic`) | Học vụ, điều phối lớp | Lớp, lịch, ngày nghỉ, hủy và dời buổi, điểm danh, bài kiểm tra, nhận xét | Thu tiền, hoàn phí |
| Lễ tân (`frontdesk`) | Lễ tân, tư vấn | Học viên, ghi danh, thu tiền, ghi báo vắng, khách tiềm năng | Hoàn phí; sửa điểm danh sau khóa |
| Kế toán (`accountant`) | Kế toán | Xem và lập phiếu thu, hủy phiếu (có lý do), điều chỉnh, hoàn phí, bảng công, báo cáo tài chính | Sửa lớp, lịch, điểm danh |
| Giáo viên (`teacher`) | Giáo viên | Điểm danh và xác nhận buổi của lớp mình; nhập điểm lớp mình; xem bảng công của mình | Xem lớp khác; xem tiền; xem số điện thoại phụ huynh (chỉ thấy 4 số đầu và 3 số cuối) |

## Nguyên tắc

- Một người chỉ có một vai trò. Nếu cần làm việc của hai vai trò, cấp vai trò cao hơn có phạm vi rộng hơn, không gộp.
- Nhân viên nghỉ việc: khóa tài khoản ngay, giữ nguyên lịch sử. Không xóa người dùng đã từng thao tác.
- Thao tác nhạy cảm (hủy phiếu thu, hoàn phí, điều chỉnh, sửa điểm danh sau khóa, sửa điểm đã nhập, dời hoặc hủy buổi) bắt buộc có lý do. Lý do lưu vào nhật ký.
- Không có bước duyệt (xem [08-tham-so-quyet-dinh.md](08-tham-so-quyet-dinh.md), mục "Quyết định đã chốt").

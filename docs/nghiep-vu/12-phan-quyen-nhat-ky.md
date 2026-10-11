# 12. Phân quyền & nhật ký thay đổi

Quyền được xác định bởi vai trò × phạm vi (toàn tổ chức, một số trung tâm, lớp của mình, con của mình). Thao tác nhạy cảm về tiền và buổi học cần hai người: một người tạo, một người duyệt.

## Ma trận quyền đề xuất

| Chức năng | Admin tổ chức | Quản lý TT | Học vụ | Giáo viên | Kế toán | Tuyển sinh / lễ tân | Phụ huynh |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chính sách, bảng giá | Toàn quyền | Ghi đè trong giới hạn | — | — | Xem | Xem | — |
| Hồ sơ học viên, phụ huynh | Xem tất cả | Toàn quyền trong TT | Xem, sửa phần học tập | Xem lớp mình (ẩn SĐT) | Xem | Tạo, sửa | Xem con mình |
| Ghi danh | Xem | Duyệt | Xếp lớp | — | Xem | Tạo | Xem |
| Lớp và lịch | Xem | Toàn quyền trong TT | Tạo, sửa | Xem lịch mình | — | Xem | Xem lịch của con |
| Điểm danh | Xem | Mở khóa, duyệt sửa | Xem, nhắc | Điểm danh lớp mình | Xem | Ghi nhận báo vắng | Báo vắng |
| Nhận xét, điểm số | Xem | Xem | Duyệt | Nhập | — | Xem | Xem sau khi duyệt |
| Thu tiền | Xem | Xem, duyệt hủy phiếu | — | — | Toàn quyền | Thu, in biên nhận | Xem, thanh toán |
| Ưu đãi vượt mức | Duyệt | Duyệt trong giới hạn | — | — | — | Đề xuất | — |
| Hoàn phí, điều chỉnh | Duyệt mức cao | Duyệt | — | — | Chi tiền | Tạo yêu cầu | Gửi yêu cầu |
| Thù lao giáo viên | Xem | Xem trong TT | — | Xem của mình | Toàn quyền | — | — |
| Báo cáo | Toàn bộ | Trung tâm mình | Học tập | Lớp mình | Tài chính | Tuyển sinh | — |

Ma trận này là điểm xuất phát; quyền cụ thể nên cấu hình được.

## Nguyên tắc

- Một người có thể giữ nhiều vai trò ở nhiều trung tâm.
- Tách nhiệm vụ: người tạo phiếu hoàn ≠ người duyệt ≠ người chi tiền.
- Ngưỡng duyệt theo số tiền, ví dụ hoàn trên 5 triệu phải do admin tổ chức duyệt (QĐ-19).
- Dữ liệu nhạy cảm (số điện thoại phụ huynh, thông tin trẻ em, thù lao) chỉ hiển thị cho vai trò cần.
- Nhân viên nghỉ việc: khóa tài khoản ngay, giữ nguyên lịch sử.

## Nhật ký thay đổi

- Ghi nhật ký cho: điểm danh, điểm số, phát sinh buổi, phiếu thu và phiếu chi, ưu đãi, hoàn phí, bảng giá, chính sách, quyền người dùng, gộp hồ sơ.
- Mỗi bản ghi gồm: ai, lúc nào, từ thiết bị nào, giá trị cũ → giá trị mới, lý do, người duyệt.
- Không ai sửa hoặc xóa được nhật ký, kể cả admin.
- Báo cáo bất thường: sửa điểm danh sau khi khóa, hủy phiếu thu, ưu đãi vượt mức, hoàn phí nhiều bất thường.
- Thời gian lưu trữ theo quy định lưu trữ chứng từ kế toán; cần kế toán xác nhận.

## Giai đoạn

Giai đoạn 1: vai trò, phạm vi theo trung tâm, duyệt hoàn phí và điều chỉnh, nhật ký cho dữ liệu tiền và buổi học. Giai đoạn 2: báo cáo bất thường, ngưỡng duyệt chi tiết.

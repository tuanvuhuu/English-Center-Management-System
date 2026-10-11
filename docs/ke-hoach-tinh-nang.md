# Kế hoạch tính năng — bản đơn giản

Cập nhật 11/10/2026. Căn cứ: `docs/nghiep-vu/00` đến `08`. Nền: nhánh `giai-doan-1/lam-lai` (Fastify + SQLite).

## 0. Tóm tắt

- **Quy mô:** 4 cơ sở, 5–6 người dùng nội bộ. Không cổng phụ huynh, không gửi tin tự động.
- **Hướng:** giữ phần lõi đã có trong lam-lai, bỏ luồng duyệt và các phần phức tạp chưa cần, bổ sung phần còn thiếu nhỏ, đồng bộ giao diện đỏ son.
- **Cơ sở dữ liệu:** SQLite (file `ecms.db`). `.data/pg` là PostgreSQL của nhánh m0, không dùng trong kế hoạch này.
- Chưa chạy lại test ở lần lập kế hoạch này. Trạng thái bên dưới đối chiếu mã nguồn lam-lai và tài liệu nghiệp vụ mới.

## 1. Hiện trạng và việc cần làm

Ký hiệu: **Giữ** = đã có, giữ nguyên · **Sửa** = có nhưng khác tài liệu mới · **Thêm** = chưa có · **Bỏ** = có trong code nhưng không còn trong bản này.

| Mảng | Hiện có (lam-lai) | Việc cần làm | Ghi chú |
| --- | --- | --- | --- |
| Học viên | Tạo, sửa, tìm, chống trùng khi tạo, che số điện thoại với giáo viên | Cảnh báo trùng theo số điện thoại và họ tên (đã có) · chuyển "Ngừng" thay vì xóa | Bỏ: gộp hồ sơ |
| Khóa và giá | Tạo khóa, giá theo cơ sở; ghi danh lưu giá lúc ký | **Thêm:** sửa khóa, ngừng bán theo cơ sở | Bỏ: ngày hiệu lực của giá |
| Cơ sở và phòng | Chỉ đọc | **Thêm:** tạo, sửa cơ sở và phòng | |
| Ngày nghỉ | Bảng có, sinh buổi có tính ngày nghỉ | **Thêm:** API và giao diện thêm ngày nghỉ; liệt kê buổi bị ảnh hưởng; nối buổi vào cuối lớp | Để sau: đóng cửa hàng loạt |
| Lớp | Tạo, sửa, chống trùng phòng và giáo viên, sinh buổi, hủy buổi (nối cuối lớp) | **Thêm:** hủy lớp (chuyển lớp hoặc hoàn 100%), cảnh báo dưới 6 học viên, đổi giáo viên từ một ngày, dời một buổi (ngày, giờ, phòng) | Bỏ: danh sách chờ, gộp lớp |
| Ghi danh | Tạo, giảm giá, đổi lớp, bảo lưu (đóng băng), trạng thái | **Sửa:** giảm giá tối đa 2 mức, tổng ≤ 30% · **Thêm:** nghỉ có lý do | Bỏ: gói buổi, học nợ (`maxSessionDebt`), chuyển khóa |
| Điểm danh | 5 trạng thái, khóa 48 giờ, sửa sau khóa có lý do | **Thêm:** quyền bù 30 ngày, tối đa 20% số buổi; học bù dùng quyền; nhắc buổi đã kết thúc chưa điểm danh | Bỏ: tự nhắn phụ huynh |
| Thu tiền | Phiếu thu, hủy phiếu, điều chỉnh, công nợ | **Sửa:** hủy phiếu chỉ trong cùng ngày; sau ngày chỉ lập điều chỉnh · **Thêm:** không cho thu vượt công nợ | Bỏ: phiếu chi, trả góp, đối soát, khóa sổ |
| Hoàn phí | Yêu cầu hoàn, duyệt bởi người thứ hai, ngưỡng duyệt cấp cao | **Sửa:** quản lý hoặc kế toán tạo và thực hiện luôn; công thức theo `04` | Bỏ: luồng duyệt, ngưỡng duyệt cấp cao |
| Giáo viên và bảng công | Hồ sơ, đơn giá theo giáo viên, bảng công | **Sửa:** công theo buổi đã xác nhận; trung tâm hủy dưới 24 giờ trả 50%; dạy thay tính cho người dạy thực tế | Bỏ: phụ cấp, giấy tờ, dự giờ |
| Tuyển sinh | Phễu đầy đủ, chuyển thành học viên, thống kê | **Sửa:** rút gọn trạng thái theo `06`; lý do bắt buộc khi không thành công | Bỏ: hoa hồng, phân công tự động |
| Điểm và nhận xét | Bài kiểm tra, nhập điểm, nhận xét | **Thêm:** lịch sử sửa điểm có lý do · kết quả cuối khóa chọn tay | Bỏ: rubric, chứng nhận |
| Trang chủ | KPI, sắp hết buổi (≤ 3), lớp dưới 6, buổi hôm nay | **Thêm:** cần tái ghi danh (≤ 4); buổi chưa điểm danh; công nợ theo cơ sở | |
| Báo cáo | Báo cáo bốn cơ sở (chỉ admin) | **Sửa:** báo cáo tháng theo cơ sở cho quản lý · **Thêm:** xuất CSV; danh sách bất thường | Bỏ: Excel riêng |
| Nhật ký | Bảng nhật ký có | **Sửa:** cũ → mới, lý do bắt buộc với thao tác nhạy cảm · **Thêm:** màn hình xem | Không ai sửa hoặc xóa được |
| Phân quyền | Sáu vai trò, gán cơ sở | **Sửa:** khớp ma trận `01` | Bỏ: quyền duyệt |
| Tham số | `policy.ts` một bộ mặc định | **Sửa:** theo bảng `08`; thêm ngưỡng cảnh báo, sĩ số thiếu nhi, điểm mặc định, thù lao hủy | Bỏ: ngưỡng duyệt, học nợ |
| Số dư đầu kỳ | Không có | **Thêm:** nhập số buổi còn lại và công nợ theo học viên tại một ngày chốt, dưới dạng điều chỉnh có lý do | Đối chiếu với giấy tờ cũ trước khi chạy thật |
| Giao diện | React + Vite, CSS riêng, màu cam | **Sửa:** đỏ son theo EMS; menu kéo và bảng thành thẻ trên điện thoại | Tham chiếu: nhánh m0, `apps/web/src/giao-dien/` và `khung/KhungUngDung.tsx` |

## 2. Thứ tự giao việc

Mỗi việc là một lượt giao cho Antigravity. Làm theo thứ tự; việc sau có thể phụ thuộc việc trước.

| Mã | Việc | Tiêu chí chấp nhận | Test bắt buộc |
| --- | --- | --- | --- |
| T-01 | Tham số theo `08` | `policy.ts` khớp bảng `08`; xóa ngưỡng duyệt và học nợ | Test từng tham số được dùng đúng chỗ |
| T-02 | Phân quyền theo `01` | Mỗi vai trò chỉ gọi được đúng API của mình; giáo viên không thấy tiền, không thấy số điện thoại đầy đủ | Test trả 403 cho từng vai trò |
| T-03 | Hoàn phí không duyệt | Bỏ yêu cầu và duyệt; hoàn trực tiếp; không hoàn khi học quá 50%; trung tâm hủy lớp hoàn 100%; trừ nợ trước; một giao dịch | Test các trường hợp trên và lỗi giữa chừng không để lại dữ liệu dở |
| T-04 | Hủy phiếu và điều chỉnh | Hủy trong ngày, bắt buộc lý do; sau ngày lập điều chỉnh; không thu vượt nợ | Test hủy đúng ngày, hủy sau ngày, thu vượt nợ |
| T-05 | Ngày nghỉ | API và giao diện thêm ngày nghỉ; liệt kê buổi ảnh hưởng; buổi nối cuối lớp | Test không trừ buổi của học viên |
| T-06 | Buổi học | Dời một buổi; đổi giáo viên từ một ngày; hủy buổi có lý do | Test dời và hủy không trừ buổi |
| T-07 | Lớp | Hủy lớp (chuyển lớp hoặc hoàn 100%); cảnh báo dưới 6 học viên; sĩ số tối đa theo khóa | Test hủy lớp không mất buổi hay tiền |
| T-08 | Điểm danh và quyền bù | Quyền bù 30 ngày; tối đa 20% số buổi; học bù dùng quyền không trừ buổi; nhắc buổi chưa điểm danh | Test quyền hết hạn không trừ thêm |
| T-09 | Ghi danh | Giảm giá tối đa 2 mức, tổng ≤ 30%; đổi lớp cùng khóa giữ số buổi; bảo lưu tối đa 3 tháng, một lần; nghỉ có lý do | Test bảo lưu lần hai bị chặn |
| T-10 | Bảng công | Công theo buổi đã xác nhận; trung tâm hủy dưới 24 giờ trả 50%; dạy thay tính cho người dạy thực tế; bảng công tháng theo cơ sở | Test từng trường hợp hủy buổi |
| T-11 | Tuyển sinh | Trạng thái theo `06`; lý do bắt buộc khi không thành công; cảnh báo trùng số điện thoại; chuyển thành học viên không nhập lại | Test chuyển thành học viên |
| T-12 | Điểm | Lịch sử sửa điểm có lý do; kết quả cuối khóa chọn tay | Test sửa điểm tạo dòng lịch sử |
| T-13 | Trang chủ và báo cáo | Cảnh báo ≤ 3 và ≤ 4; buổi chưa điểm danh; công nợ theo cơ sở; báo cáo tháng; xuất CSV; danh sách bất thường | Test số liệu khớp với sổ |
| T-14 | Nhật ký | Cũ → mới; lý do bắt buộc với thao tác nhạy cảm; không sửa, không xóa; màn hình xem | Test không có API sửa hoặc xóa nhật ký |
| T-15 | Số dư đầu kỳ | Nhập số buổi còn lại và công nợ tại một ngày chốt; dạng điều chỉnh có lý do; màn hình đối chiếu trước khi chạy | Test sau khi nhập, số dư và công nợ khớp file nhập |
| T-16 | Giao diện đỏ son | Theme khớp EMS; menu kéo và bảng thành thẻ trên điện thoại 360 px | Chụp màn hình sáng và tối |
| T-17 | Dọn dẹp | Gỡ code luồng duyệt, học nợ, gói buổi; cập nhật `README.md` | `npm test` xanh |

## 3. Không làm trong bản này

- Cổng phụ huynh, thông báo Zalo hoặc SMS tự động, ứng dụng PWA riêng cho giáo viên (web responsive là đủ).
- Trả góp có lịch đợt, phiếu chi, hóa đơn điện tử, khóa sổ tháng, đối soát ngày.
- Hoa hồng tư vấn, phân công tự động, chiến dịch tuyển sinh.
- Gói buổi, chuyển khóa khác khóa, chuyển cơ sở, chuyển nhượng, gia hạn gói, học bù liên cơ sở.
- Đóng cửa hàng loạt, gộp lớp giữa khóa, lớp online, danh sách chờ tự động.
- Dự giờ, giấy tờ giáo viên, phụ cấp, chấm điểm nguy cơ nghỉ học, khảo sát.

## 4. Quy tắc giao việc

- Đọc `CLAUDE.md` và `docs/nghiep-vu/` trước. Bất biến nghiệp vụ trong `CLAUDE.md` không được vi phạm.
- Không xóa file `ecms.db`. Không chạy lệnh xóa dữ liệu hoặc nạp lại dữ liệu mẫu trên file này khi chưa có yêu cầu.
- Không tự thêm bước duyệt. Nếu việc cần duyệt thì dừng và hỏi.
- Khi xong, báo cáo: file đã đổi, lệnh test đã chạy và kết quả, phần chưa làm, câu hỏi mở.

Khung giao một việc:

```text
Nhánh: giai-doan-1/lam-lai
Đọc trước: CLAUDE.md; docs/nghiep-vu/ (các file liên quan đến việc)
Việc: <mã và tên, ví dụ T-03 Hoàn phí không duyệt>
Phạm vi: <copy từ mục 2 của kế hoạch này>
Không làm: xóa file ecms.db; thêm bước duyệt; làm việc thuộc mục 3
Tiêu chí chấp nhận: <copy từ mục 2>
Test bắt buộc: <copy từ mục 2>
Khi xong, báo cáo: file đã đổi; lệnh test và kết quả thật; phần chưa làm; câu hỏi mở
```

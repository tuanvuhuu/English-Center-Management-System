# 0. Tổng quan – Phân tích nghiệp vụ ban đầu

Hệ thống quản lý cho 4 trung tâm tiếng Anh thuộc một tổ chức. Tài liệu này là đầu vào nghiệp vụ; các tab chi tiết nằm ở các file `01` → `13` cùng thư mục.

## Nhận định nền tảng

Hầu hết rắc rối ở trung tâm tiếng Anh đến từ một chỗ: **số buổi học và số tiền bị lệch nhau, mà không ai giải thích được vì sao.** Vì vậy coi **"Ghi danh"** (một học viên đăng ký một khóa, tại một trung tâm, với một mức giá) là đối tượng trung tâm của hệ thống. Lớp, điểm danh, học phí, bảo lưu, hoàn phí đều treo vào ghi danh.

Nguyên tắc nghiệp vụ: **mọi thay đổi về số buổi hoặc số tiền phải là một "phát sinh" có lý do, người thực hiện và thời điểm.** Không ai được sửa thẳng con số "còn lại".

## 1. Các nhóm nghiệp vụ cốt lõi

| # | Nhóm | Giá trị chính | File |
| --- | --- | --- | --- |
| A | Tổ chức & chính sách trung tâm | 4 trung tâm có giá, lịch, quy định khác nhau mà vẫn báo cáo chung | 01 |
| B | Tuyển sinh | Biết nguồn học viên, tỉ lệ chuyển đổi, hiệu quả tư vấn viên | 09 |
| C | Học viên & phụ huynh | Một hồ sơ duy nhất xuyên suốt nhiều năm và nhiều trung tâm | 03 |
| D | Chương trình & khóa học | Chuẩn hóa sản phẩm đang bán và lộ trình học | 02 |
| E | Lớp & lịch | Vận hành hằng ngày, tránh trùng phòng và trùng GV | 05 |
| F | Điểm danh & kết quả học tập | Bằng chứng học tập để báo phụ huynh và tư vấn tái ghi danh | 06 |
| G | Quỹ buổi học | Trả lời chính xác "con tôi còn bao nhiêu buổi?" | 04 |
| H | Học phí & tài chính | Kiểm soát dòng tiền, chống thất thoát | 07 |
| I | Giáo viên & nhân sự | Tính lương đúng, tận dụng tốt GV | 08 |
| J | Giữ chân học viên | Tăng doanh thu từ học viên cũ | 09 |
| K | Cổng phụ huynh & thông báo | Giảm cuộc gọi hỏi lặt vặt, tăng minh bạch | 10 |
| L | Báo cáo & phân tích | Ban điều hành nhìn 4 trung tâm trên một màn hình | 11 |
| M | Phân quyền & nhật ký thay đổi | Ai làm gì, lúc nào, sửa từ giá trị nào sang giá trị nào | 12 |

## 2. Tính năng dễ bị bỏ sót

- Đồng giảng dạy (GV nước ngoài + GV Việt + trợ giảng), dạy thay, lương theo người dạy thực tế.
- Danh sách chờ, gộp lớp, hủy lớp khi thiếu sĩ số; học viên vào lớp giữa chừng.
- Lớp online/hybrid; đóng cửa đột xuất (bão, mất điện) ảnh hưởng hàng loạt lớp.
- Một phụ huynh nhiều con (giảm giá anh chị em, thu gộp); học viên người lớn; doanh nghiệp trả thay.
- Gộp hồ sơ trùng; chuyển lớp/khóa/trung tâm kèm số dư; chuyển nhượng khóa.
- Tách tiền thu và doanh thu (tiền nhận trước); hóa đơn điện tử; bán kèm sách, phí thi; hoa hồng tư vấn; khóa sổ tháng; đối soát theo ca.
- Dự giờ, chứng nhận hoàn thành, kiểm soát tiến độ giáo án.
- Chính sách lưu theo phiên bản tại thời điểm ký; đồng ý sử dụng hình ảnh/dữ liệu trẻ em.

## 3. Điểm dễ sai lệch dữ liệu

| Rủi ro | Biểu hiện | Hướng xử lý |
| --- | --- | --- |
| Số buổi còn lại tính sai | PH nói còn 5, hệ thống báo 3 | Số buổi = tổng các phát sinh; không sửa tay |
| Điểm danh sửa muộn | Lệch lương và doanh thu đã chốt | Khóa sau N ngày; mở lại phải duyệt |
| Tiền và buổi lệch nhau | Hoàn phí mà không trừ buổi | Mỗi nghiệp vụ cập nhật cả tiền và buổi trong một thao tác |
| Sửa/xóa phiếu thu | Xóa phiếu để "làm lại" | Không xóa; hủy có lý do hoặc phiếu điều chỉnh |
| Chính sách áp ngược | Học viên cũ bị tính theo quy định mới | Ghi danh lưu phiên bản chính sách |
| Hồ sơ trùng | Lịch sử và công nợ bị chia đôi | Cảnh báo trùng; chức năng gộp |
| Năm học cắt ngang | Đếm trùng/thiếu | Quy tắc gán năm học rõ ràng |
| Thao tác hàng loạt | Hủy cả ngày nhưng sót lớp | Nghiệp vụ "sự kiện đóng cửa" có báo cáo |

## 4. Phân giai đoạn

**Giai đoạn 1 – vận hành lõi:** tổ chức/phòng/năm học/ngày nghỉ; hồ sơ HV & PH; chương trình, khóa, bảng giá theo trung tâm; lớp, lịch, điểm danh, hủy/dời, học bù cơ bản; quỹ buổi học, bảo lưu, chuyển lớp; ghi danh, ưu đãi, phiếu thu, công nợ, hoàn phí, điều chỉnh; phân quyền & nhật ký; báo cáo vận hành hằng ngày; chấm công giảng dạy.

**Giai đoạn 2 – tăng trưởng & minh bạch:** phễu tuyển sinh; bài kiểm tra, nhận xét định kỳ; cổng phụ huynh; thù lao GV đầy đủ, hoa hồng; doanh thu thực hiện, khóa sổ tháng; báo cáo hợp nhất.

**Giai đoạn 3 – tối ưu:** cảnh báo nguy cơ nghỉ học; hiệu suất phòng/GV, lãi/lỗ; giáo án, kho tài liệu; dự giờ, khảo sát; bán kèm, đăng ký thi chứng chỉ.

## 5. Quyết định còn mở

Xem `13-so-quyet-dinh.md`. Các quyết định QĐ-01 → QĐ-05, QĐ-11, QĐ-18 ảnh hưởng nhiều nhất và cần chốt trước khi thiết kế dữ liệu.

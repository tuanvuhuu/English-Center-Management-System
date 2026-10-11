# English Center Management System

Hệ thống quản lý cho **4 trung tâm tiếng Anh thuộc một tổ chức**: quản lý tập trung, nhưng mỗi trung tâm có giá, lịch và chính sách riêng.

Giao tiếp với chủ dự án bằng **tiếng Việt**.

## Tài liệu nghiệp vụ (đọc trước khi làm bất cứ việc gì)

Toàn bộ yêu cầu nghiệp vụ nằm trong `docs/nghiep-vu/`:

| File | Nội dung |
| --- | --- |
| `00-tong-quan.md` | Tổng quan, 13 nhóm nghiệp vụ, rủi ro dữ liệu, phân giai đoạn |
| `01-to-chuc-nam-hoc.md` | Tổ chức, trung tâm, phòng, ngày nghỉ, năm học |
| `02-chuong-trinh-khoa-hoc.md` | Chương trình → cấp độ → khóa, mô hình bán, bảng giá |
| `03-hoc-vien-phu-huynh.md` | Hồ sơ học viên, phụ huynh, người thanh toán |
| `04-ghi-danh-quy-buoi-hoc.md` | **Lõi hệ thống**: ghi danh, vòng đời, sổ phát sinh buổi |
| `05-lop-lich-hoc-bu.md` | Lớp, sinh lịch, hủy/dời buổi, học bù |
| `06-diem-danh-ket-qua-hoc-tap.md` | Điểm danh, khóa điểm danh, nhận xét, kiểm tra |
| `07-hoc-phi-tai-chinh.md` | Công nợ, phiếu thu, ưu đãi, hoàn phí, khóa sổ |
| `08-giao-vien-nhan-su.md` | Giáo viên, phân công, chấm công, thù lao |
| `09-tuyen-sinh-giu-chan.md` | Lead, test, học thử, tái ghi danh |
| `10-cong-phu-huynh-thong-bao.md` | Cổng phụ huynh, kênh thông báo |
| `11-bao-cao-phan-tich.md` | Báo cáo và định nghĩa chỉ số |
| `12-phan-quyen-nhat-ky.md` | Ma trận quyền, nhật ký thay đổi |
| `13-so-quyet-dinh.md` | **20 quyết định nghiệp vụ còn mở** và đề xuất mặc định |

Bản gốc có thể chỉnh sửa nằm trong Claude Doc "Phân tích nghiệp vụ ban đầu"; các file ở đây là bản xuất. Khi nghiệp vụ thay đổi, cập nhật file tương ứng trong `docs/nghiep-vu/`.

## Bất biến nghiệp vụ (không được vi phạm trong code)

1. **Ghi danh là trung tâm**: 1 học viên × 1 khóa/gói × 1 trung tâm × giá và phiên bản chính sách tại thời điểm ký.
2. **Số buổi và số tiền là sổ phát sinh (ledger), không phải con số sửa tay.** Số dư luôn được tính từ các phát sinh. Không có thao tác "sửa số buổi còn lại".
3. **Phát sinh không xóa.** Sai thì tạo phát sinh đảo. Phiếu thu không xóa: chỉ hủy kèm lý do hoặc lập phiếu điều chỉnh.
4. Nghiệp vụ thay đổi **cả buổi và tiền** (chuyển, hoàn phí, bảo lưu) phải nằm trong **một giao dịch duy nhất**.
5. **Đơn giá thực trả mỗi buổi** = học phí sau ưu đãi ÷ số buổi mua; dùng thống nhất cho chuyển, bảo lưu, hoàn phí, ghi nhận doanh thu.
6. Chính sách có **phiên bản và ngày hiệu lực**; không áp ngược cho ghi danh đã ký.
7. Tách **công nợ / tiền đã thu / doanh thu thực hiện / tiền nhận trước**.
8. Dữ liệu đã **khóa sổ** (điểm danh quá hạn, tháng kế toán) không sửa trực tiếp.
9. Mọi thay đổi trên dữ liệu tiền, buổi, điểm danh, điểm số, giá, quyền phải có **nhật ký**: ai, khi nào, cũ → mới, lý do, người duyệt.
10. **Không giả định 4 trung tâm giống nhau.** Các con số chính sách (hạn báo vắng, hạn bảo lưu, % hoàn phí, sĩ số, trần ưu đãi…) phải **cấu hình được theo trung tâm**, không hard-code.

## Quyết định còn mở

Các giá trị trong `13-so-quyet-dinh.md` đang ở trạng thái "Chưa chốt". Được phép code theo đề xuất mặc định **chỉ khi** giá trị đó là tham số cấu hình. Nếu một quyết định làm thay đổi cấu trúc dữ liệu (đặc biệt QĐ-01, QĐ-02, QĐ-05, QĐ-11, QĐ-18), hỏi chủ dự án trước.

## Trạng thái dự án và cách làm việc

- Đã có bản chạy được: `packages/domain` (lõi nghiệp vụ + test), `apps/api` (Fastify + SQLite), `apps/web` (React + Vite). Xem `README.md` để chạy.
- Không cần chờ chốt Sổ quyết định: dùng đề xuất mặc định, giữ chúng trong `packages/domain/src/policy.ts` để đổi được.
- Mọi thay đổi chạm vào buổi/tiền phải đi qua `@ecms/domain` và có test. Chạy `npm test` trước khi commit.
- Giao diện: cam là màu thương hiệu, xanh lá là màu phụ, đỏ chỉ cho cảnh báo; mobile-first (menu kéo, bảng thành thẻ).

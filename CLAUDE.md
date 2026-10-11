# English Center Management System

Hệ thống nội bộ cho **4 cơ sở tiếng Anh thuộc một tổ chức**, dùng **5–6 người**. Bản này làm gọn: chỉ giữ việc người dùng làm hằng ngày.

Giao tiếp với chủ dự án bằng **tiếng Việt**.

## Tài liệu nghiệp vụ (đọc trước khi làm bất cứ việc gì)

Toàn bộ yêu cầu nghiệp vụ nằm trong `docs/nghiep-vu/`. Bản này thay thế bộ tài liệu nhiều file trước đó.

| File | Nội dung |
| --- | --- |
| `00-tong-quan.md` | Mục tiêu, nguyên tắc, phạm vi làm và để sau |
| `01-nguoi-dung-quyen.md` | Sáu vai trò và quyền |
| `02-hoc-vien-khoa-lop.md` | Học viên, khóa học và giá, lớp, ngày nghỉ, buổi học |
| `03-ghi-danh-diem-danh.md` | Ghi danh, số buổi còn lại, điểm danh, quyền bù |
| `04-thu-tien-hoc-phi.md` | Giảm giá, phiếu thu, công nợ, hủy phiếu, điều chỉnh, hoàn phí |
| `05-giao-vien-bang-cong.md` | Hồ sơ giáo viên, tính công, bảng công tháng |
| `06-tuyen-sinh-diem.md` | Khách tiềm năng, bài kiểm tra, nhận xét |
| `07-bao-cao-nhat-ky.md` | Trang chủ, báo cáo tháng, nhật ký, báo cáo bất thường |
| `08-tham-so-quyet-dinh.md` | Quyết định đã chốt và bảng tham số mặc định |

Kế hoạch giao việc theo từng tính năng nằm ở `docs/ke-hoach-tinh-nang.md`.

## Bất biến nghiệp vụ (không được vi phạm trong code)

1. **Ghi danh là trung tâm:** một học viên × một lớp × một cơ sở, giá tính tại thời điểm ký.
2. **Số buổi còn lại và số tiền nợ được tính từ lịch sử** (buổi đã diễn ra, phiếu thu, phiếu điều chỉnh). Không có thao tác sửa tay con số này.
3. **Không xóa dữ liệu đã phát sinh.** Phiếu thu chỉ hủy trong cùng ngày, kèm lý do. Sau ngày thì lập phiếu điều chỉnh.
4. **Thay đổi cả buổi và tiền** (hoàn phí, đổi lớp, bảo lưu, nghỉ) phải nằm trong **một giao dịch duy nhất**.
5. **Đơn giá thực trả mỗi buổi** = học phí sau giảm giá ÷ số buổi mua. Dùng cho hoàn phí.
6. **Giá và số buổi chuẩn của khóa đổi** chỉ áp dụng cho ghi danh mới.
7. **Mọi thay đổi về tiền, buổi, điểm danh, điểm, giá, người dùng** phải có nhật ký: ai, khi nào, cũ → mới, lý do. Nhật ký không ai sửa hoặc xóa được.
8. **Không có bước duyệt.** Kiểm soát bằng quyền theo vai trò và lý do bắt buộc.
9. **Số liệu cấu hình** (ngưỡng, thời hạn, phí) nằm trong `packages/domain/src/policy.ts`, không viết thẳng trong code.

## Quyết định

Các quyết định đã chốt và tham số mặc định nằm ở `docs/nghiep-vu/08-tham-so-quyet-dinh.md`. Nếu việc cần làm đi ngược với tài liệu này, hỏi chủ dự án trước khi làm.

## Trạng thái dự án và cách làm việc

- Đang chạy: `packages/domain` (lõi nghiệp vụ và test), `apps/api` (Fastify + SQLite), `apps/web` (React + Vite). Xem `README.md` để chạy.
- Dữ liệu SQLite nằm ở file `ecms.db` (biến môi trường `ECMS_DB`). Không xóa file này khi chưa có yêu cầu.
- Mọi thay đổi chạm vào buổi, tiền hoặc điểm danh phải đi qua `@ecms/domain` và có test. Chạy `npm test` trước khi báo xong.
- **Giao diện:** màu nhận diện là **đỏ son**, đồng bộ với sản phẩm chị em "EMS · Tổ chức thi". Không dùng cam làm màu chính. Xanh lá là màu phụ, đỏ cũng là màu cảnh báo. Mobile-first: menu kéo, bảng thành thẻ trên điện thoại.

# Hệ thống quản lý trung tâm tiếng Anh

Quản lý 4 cơ sở dưới một tổ chức: học viên – phụ huynh, lớp & lịch, ghi danh, điểm danh, thu học phí, công nợ, hoàn phí có duyệt, báo cáo hợp nhất, nhật ký thay đổi.

## Chạy thử

```bash
npm install
npm run dev:api     # API http://localhost:3001 (SQLite, tự nạp dữ liệu mẫu lần đầu)
npm run dev:web     # Giao diện http://localhost:5173
npm test            # test domain + API
```

Tài khoản mẫu: `admin` / `admin123` (xem cả 4 cơ sở). Mỗi cơ sở có `manager.<cs>`, `academic.<cs>`, `accountant.<cs>`, `frontdesk.<cs>`, `teacher.<cs>` với mật khẩu `123456`; mã cơ sở: `cg`, `hbt`, `lb`, `hd`.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `packages/domain` | Lõi nghiệp vụ thuần TypeScript: sổ phát sinh buổi, vòng đời ghi danh, điểm danh, hoàn phí, phiếu thu, chính sách theo phiên bản |
| `apps/api` | Fastify + SQLite (better-sqlite3), phân quyền theo vai trò và cơ sở |
| `apps/web` | React + Vite, responsive (menu kéo, bảng thành thẻ, hộp thoại dạng bottom sheet trên điện thoại) |
| `docs/` | Tài liệu nghiệp vụ, tham khảo UI, demo prototype |

## Chức năng

Học viên & phụ huynh · lớp, lịch, hủy buổi · ghi danh, đổi lớp, bảo lưu · điểm danh · thu tiền, công nợ, hoàn phí có duyệt · **tuyển sinh** (lead → tư vấn → test → học thử → chốt ghi danh, thống kê theo nguồn) · **giáo viên & bảng công** (tính từ buổi thực dạy) · **điểm kiểm tra & nhận xét** · báo cáo 4 cơ sở · nhật ký thay đổi.

## Quy tắc đã cài đặt

- Số buổi là tổng các dòng phát sinh; không có thao tác sửa số dư. Sai thì tạo phát sinh đảo.
- Hoàn phí: người tạo ≠ người duyệt; duyệt xong trừ buổi + ghi phiếu hoàn + đóng ghi danh trong một giao dịch.
- Phiếu thu không xóa: hủy trong ngày kèm lý do, sau ngày thì lập phiếu điều chỉnh.
- Điểm danh khóa sau 48 giờ; sửa sau đó cần quản lý ghi lý do.
- Không xóa học viên/lớp đã có ghi danh. Chặn trùng hồ sơ, trùng phòng, trùng giáo viên, vượt sĩ số, thu vượt công nợ.
- Mọi thay đổi quan trọng ghi vào nhật ký.

Các con số chính sách (hạn báo vắng, % phí hoàn, sĩ số, trần ưu đãi…) nằm trong `packages/domain/src/policy.ts`.

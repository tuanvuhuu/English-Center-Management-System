# 5. Lớp, lịch & học bù

Lớp học là nơi ghi danh "tiêu" buổi. Lịch phải xử lý được ngày lễ, hủy buổi, dời buổi, đổi giáo viên và học bù mà không làm sai số buổi của học viên.

## Mở lớp

- Thông tin lớp: khóa, trung tâm, mã lớp, ngày khai giảng, lịch lặp (ví dụ: thứ 3 và thứ 5, 18:00–19:30), phòng, giáo viên chính, giáo viên nước ngoài, trợ giảng, sĩ số tối thiểu và tối đa.
- Hệ thống tự sinh danh sách buổi học theo lịch lặp, bỏ qua ngày nghỉ, cho đến khi đủ số buổi chuẩn, và tự tính ngày kết thúc.
- Trạng thái lớp: Dự kiến (đang tuyển sinh) → Đã mở → Đang học → Kết thúc, hoặc Hủy.
- Kiểm tra trùng phòng, trùng giáo viên, và giáo viên được xếp ngoài lịch rảnh.

## Buổi học

Mỗi buổi có: ngày giờ, phòng, giáo viên thực tế, nội dung/unit, và trạng thái (Dự kiến, Đã dạy, Trung tâm hủy, Đã dời, Buổi bù).

## Thay đổi lịch

| Tình huống | Xử lý mặc định | Ảnh hưởng tới buổi của học viên |
| --- | --- | --- |
| Ngày lễ | Bỏ qua, nối thêm 1 buổi vào cuối khóa | Không |
| Trung tâm hủy buổi (GV ốm, sự cố) | Dời sang ngày khác hoặc nối vào cuối khóa | Không |
| Đóng cửa đột xuất | Xử lý hàng loạt như trên | Không |
| Dời giờ cố định cả lớp | Áp dụng từ ngày X; học viên không theo được thì đổi lớp | Không |
| Đổi giáo viên dài hạn | Áp dụng từ ngày X | Không |
| Dạy thay một buổi | Ghi nhận giáo viên thực tế của buổi | Không, nhưng ảnh hưởng thù lao |

## Học bù

- Hình thức: (a) vào một lớp khác cùng khóa, cùng nội dung; (b) lớp bù tập trung; (c) buổi kèm 1-1, hoặc video bài giảng kèm bài tập.
- Hệ thống gợi ý lớp có cùng unit trong khoảng thời gian phù hợp, còn chỗ, ở trung tâm thuận tiện.
- Học viên bù được tính vào sĩ số tạm thời của lớp nhận, và xuất hiện trong danh sách điểm danh của giáo viên lớp đó.
- Buổi học bù chỉ trừ quyền học bù, không trừ quỹ buổi.
- Học bù liên trung tâm theo QĐ-05.

## Sĩ số và xử lý lớp

- Danh sách chờ khi lớp đầy; tự động báo khi có chỗ.
- Đến ngày khai giảng mà chưa đủ sĩ số tối thiểu: hoãn, gộp, hoặc hủy lớp (hoàn tiền hoặc chuyển lớp) (QĐ-17).
- Gộp lớp giữa khóa khi hai lớp đang ở unit khác nhau: cần quy tắc quy đổi số buổi.

## Tình huống ngoại lệ

- Giáo viên nghỉ việc giữa khóa.
- Một buổi có hai giáo viên (ví dụ: GV nước ngoài 45 phút, GV Việt 45 phút).
- Lớp online: đường link, ghi hình, điểm danh theo thời gian tham gia.
- Lịch không đều, ví dụ kỳ hè học 5 buổi mỗi tuần.

## Giai đoạn

Giai đoạn 1: mở lớp, sinh lịch, ngày lễ, hủy/dời buổi, đổi giáo viên, học bù cơ bản, danh sách chờ. Giai đoạn 2: gợi ý lớp bù tự động, lớp online nâng cao. Giai đoạn 3: tối ưu xếp lịch.

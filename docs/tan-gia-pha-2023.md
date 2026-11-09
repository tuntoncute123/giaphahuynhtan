# Đối chiếu Tân Gia phả chung (31/08/2023)

Nguồn: `Tân Gia phả chung 2023-08-31 09.32.43.docx`. Số đoạn trong bảng dưới đây là chỉ số đoạn trong XML của file Word, bắt đầu từ 0 và tính cả đoạn trống. Dữ liệu seed có ghi lại đoạn nguồn trong tiểu sử để tiện kiểm tra.

| Kết quả | Số lượng |
| --- | ---: |
| Thành viên đã có trước khi đối chiếu | 185 |
| Mục con có quan hệ rõ trong phần phả hệ đánh số | 492 |
| Mục con khớp hồ sơ đã có | 143 |
| Hồ sơ mới từ phần phả hệ và phần gia đình cụ Dụng | 422 |
| Hồ sơ phối ngẫu mới | 96 |
| Hồ sơ cũ được bổ sung quan hệ hoặc biệt danh | 11 |
| Tổng thành viên sau seed | 703 |

Chỉ bổ sung ngày sinh/ngày mất vào ghi chú khi tài liệu chỉ có **năm**. Không tự tạo ngày `01/01` hoặc ngày giỗ âm lịch từ năm sinh/mất. Ngày kỵ chỉ được ghi trong tiểu sử khi nguồn chưa xác nhận cách tính tháng nhuận.

## Cần xác minh với gia đình

| Đoạn | Trong file Word | Trong dữ liệu cũ | Cách xử lý |
| ---: | --- | --- | --- |
| 808 | Huỳnh Thị Tăng, con cụ Tu | Huỳnh Tấn Đoan cùng thứ tự con | Chưa thêm để tránh trùng. |
| 886 | Huỳnh Thị Ban, con cụ Xáng | Huỳnh Tấn Ban cùng thứ tự con | Chưa đổi tên hoặc giới tính. |
| 919 | Huỳnh Tấn Hiến, con cụ Đoan | Huỳnh Thị Pháng cùng thứ tự con | Chưa thêm để tránh trùng. |
| 917 | Võ Thị Đích, vợ cụ Đoan | Phạm Thị Chiêu | Chưa thêm vì quan hệ phối ngẫu mâu thuẫn. |
| 1005 | Phạm Thị Nhì, vợ cụ Dần | Phan Thị Nhì | Chưa đổi họ. |
| 674 | Huỳnh Anh Thư | Tên cha và năm sinh trong nguồn không hợp nhau | Chưa gắn vào cây. |
| 1114, 1260, 1283 | Tên hoặc giới tính không đủ rõ | — | Chưa tạo hồ sơ. |

Đoạn 607 ghi cụ Trường nhận cụ Dụng, con của người em họ, làm **con nuôi**. Bản seed giữ quan hệ này trong cây và ghi chú ở tiểu sử cụ Dụng. Mô hình gia phả hiện chưa có trường riêng cho quan hệ nhận nuôi, nên công cụ xưng hô cần được kiểm tra với gia đình ở nhánh này. Đoạn 767 và 772 có năm sinh mâu thuẫn với thế hệ cha con; hồ sơ được thêm theo quan hệ đã ghi nhưng không điền các năm đó vào trường ngày sinh.

Danh sách 235 vong nhân dùng để tế tự ở đầu tài liệu không có quan hệ cha mẹ. Các dòng đọc được được lưu riêng như tư liệu tế tự, không tạo thành các nút rời trong cây.

## Nội dung ngoài phả hệ trên website

Trang **Tư liệu dòng họ** có phần lịch sử trích lược từ lời nói đầu năm 1993 (đoạn 2–16), lược sử và các phái (21–48), nhận định về mối quan hệ với tộc Duy Phước (52–57), gia phong (59–62), lời tựa dịch từ bản năm 1874 (114–123), chú thích và quy ước đọc bản giấy (64–75), cùng toàn văn bài *Điếu Tiền hiền* (81–112). Các câu chuyện truyền khẩu và địa danh được trình bày như lời của bản gia phổ, chưa coi là dữ kiện lịch sử đã được kiểm chứng độc lập.

`data/tieu-thu-2023.json` lưu **148 dòng trích đọc được** từ mục Tiếu thư (gồm hai dòng “Phụ tiên tế tự”, đoạn 128–129, và các đoạn 133–352; bỏ dòng tiêu đề 143). Con số 235 là số vong nhân bản gia phổ tự ghi, không phải số dòng trích từ file Word hiện có. Giữ nguyên lỗi lặp chữ và tên chưa rõ trong các dòng để gia đình đối chiếu. Danh sách có thể tìm kiếm trên trang Tư liệu nhưng không trở thành hồ sơ thành viên hay ngày giỗ.

Tài liệu chỉ nêu địa danh nghĩa trang, đình làng và mộ Tiền hiền, chưa có tọa độ nhà thờ. Các ngày kỵ rải rác trong phả hệ cũng chưa đủ quy tắc lịch âm cho lịch nhắc. Vì vậy không tự tạo nhà thờ hoặc lịch nhắc ngày giỗ từ các đoạn này.

## Chạy lại seed

`data/tan-gia-pha-2023-seed.json` chứa các hồ sơ được duyệt và danh sách cần rà soát. Lệnh kiểm tra không ghi dữ liệu; lệnh `--apply` chỉ thêm các ID còn thiếu và điền các trường cũ đang trống. Chạy lại không tạo bản ghi trùng.

```bash
npx tsx scripts/seed-tan-gia-pha.ts
npx tsx scripts/seed-tan-gia-pha.ts --apply
npx tsx scripts/seed-tan-gia-pha.ts --database
npx tsx scripts/seed-tan-gia-pha.ts --database --apply
```

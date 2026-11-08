# Gia phả Huỳnh Tấn

Ứng dụng Next.js để xem và quản lý gia phả, dùng màu sắc và phong cách tranh dân gian theo ảnh tham khảo. Tiêu đề dùng font thư pháp [Charm](https://github.com/google/fonts/tree/main/ofl/charm) có hỗ trợ dấu tiếng Việt; bản font và giấy phép OFL được lưu tại `public/fonts/charm`. Nội dung dài dùng font dễ đọc. Hồ sơ ban đầu chỉ là **dữ liệu minh họa**; cần thay bằng thông tin đã được gia đình xác nhận.

## Chạy trên máy

```bash
npm install
cp -n .env.example .env.local
# Đặt ADMIN_USERNAME và ADMIN_PASSWORD trong .env.local
npm run dev
```

Mở http://localhost:3000. Đăng nhập bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD` để biên tập. Khách có thể xem cây gia phả và những thông tin được cho phép công khai. Giữ `.env.local` riêng trên máy chủ, không đưa vào kho mã nguồn.

## Chức năng

- Cây gia phả nhiều thế hệ: xem từng nhánh, lọc theo đời, phóng to hoặc thu nhỏ; hồ sơ thể hiện cha mẹ, phối ngẫu, con, anh chị em và đời thứ.
- Thêm, sửa, xóa thành viên; tìm theo tên có dấu hoặc không dấu, biệt danh và tên thường gọi như “Cô Bảy”. Có thể ghi thứ tự sinh trong nhà.
- Chọn hai thành viên trong mục gia phả để xem nên gọi nhau bằng vai vế gì. Kết quả dựa trên quan hệ đã nhập và thứ tự sinh hoặc ngày sinh; các quan hệ chưa đủ dữ liệu sẽ được báo là chưa xác định.
- Ghi địa chỉ, tọa độ nhà của thành viên; có thể chọn công khai hoặc chỉ cho quản trị viên xem. Hồ sơ có nút chỉ đường bằng Google Maps. Số Zalo và quyền đồng ý nhận tin chỉ hiển thị cho quản trị viên.
- Quản lý nhiều nhà thờ với địa chỉ, tọa độ, bản đồ, nút chỉ đường bằng Google Maps, người phụ trách và ngày giỗ hoặc lễ cúng riêng.
- Ghi ngày mất dương lịch và tự suy ra ngày giỗ âm lịch; có thể nhập ngày giỗ âm riêng. Lịch giỗ hiển thị ngày dương tương ứng của năm tới và cho phép đặt ngày nhắc trước từ 0 đến 30 ngày.
- Quản trị tư liệu, sự kiện và ảnh đại diện; tải JPG, PNG, WebP hoặc PDF tối đa 5 MB. Xuất dữ liệu JSON để sao lưu.

## Thêm website vào màn hình chính

Website có manifest, biểu tượng và service worker để cài như PWA trên điện thoại. Lần đầu mở trên điện thoại, trang sẽ hiện lời mời thêm vào màn hình chính. Trên Android, nút **Thêm ngay** mở hộp cài đặt của trình duyệt khi trình duyệt cho phép; nếu không có hộp cài đặt, trang hiện các bước trong Chrome. Trên iPhone/iPad, trang hướng dẫn thao tác **Chia sẻ → Thêm vào Màn hình chính** trong Safari, vì iOS không cho website tự cài thay người dùng. Nếu người dùng chọn **Để sau**, lời mời lớn tạm ẩn 30 ngày và còn nút nhỏ **Cài ứng dụng** để mở lại.

Cần triển khai bằng HTTPS để PWA và service worker hoạt động trên điện thoại. Khi mất mạng, ứng dụng chỉ hiện trang thông báo ngoại tuyến; dữ liệu gia phả không được lưu vào bộ nhớ đệm. **Cài PWA chưa bật Web Push**: tính năng gửi thông báo đẩy cần được triển khai và người dùng vẫn phải đồng ý quyền thông báo riêng.

## Ngày giỗ âm lịch

Ngày mất dương lịch được quy đổi theo lịch âm Việt Nam. Nếu gia đình cúng vào ngày khác, nhập ngày âm trực tiếp trong hồ sơ hoặc nhà thờ. Với ngày 30 của tháng chỉ có 29 ngày, có thể chọn cúng ngày cuối tháng hoặc bỏ qua năm đó. Với ngày thuộc tháng nhuận mà năm tới không có tháng nhuận tương ứng, có thể chọn tháng thường hoặc bỏ qua. Múi giờ dùng để xác định ngày chạy lịch nhắc là `Asia/Ho_Chi_Minh`.

## Chuẩn bị nhắc ngày giỗ qua Zalo

Ứng dụng đã có phần chọn người nhận, ngày giỗ, số ngày nhắc trước, bật/tắt lịch nhắc, nhật ký gửi và điểm gọi API. **Hiện chưa gửi tin thật** vì chưa có Zalo Official Account/ZBS và mẫu tin được duyệt. Theo [hướng dẫn Zalo Business Solutions](https://zalo.solutions/business-message/guidelines/intro), cần có tài khoản ZBS, OA, AppID, quyền gửi và mẫu tin được duyệt. API gửi tin dùng mẫu qua [ZBS Template Message](https://stc-developers.zdn.vn/docs/v2/zbs-template-message/gui-tin-template-qua-sdt/api-gui-tin-qua-sdt/api-gui-tin); token OA được làm mới theo [OAuth của Zalo](https://stc-developers.zdn.vn/docs/v2/official-account/bat-dau/xac-thuc-va-uy-quyen-cho-ung-dung-new).

Khi đã có các thông tin đó:

1. Điền `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_REFRESH_TOKEN`, `ZALO_TEMPLATE_ID` và `CRON_SECRET` trong `.env.local` trên máy chủ. `ZALO_TEMPLATE_DATA_MAP` là JSON ánh xạ các trường `recipient`, `event`, `lunarDate`, `solarDate`, `location`, `daysBefore` sang đúng tên placeholder của mẫu đã được duyệt. Chỉ ánh xạ các trường thực sự có trong mẫu; ít nhất một trường phải được ánh xạ.
2. Trong hồ sơ thành viên nhận tin, nhập số Zalo và bật xác nhận đồng ý nhận nhắc giỗ. Vào **Ngày giỗ** để đặt lịch cho từng người và từng sự kiện.
3. Chạy tác vụ hằng ngày lúc 08:00 giờ Việt Nam. Ví dụ trên Linux, khi máy chủ dùng múi giờ Việt Nam:

   ```cron
   0 8 * * * cd /duong-dan/toi/giaphahuynhtan && /usr/bin/node --env-file=.env.local scripts/run-reminders.mjs >> /var/log/giapha-reminders.log 2>&1
   ```

   Đặt `APP_URL` trong `.env.local` trỏ tới ứng dụng đang chạy; dùng HTTPS nếu tác vụ chạy từ máy khác. Có thể chạy thủ công bằng `node --env-file=.env.local scripts/run-reminders.mjs`. Tác vụ báo lỗi khi cấu hình thiếu hoặc có tin gửi thất bại. Mỗi lần nhắc được ghi trạng thái để hạn chế gửi trùng khi tác vụ chạy lại.

Không đưa `.env.local` hoặc `data/zalo-tokens.json` lên kho mã nguồn. Token đã làm mới được lưu trên ổ đĩa máy chủ tại `data/zalo-tokens.json`; cần sao lưu và bảo vệ thư mục `data`.

## Lưu trữ và triển khai

Dữ liệu được lưu tại `data/family.json` sau lần chỉnh sửa đầu tiên; ảnh và tài liệu tải lên nằm trong `public/uploads`. Sao lưu hai vị trí này định kỳ. Ứng dụng cần máy chủ có ổ đĩa ghi được và lưu bền; môi trường serverless với hệ thống tệp tạm thời sẽ mất thay đổi. Lớp lưu trữ JSON hiện phù hợp cho một tiến trình máy chủ. Nếu có nhiều máy chủ hoặc nhiều người biên tập đồng thời, chuyển sang cơ sở dữ liệu và kho tệp dùng chung trước khi triển khai.

Kiểm tra bằng `npm test`, `npm run typecheck` và `npm run build`.

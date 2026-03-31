# Kế hoạch Triển khai Kiến trúc mới: Trực tuyến hóa với Supabase kết hợp Sao lưu GDrive

> **Trạng thái:** ✅ Giai đoạn 1 & 2 HOÀN TẤT — Ứng dụng đã Online 100% với Supabase. Giai đoạn 3-4 (GDrive Backup) là lộ trình tiếp theo.

---

## 1. Mục tiêu cốt lõi

1. **Dữ liệu mượt mà đa thiết bị:** Chuyển đổi toàn bộ thông tin (Tòa nhà, Phòng thuê, Khách thuê, Hóa đơn...) lên Supabase. Điện thoại hay máy tính đều xem được dữ liệu đồng bộ ngay lập tức (Realtime).
2. **An toàn tuyệt đối với GDrive Backup:** Ứng dụng sẽ tự động xuất một bản sao dữ liệu dạng JSON vào hàng tháng và đẩy thẳng lên tài khoản Google Drive của bạn. Phòng trường hợp Supabase gặp sự cố, bạn quên mật khẩu Supabase, hoặc muốn xuất dữ liệu đi nơi khác.

---

## 2. Lộ trình Triển khai

### Giai đoạn 1: Thiết lập Cơ sở dữ liệu đám mây (Supabase)
1. **Tạo Dự án (Project):** Khởi tạo một dự án miễn phí (Free Tier) trên bảng điều khiển của [Supabase](https://supabase.com). Đảm bảo chọn Region gần nhất (ví dụ: Singapore) để tốc độ tối đa.
2. **Thiết kế Lược đồ (Database Schema):** 
   - Đồng bộ cấu trúc 5 bảng hiện tại của ứng dụng (Buildings, Rooms, Tenants, Contracts, Bills, Payments) thành cấu trúc Table chuẩn SQL trên Supabase.
   - Thiết lập các liên kết Khóa ngoại (Foreign Keys) để ràng buộc hợp đồng với phòng và khách thuê chặt chẽ hơn.
3. **Bảo mật (RLS - Row Level Security):** Kích hoạt hệ thống đăng nhập (Authentication) nếu bạn muốn bảo vệ app bằng mật khẩu, từ đó chỉ người dùng có quyền mới được đọc/ghi dữ liệu phòng trọ. Lấy `Supabase URL` và `Anon Key` lưu vào file biến môi trường `.env`.

### Giai đoạn 2: Refactor Code Ứng dụng sang Supabase
1. Cài đặt thư viện chính hãng: `npm install @supabase/supabase-js`.
2. Thay thế toàn bộ móc nối (Hooks/Stores) đang sử dụng IndexedDB (Dexie) trong mã nguồn (`src/db/database.ts` và thư mục `stores/*`).
3. Tích hợp tính năng **Supabase Realtime**: Nếu bạn mở app trên 2 cửa sổ/thiết bị khác nhau, khi vừa thu tiền hóa đơn ở máy A, máy B sẽ tức thời nhảy thông báo thanh toán thành công.

### Giai đoạn 3: Cấu hình Kênh dự phòng Google Drive (Backup Storage)
Để lập lịch sao lưu, ứng dụng vẫn cần chìa khóa để gửi tệp vào Drive cá nhân của bạn:
1. Đăng ký một **OAuth Client ID** từ Google Cloud Console (Dành cho Ứng dụng Web `http://localhost:5173` và tên miền thực tế sau này).
2. Tích hợp nút **"🔗 Kết nối Google Drive"** vào phần Cài đặt của ứng dụng bằng thư viện `@react-oauth/google`.
3. Cấu hình vị trí ghi tệp vào `appDataFolder` (Không gian ẩn của App trên Drive) để tránh bạn vô tình ấn nút xóa nhầm file backup lúc dọn dẹp Drive.

### Giai đoạn 4: Cơ chế Sao lưu Định kỳ (Automated Backup Logic)
1. **Đóng gói Dữ liệu:** Xây dựng một hàm rút trích vạn năng (Export/Dump). Hàm này sẽ gọi API Supabase kéo toàn bộ: `Khu vực`, `Phòng`, `Hợp đồng`, `Hóa đơn` về nén lại thành 1 file duy nhất mang tên `Hostify_Backup_[Tháng_Năm].json`.
2. **Kích hoạt ngầm định kỳ:**
   - App sẽ kiểm tra lịch sử Backup được lưu ở LocalStorage.
   - Nếu phát hiện **đã sang tháng mới**, ứng dụng sẽ tự động ghim một thông báo Snackbar: *"Đang đồng bộ dữ liệu dự phòng tháng này lên GDrive..."* và đẩy file JSON kia vào mây.
3. **Cơ chế Cứu hộ (Restore):** 
   - Sẽ có một giao diện "Khôi phục thảm họa". Trường hợp tài khoản Supabase bị mất sạch data, bạn chỉ cần bấm nút "Phục hồi từ Drive", ứng dụng lấy file JSON mới nhất và cắm rễ đẩy ngược lại lên Supabase cấu trúc toàn vẹn ban đầu.

---

## 3. Lợi ích của Kiến trúc Hai Lớp này
* **Hiện đại & Pro:** App giống như các phần mềm thương mại đắt tiền, chạy hoàn toàn bằng Data Cloud, xóa trình duyệt hay vứt điện thoại mua máy mới vô đăng nhập lại vẫn thấy y nguyên dữ liệu.
* **Tự chủ Dữ liệu (No Vendor Lock-in):** Không lo Supabase giam giữ dữ liệu của bạn, hàng tháng bạn đều có phôi Backup nằm an toàn trong nhà kho Google.
* **Miễn phí 100%:** Supabase có gói Free khá dư dả cho quy mô quản lý dưới 1.000 phòng, còn GDrive cung cấp tới 15GB miễn phí.

❓ **Việc tiếp theo:** Nếu bạn đồng ý với kế hoạch này, tôi sẽ hướng dẫn bạn từng nhấp chuột đầu tiên để tạo Cloud DB trên Supabase nhé!

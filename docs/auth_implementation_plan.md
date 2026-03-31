# Kế hoạch Triển khai Tính năng Đăng nhập (Authentication) cho Hostify

Hiện tại, ứng dụng Hostify đang sử dụng Supabase để lưu trữ dữ liệu nhưng chưa có cơ chế bảo mật Đăng nhập. Ai có đường link và khóa API đều có thể truy cập được. Việc thêm tính năng Đăng nhập (Login) là bước bắt buộc trước khi đưa ứng dụng vào hoạt động thực tế.

Dưới đây là bản thiết kế chiến lược chi tiết để triển khai hệ thống Đăng nhập phù hợp nhất cho PWA trên thiết bị di động.

---

## 1. Xác định Kiến trúc Ứng dụng (Cần Bạn Quyết Định)

Chúng ta có 2 hướng đi về mặt cấu trúc dữ liệu:

*   **Hướng 1: Ứng dụng dành riêng cho Bạn (Single-Landlord)**
    *   **Mô tả:** Chỉ có bạn (và có thể là người nhà) có tài khoản để quản lý khu trọ của chính mình.
    *   **Lợi ích:** Rất dễ làm. Không cần sửa lại đống dữ liệu Database hiện tại. Chỉ cần tạo 1 giao diện Login, ai vào web mà không có tài khoản thì bị chặn lại. Ai login thành công thì sẽ thấy **tất cả** dữ liệu chung.
*   **Hướng 2: Mô hình SaaS nhiều Chủ trọ (Multi-Tenant)**
    *   **Mô tả:** Bạn cho phép người khác vào tạo tài khoản. Mỗi tài khoản Chủ trọ sẽ chỉ nhìn thấy phòng / hóa đơn của chính họ tạo ra. Giống như một App xịn trên AppStore phục vụ hàng ngàn người.
    *   **Lợi ích:** Có thể kinh doanh app này.
    *   **Đổi lại:** **Rất phức tạp.** Sẽ phải đập Database đi làm lại một phần. Phải thêm cột `user_id` vào TẤT CẢ các bảng (Rooms, Tenants, Bills, Contracts...) và kích hoạt RLS (Row Level Security) trên Supabase để chặn người này xem trộm phòng người kia.

👉 *Tôi đề xuất bạn nên đi theo **Hướng 1** trước cho đơn giản và ra sản phẩm dùng ngay. Nếu sau này kinh doanh thì mới nâng cấp Hướng 2.*

---

## 2. Các bước Triển khai Chi tiết 

### Bước 1: Thiết lập Hệ thống trên Supabase (Backend)
1. Bật tính năng **Email Authentication** trên cấu hình Supabase Dashboard.
2. Tạo thủ công 1 tài khoản đăng nhập cho bạn (vd: `admin@hostify.com` / `matkhau123!`).
3. Tắt xác thực qua Email Link / Magic Link. *Lý do: Khi dùng PWA (Thêm vào MH chính), nhảy ra check email rồi bấm link đăng nhập sẽ làm ứng dụng trên iOS truy cập vào trình duyệt ẩn thay vì lưu trạng thái của App gốc, gây lỗi đăng nhập.* Do đó, Đăng nhập qua **Email + Mật khẩu tĩnh** là tối ưu và mượt mà nhất đối với thiết bị di động chạy nền PWA.
4. Bật **RLS (Row Level Security)** cơ bản trên Database: Chỉ cấp quyền `SELECT, INSERT, UPDATE, DELETE` cho những truy vấn có chứa Token Đăng nhập hợp lệ (`auth.role() = 'authenticated'`). Từ giờ, kẻ gian chôm được API Key cũng không thể đọc/xóa dữ liệu.

### Bước 2: Thiết lập Logic Cốt lõi (Frontend - Zustand)
*   Tạo module `src/stores/authStore.ts`:
   *   Quản lý trạng thái: `user` (thông tin người dùng), `session` (token phiên làm việc), `isLoading`.
   *   Dùng hàm `supabase.auth.signInWithPassword()` để gọi API đăng nhập.
   *   Dùng hàm `supabase.auth.signOut()` để đăng xuất.
   *   Lắng nghe sự thay đổi: `supabase.auth.onAuthStateChange()` để tự động duy trì đăng nhập ngay cả khi người dùng tắt App và mở lại (Cực kỳ quan trọng cho PWA).

### Bước 3: Thiết kế Giao diện Đăng nhập (UI/UX)
*   **Trang `Login.tsx`:** 
   *   Thiết kế một màn hình Đăng nhập cực kỳ sang trọng, hiện đại, tối giản. Có logo Hostify to ở giữa, 2 ô nhập (Email, Mật khẩu), và một nút Đăng nhập to bản dính sát viền dưới màn hình.
   *   Màn hình này sẽ giấu đi mọi thanh Menu/Header/Bottom Navigation để người ngoài không thể bấm lung tung.
*   **Thành phần `ProtectedRoute`:**
   *   Một "người gác cổng" bao bọc toàn bộ App (trong `App.tsx` hoặc `main.tsx`). Nếu phát hiện `session` trong `authStore` báo rỗng hoặc hết hạn, nó sẽ đá văng người dùng về trang `Login.tsx`.
*   **Nút Đăng xuất:**
   *   Thanh Menu bên trái (Sidebar / Drawer) hoặc trang Cài đặt (Settings) sẽ được bổ sung Nút "Đăng xuất" (Đổi sang màu Đỏ) để bạn chặn rò rỉ thông tin nếu cho người lạ mượn điện thoại.

---

## 3. Quá trình thực thi (Action Plan)

Công việc này dự kiến mất khoảng **1 phiên làm việc ngắn**. 

1. **Giai đoạn 1 (Làm nền tảng Backend Database):** Xác nhận với bạn chọn Hướng 1 hay Hướng 2 -> Chỉnh lại Config của Supabase -> Cấu hình `authStore` trong Code.
2. **Giai đoạn 2 (Xây tường rào Frontend):** Biến toàn bộ trang web thành Private Route -> Gắn thiết kế màn hình LoginForm hiện đại, chuẩn Mobile.
3. **Giai đoạn 3 (Bảo vệ Database bằng RLS):** Dùng lệnh SQL kích hoạt RLS phòng chống hacker can thiệp bên ngoài theo tiêu chuẩn doanh nghiệp.

*Tài liệu này sẽ được chúng ta dùng làm "Kim chỉ nam" trong quá trình lập trình cho đến khi hoàn thành hệ thống đăng nhập.*

# 🏢 Hostify - Quản Lý Phòng Trọ (PWA Cloud)

**Hostify** là một ứng dụng quản lý phòng trọ hiện đại, được xây dựng dưới dạng **Progressive Web App (PWA)** kết hợp **Hybrid Cloud Architecture**. Ứng dụng cung cấp các tính năng mạnh mẽ giúp chủ trọ quản lý số lượng phòng lớn, khách thuê, hợp đồng, tình hình tài chính, thu chi điện nước một cách trực quan, nhanh chóng và đa nền tảng.

---

## ⚡ Các tính năng nổi bật

- ☁️ **Real-time Database:** Hoạt động online 100% với **Supabase Serverless PostgreSQL**.
- 📥 **PWA Installable:** Có thể cài đặt trực tiếp trên màn hình chính của điện thoại và máy tính như một ứng dụng Native, không cần tải qua App Store hay Google Play.
- 💾 **Google Drive Auto-Backup:** Cơ chế đồng bộ hóa mây kép (Dual Cloud) - Định kỳ đẩy file backup an toàn tuyệt đối lên thẳng hệ sinh thái Google Drive cá nhân của người dùng. Khôi phục trực tiếp "1-chạm" từ Mây.
- 📊 **Dashboard Trực Quan:** Bảng điều khiển (Dashboard) thông minh, giám sát tỷ lệ lấp đầy, số dư nợ, biểu đồ doanh thu theo tháng/năm.
- 👨‍👩‍👧‍👦 **Quản Trị Khách Thuê & Hợp Đồng:** Quản lý vòng đời hợp đồng đầy đủ (Ký kết, cọc, kết thúc), nắm bắt thông tin nhanh chóng.
- ⚡ **Quản Lý Bảng Chỉ Số Ghi Điện Nước:** Tự động tính cước chênh lệch chỉ số thông minh từng phòng hàng tháng.
- 💳 **In Hóa Đơn & Nhắc Nợ Nhanh:** Hóa đơn được tự động tính toán tổng số tiền dựa theo đơn giá chuẩn hoặc tùy chỉnh từng dịch vụ, in hóa đơn nhanh bằng 1 click.

---

## 🛠️ Công nghệ sử dụng

| Phân lớp | Ngôn ngữ / Framework / Dịch vụ |
| --- | --- |
| **Frontend Framework** | React.js (Vite) |
| **Styling & UI Kit** | Material UI (MUI v5) + Emotion |
| **State Management** | Zustand |
| **BaaS (Backend as a Service)** | Supabase (PostgreSQL) |
| **Routing** | React Router DOM v6 |
| **PWA Service Worker** | Vite PWA Plugin |
| **Google API** | `@react-oauth/google` (Drive v3 API) |
| **Dates/Math utilities** | Day.js |
| **Deployment** | Vercel (Recommended) |

---

## 📂 Kiến trúc Thư Mục (Folder Structure)

```bash
📦 QLPhongTro
 ┣ 📂 public/              # Chứa các tài nguyên tĩnh: Icon PWA, robots.txt, v.v.
 ┣ 📂 docs/                # Các file tài liệu mô tả kế hoạch và kiến trúc xây dựng (Migration Plan, Supabase Schema, GDrive Plan)
 ┣ 📂 src/                 # 💻 Toàn bộ Source Code chính
 ┃ ┣ 📂 components/        # Component UI sử dụng lại chung (Common: Header, Button, Dialog) & Layout (Sidebar, Topbar)
 ┃ ┣ 📂 db/                # Tầng truy xuất Dữ liệu
 ┃ ┃ ┣ 📜 supabaseClient.ts  # Khởi tạo instance kết nối kết nối Supabase
 ┃ ┃ ┣ 📜 database.ts        # Mô tả Type/Interfaces (Bill, Tenant, v.v.)
 ┃ ┃ ┗ 📜 seed.ts            # Script đổ dữ liệu mẫu nhanh (Nhà trọ Cô Hợi)
 ┃ ┣ 📂 pages/             # Các màn hình chính (Dashboard, Rooms, Tenants, Bills, Backup, Settings)
 ┃ ┣ 📂 stores/            # Nơi định nghĩa Zustand Hooks (bảo hiểm Global State Management toàn hệ thống)
 ┃ ┣ 📂 theme/             # Global Material UI override & Custom colors
 ┃ ┣ 📂 utils/             # Hàm Utilities (Fortmat ngày, tiền tệ, xử lý Backup GDrive)
 ┃ ┣ 📜 App.tsx            # Entry Routing Component có bọc màng GoogleOAuthProvider
 ┃ ┗ 📜 main.tsx           # Entry React + PWA Register
 ┣ 📜 .env                 # File chứa biến môi trường (Supabase URL, Anon Key)
 ┣ 📜 package.json         # Danh sách packages & build scripts
 ┣ 📜 tsconfig.json        # Cấu hình TypeScript
 ┗ 📜 vite.config.ts       # Option build Vite và config manifest cho PWA
```

---

## 🚀 Khởi chạy dự án Local

**Bước 1:** Clone source code từ Git
```bash
git clone https://github.com/ngaothetieutu/Hostify.git
cd Hostify
```

**Bước 2:** Cài đặt dependencies (NPM Node Modules)
```bash
npm install --legacy-peer-deps
```
*(Option `--legacy-peer-deps` để bỏ qua xung đột nhỏ của Vite plugin PWA)*

**Bước 3:** Cấu hình biến môi trường
Tạo file `.env` ở root với nội dung được cung cấp trên Supabase Project Dashboard:
```env
VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

**Bước 4:** Thiết lập Database
Copy đoạn code SQL trong đường dẫn `docs/supabase_schema.sql` và ném vào khung **SQL Editor** trên Supabase để tạo 8 Bảng dữ liệu chuẩn xác định dạng khóa ngoại. 
*Lưu ý: Chỉnh sửa tắt RLS (hoặc cấp quyền Allow All) cho 8 bảng dữ liệu trên.*

**Bước 5:** Khởi động Development Web Server
```bash
npm run dev
```
Trang web sẽ tự động mở ở địa chỉ: `http://localhost:3000` hoặc `http://localhost:5173`.

---

## 🌍 Triển khai Production (Web Hosting)

Dự án này tương thích 100% với nền tảng **Vercel** hoặc **Netlify**.

1. Đăng nhập vào Vercel, chọn **Add New Project**.
2. Liên kết đến kho chứa `ngaothetieutu/Hostify` trên Github của bạn.
3. Trong phần **Environment Variables**, điền thông tin Supabase (`VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`) giống file `.env` local.
4. Bấm **Deploy**.
5. Ghi nhớ copy đường dẫn miền Web thật (vd: `https://hostify-app.vercel.app`) dán ngược trở lại phần Cấu hình `Client ID OAuth của Google` ở mục API Google Cloud Console để bộ API GDrive được cấp phép hoạt động trơn tru trên Production (Sẽ gặp lỗi nếu bỏ qua bước này).

---

🔥 Được phát triển chuyên môn hóa phục vụ Quản lý Phòng Trọ Việt Nam.

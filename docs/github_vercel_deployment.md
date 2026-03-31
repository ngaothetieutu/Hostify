# Hướng Dẫn Cập Nhật Code Lên GitHub & Deploy Vercel (Tự Động & Bằng CLI)

## Phương Án 1: Triển Khai Tự Động Qua GitHub (Khuyên Dùng)
Vì dự án của bạn (repo `ngaothetieutu/Hostify`) đã được kết nối (link) với Vercel, nên mỗi khi bạn đẩy code mới lên GitHub, Vercel sẽ tự động phát hiện và xây dựng lại ứng dụng.

### Các bước thực hiện:
Mở Terminal (Command Prompt / PowerShell) tại thư mục `QLPhongTro` và chạy 3 lệnh sau:

1. **Thêm tất cả các file vừa chỉnh sửa:**
   ```bash
   git add .
   ```

2. **Tạo gói commit với lời nhắn:**
   ```bash
   git commit -m "fix(ui): Chỉnh sửa giao diện mobile, kéo dài ô input, thêm nút X tắt Popup"
   ```

3. **Đẩy code lên GitHub:**
   ```bash
   git push origin main
   ```
   *(Lưu ý: Nếu nhánh chính của bạn là `master`, hãy dùng `git push origin master`)*

👉 **Kết quả:** Ngay lập tức, Vercel sẽ nhận được thông báo từ GitHub. Bạn chỉ cần lên trang Vercel hoặc đợi khoảng 1-2 phút, ứng dụng sẽ được cập nhật phiên bản mới nhất!

---

## Phương Án 2: Triển Khai Bằng Vercel CLI (Gõ Lệnh Trực Tiếp)
Nếu bạn không muốn thông qua GitHub mà muốn "bắn thẳng" code từ máy tính lên Vercel, bạn có thể dùng Vercel CLI.

### Bước 1: Cài đặt Vercel CLI toàn cầu (chỉ làm 1 lần)
```bash
npm i -g vercel
```

### Bước 2: Deploy lên môi trường Testing (Preview)
Chạy lệnh sau để đẩy code lên Vercel nhưng chưa công bố chính thức:
```bash
vercel
```
*(Hệ thống sẽ hỏi bạn vài câu như Set up and deploy?, Link to existing project?,... Bạn cứ bấm `Y` (Yes) và gõ `Enter` vài lần).*

### Bước 3: Deploy thẳng lên Production (Chính thức)
Khi đã chắc chắn code hoạt động tốt và muốn cập nhật ứng dụng thật:
```bash
vercel --prod
```

**Lưu ý cực kỳ quan trọng về Variables (Biến môi trường) khi dùng Vercel:**
Cả 2 cách triển khai trên đều yêu cầu Vercel phải biết được 2 biến `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`. 
- Với Cách 1, bạn đã cấu hình trên Dashboard Vercel trang web nên không cần lo.
- Với Cách 2, Vercel CLI sẽ tự động tải các biến này từ file `.env` lên, hoặc bạn có thể phải cài đặt thông qua lệnh `vercel env pull`.

---
*Bản tài liệu này luôn được lưu ở `docs/github_vercel_deployment.md` để bạn đọc lại lúc cần.*

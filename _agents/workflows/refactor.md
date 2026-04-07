---
description: Quy trình chuẩn refactor và code tính năng mới
---

# Workflow: Refactor & Phát triển tính năng

Để tránh lost context trong quá trình làm việc, hãy LUÔN follow quy trình sau trước khi thực hiện phân tích hoặc viết code:

1. **Hiểu rõ Hiện trạng (Understand Current State)**: 
   - ĐẶC BIỆT chú ý luôn phải dùng công cụ `view_file` để kiểm tra tài liệu `docs/project_overview.md`.
   - Nắm vững kiến trúc dự án (Tech stack: React, MUI, Vite, Supabase).
   - Nắm vững Schema dữ liệu hiện tại (`docs/supabase_schema.sql` hoặc ERD trong markdown).

2. **Kiểm tra luồng xử lý Data (Data flow review)**:
   - Hệ thống dùng `Zustand` kết hợp với `Supabase`. Việc lưu vào DB và setState cần theo logic đồng bộ chuẩn.
   - Review file chức năng để hiểu code style hiện tại (như cách xử lý Form, cách bóc tách React hook vs API).

3. **Thực hiện Requirement (Implement)**:
   - Break nhỏ các step. Viết code. Giữ mọi thứ trong khuôn khổ convention cũ.

4. **Compact State (Cập nhật lại tài liệu)**:
   - NẾU có sự thay đổi lớn về database (thêm bảng, đổi field) hoặc architecture (thêm package xịn), hãy dùng thẻ `replace_file_content` cập nhật vào file `docs/project_overview.md`.
   - Việc này đảm bảo Agent tiếp theo đọc file sẽ có bối cảnh up-to-date nhất.

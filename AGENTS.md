# AGENT OPERATING DIRECTIVES & SYSTEM INSTRUCTIONS

Tệp tin này định nghĩa các chỉ thị vận hành bắt buộc đối với mọi AI Coding Agent (Cursor, Antigravity, Windsurf, Copilot, Claude Code...) khi làm việc trên kho mã nguồn này.

---

## 1. Mệnh lệnh Khởi động Bắt buộc (Bootstrapping Protocol)
Trước khi phân tích yêu cầu của người dùng hoặc chỉnh sửa bất kỳ dòng mã nào, Agent **BẮT BUỘC** phải đọc và ghi nhớ toàn bộ nội dung trong 3 tệp tài liệu bối cảnh (Context Anchors) tại thư mục `docs/`:

1. `docs/ARCHITECTURE.md`: Bản vẽ kiến trúc Vertical Slice, luật phân tầng, cơ chế Dynamic Loader và ranh giới hệ thống.
2. `docs/CONVENTIONS.md`: Bộ quy chuẩn kỹ thuật, chính sách Zero `any`, quy chuẩn Discord interaction, xử lý lỗi với `AppError`, bảng mã màu và logging.
3. `docs/ROADMAP.md`: Bản đồ tiến độ hiện tại. Agent phải tra cứu xem nhiệm vụ được giao thuộc Phase nào và các điều kiện tiên quyết đã hoàn thành hay chưa.

---

## 2. Luật Vận hành Bất biến (Non-Negotiable Constraints)

* **VÙNG CẤM `src/core/`:** Tuyệt đối không tự ý chỉnh sửa, tái cấu trúc hoặc thêm logic vào `src/core/` trừ khi có chỉ thị trực tiếp từ người dùng yêu cầu nâng cấp hạ tầng hoặc loaders.
* **ZERO CROSS-FEATURE IMPORT:** Thư mục `src/features/<A>/` tuyệt đối không được import bất kỳ tệp nào từ `src/features/<B>/`. Mọi giao tiếp liên tính năng phải đi qua Internal Event Bus (`src/core/bus.ts`) hoặc cơ sở dữ liệu chung (`src/shared/db/`).
* **CHÍNH SÁCH KIỂU DỮ LIỆU:**
  * Cấm tiệt từ khóa `any` (kể cả ép kiểu dạng `as any`). Dùng `unknown` kèm Type Guards hoặc Zod schema.
  * Cấm TypeScript `enum`; bắt buộc dùng Object `as const`.
* **QUY TẮC DISCORD API:**
  * Mọi interaction có tương tác I/O (Database, API ngoài) **bắt buộc defer đúng theo quy chuẩn `docs/CONVENTIONS.md` (chú ý ngoại lệ Autocomplete, Modal & Component deferUpdate)**.
  * Cấm hardcode màu Embed; nhập màu từ `src/shared/constants/colors.ts`.
  * Cấm hardcode chuỗi phản hồi song ngữ; phân giải ngôn ngữ qua `getUserLocale()` và file locale riêng.
* **LOGGING & BẮT LỖI:**
  * Cấm tiệt `console.log`. Sử dụng duy nhất instance `logger` từ `src/core/logger.ts`.
  * Cấm các khối `catch (e) {}` rỗng hoặc nuốt lỗi. Mọi lỗi nghiệp vụ phải ném qua `AppError`.
* **CẬP NHẬT TIẾN ĐỘ:** Khi hoàn thành xuất sắc một task và đã xác nhận hoạt động, Agent có trách nhiệm tự động cập nhật đánh dấu `[x]` vào tệp `docs/ROADMAP.md`.

---

## 3. Quy trình Triển khai Tính năng (Atomic Feature Cycle)

Khi nhận yêu cầu viết tính năng mới, Agent phải thực thi tuần tự theo 3 bước:

1. **Bước 1 - Lập kế hoạch (Plan First):** 
   * Đọc kỹ tài liệu trong `docs/`.
   * Liệt kê các file sẽ tạo mới hoặc sửa đổi trong `src/features/<feature-name>/`.
   * Trình bày kế hoạch xử lý lỗi, schema DB (nếu có) và logic interaction.
   * Chờ người dùng xác nhận hoặc điều chỉnh kế hoạch trước khi code.
2. **Bước 2 - Thực thi (Implementation):**
   * Viết code bám sát `docs/CONVENTIONS.md`.
   * Đảm bảo tính module hóa cao, code có type rõ ràng, sạch sẽ.
3. **Bước 3 - Bàn giao & Nhắc nhở (Verification & Handoff):**
   * Nếu có tạo hoặc sửa đổi Slash Command mới: Nhắc người dùng chạy lệnh `npm run deploy:dev`.
   * Cập nhật checklist trong `docs/ROADMAP.md`.

---

## 4. Các Lệnh CLI Dự án Thường dùng

* `npm run dev`: Chạy tiến trình bot ở môi trường dev (`tsx watch`).
* `npm run deploy:dev`: Đẩy Slash Commands mới vào Server Test (`DEV_GUILD_ID`).
* `npm run deploy:prod`: Đẩy Slash Commands lên phạm vi Global.
* `npm run deploy:clear:dev`: Xóa toàn bộ Slash Commands trên Server Test.
* `npx prisma migrate dev`: Chạy migration cập nhật cơ sở dữ liệu.
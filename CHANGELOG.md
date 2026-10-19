# Changelog

Tất cả các thay đổi đáng chú ý của dự án **Lora** (`discordbot_lora`) sẽ được ghi nhận chi tiết tại tệp tin này.

Định dạng tài liệu tuân thủ chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) và quy chuẩn phiên bản [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`v<MAJOR>.<MINOR>.<PATCH> [CODENAME]`).

---

## [0.2.8] - 2026-10-19 [FEAT-01: Perks - Booster Housekeeping]

### Đã thêm (Added)
- Bắt buộc kiểm tra mã màu chính (`color1`) khi thành viên cấu hình Custom Role dạng gradient (`color2`) lần đầu (`MISSING_PRIMARY_COLOR`).

### Đã thay đổi (Changed)
- Danh xưng trong lệnh `/perk server_booster role_view` tự động điều chỉnh phù hợp khi Staff có quyền `ManageRoles` tra cứu hồ sơ người dùng khác trong thời gian ân hạn (`của <user>`).
- Chuẩn hóa 100% cờ hiển thị riêng tư từ `ephemeral: true` sang `flags: MessageFlags.Ephemeral` theo chuẩn Discord.js v14.18+.

### Đã xóa (Removed)
- Xóa bỏ bảng và model `RoleUpdateQueue` khỏi database Prisma (thực thi migration `20261019051555_remove_role_update_queue`).
- Loại bỏ kiểu dữ liệu `QueueStatus` thừa trong `perks.types.ts`.

### Tái cấu trúc & Đồng bộ (Refactored)
- Tái cấu trúc hệ thống tài liệu toàn dự án: Tách 80 dòng lịch sử khởi tạo nền tảng sang [`docs/history/01-foundation-core.md`](./docs/history/01-foundation-core.md).
- Tinh gọn [`docs/ROADMAP.md`](./docs/ROADMAP.md) thành Executive Dashboard theo các Workstream Tracks (`FEAT`, `WEB`, `CORE`).

---

## [0.2.7] - 2026-10-19 [FEAT-01: Interactive Unboost Workflow]

### Đã thêm (Added)
- Quy trình unboost tương tác (**Interactive Unboost Workflow**) dành cho Administrator khi đặt số lượt boost về `0` cho thành viên đang sở hữu Custom Role:
  - Cung cấp 2 nút bấm tương tác: `Tiêu Chuẩn (Ân hạn 7 ngày)` và `Can Thiệp (Thu hồi & xóa role ngay lập tức)`.
  - Cơ chế bảo mật 2 lớp: Chỉ Admin đã gõ lệnh mới có quyền xác nhận bấm nút.

---

## [0.2.6] - 2026-10-18 [FEAT-01: Unified Booster Resolution]

### Đã thêm (Added)
- Cơ chế nhận diện Booster hợp nhất (**Unified Booster Resolution**): Thành viên được công nhận là Booster khi có `member.premiumSince != null` trên Discord HOẶC có số lượt boost ghi nhận trong DB `boostCount > 0`.
- Cho phép tài khoản thử nghiệm được gán boost thủ công có thể nhận và cấu hình role đầy đủ như booster thật.

---

## [0.2.5] - 2026-10-18 [FEAT-01: Enhanced Role Colors Automation]

### Đã thêm (Added)
- Tự động hóa 100% đổi màu Gradient 2 màu trực tiếp qua Discord API v10 (`EnhancedRoleColors`).
- Biến đổi màu tức thì trên server sau 0.5s mà không cần Staff duyệt thủ công.

### Đã xóa (Removed)
- Loại bỏ toàn bộ quy trình hàng đợi duyệt thủ công và subcommand `role_pending_update`.

---

## [0.2.4] - 2026-10-18 [FEAT-01: Single Color Reset Fix]

### Đã sửa (Fixed)
- Sửa lỗi kẹt mã màu gradient cũ (`roleColor2`) trong database khi người dùng cấu hình Custom Role từ gradient chuyển về màu đơn sắc.

---

## [0.2.3] - 2026-10-18 [FEAT-01: Restructuring & Grace Period]

### Đã thêm (Added)
- Tách cấu trúc thư mục nội bộ `perks/` thành `common/` (lệnh dùng chung) và `booster/` (nghiệp vụ booster).
- Bổ sung bộ đếm ngược cảnh báo thời gian ân hạn trong lệnh `/perk server_booster role_view`.

---

## [0.2.1] - [0.2.2] - 2026-10-17 [FEAT-01: Authoritative Baseline]

### Đã thêm (Added)
- Bổ sung subcommand `/perk server_booster set_boost user:<@User> count:<number>` dành riêng cho Administrator để đồng bộ số lượt boost chuẩn khi phát sinh sai lệch từ Gateway.

---

## [0.2.0] - 2026-10-17 [FEAT-01: Server Booster Perks Initial Release]

### Đã thêm (Added)
- Khởi tạo lát cắt tính năng `FEAT-01: Server Booster Perks`:
  - Quản lý Custom Role độc quyền cho Booster.
  - Quản lý phân cấp Role Hierarchy thông qua `anchorRoleId`.
  - Bộ lệnh Slash `/perk list`, `/perk status`, `/perk server_booster info|role_view|role_claim|role_unclaim|role_config`.
  - Cron Job định kỳ 10 phút quét dọn và thu hồi Custom Role quá hạn 7 ngày ân hạn.

---

## [0.1.0] - 2026-10-16 [CORE-01: Platform Foundation & Dynamic Loaders]

### Đã thêm (Added)
- Dựng toàn bộ kiến trúc lõi Vertical Slice Architecture.
- Thiết lập TypeScript Strict Mode (ESM NodeNext), Zod Configuration Validation, Pino Logger.
- Singleton `AsyncEventBus` (Error Boundary cô lập, `maxListeners: 50`).
- Cơ chế nạp động (Dynamic Loaders): `command.loader.ts`, `event.loader.ts`, `job.loader.ts`, `route.loader.ts`.
- Cơ sở dữ liệu Prisma với SQLite WAL Mode (`dev.db`).
- Fastify HTTP Web Server chạy song song phục vụ REST API và OAuth2 Linked Roles.
- Quy trình ngắt an toàn Graceful Shutdown bắt `SIGINT` / `SIGTERM`.

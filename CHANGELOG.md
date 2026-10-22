# Changelog

Tất cả các thay đổi đáng chú ý của dự án **Lora** (`discordbot_lora`) sẽ được ghi nhận chi tiết tại tệp tin này.

Định dạng tài liệu tuân thủ chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) và quy chuẩn phiên bản [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`v<MAJOR>.<MINOR>.<PATCH> [CODENAME]`).

---

## [0.5.0] - 2026-10-22 [FEAT-04: Voice Keeper 24/7 (Treo Kênh Thoại & Tự Phục Hồi)]

### Đã thêm (Added)
- **Kiến trúc & Động cơ Quản lý Kênh Thoại 24/7 (Voice Keeper Engine):**
  - Xây dựng lát cắt độc lập `src/features/voice-keeper/` tuân thủ nghiêm ngặt mô hình Vertical Slice và Zero Cross-Feature Import.
  - Tầng Service `VoiceKeeperService` (`voice-keeper.service.ts`) quản lý VoiceConnection Pool per-guild, tự động tham gia (`joinVoiceChannel`), ngắt kết nối an toàn và theo dõi độ trễ ping WebSocket.
  - Cơ chế tự phục hồi 3 tầng (Three-Tier Self-Healing):
    - **Tầng Khởi động (`voice-ready.event.ts`):** Quét toàn bộ máy chủ kích hoạt `isEnabled = true` trong Database khi bot khởi động (`ClientReady`) để thiết lập lại kết nối tự động.
    - **Tầng Gateway Reactive (`voice-state-update.event.ts`):** Lắng nghe sự kiện `voiceStateUpdate` để phát hiện ngay khi bot bị disconnect/kick ngoài ý muốn hoặc bị di chuyển sang kênh khác, tự động khôi phục về kênh cấu hình.
    - **Tầng Watchdog Chủ động (`voice-health.job.ts`):** Chạy ngầm định kỳ mỗi 10 phút (`*/10 * * * *`) kiểm tra tình trạng kết nối ngầm và tái kích hoạt các kênh bị rớt mà không phát sự kiện.
  - Hệ thống bảo vệ Gateway:
    - **Exponential Backoff:** Giãn cách thời gian thử lại (`5s, 15s, 45s, 90s, 180s`) khi gặp sự cố mạng hoặc lỗi kết nối.
    - **Circuit Breaker:** Ngắt kết nối và chuyển sang trạng thái `SUSPENDED` sau 5 lần thử lại thất bại liên tiếp để chống spam Discord API rate limits.
  - Tối ưu băng thông mạng và quyền riêng tư: Mặc định bật `selfDeaf: true` và `selfMute: true`.
- **Bộ Lệnh Slash Command (`/voice_keeper`):**
  - Triển khai Root Command `/voice_keeper` với 4 subcommands:
    - `/voice_keeper set <channel> [self_deaf] [self_mute] [auto_reconnect]`: Thiết lập và kết nối kênh thoại 24/7 (yêu cầu quyền `ManageChannels` hoặc `Administrator`).
    - `/voice_keeper status`: Xem trạng thái kết nối, trạng thái cờ mic/deaf, ping, thời gian kết nối và số lần retry.
    - `/voice_keeper reconnect`: Ép kết nối lại ngay lập tức và reset bộ đếm retry.
    - `/voice_keeper stop`: Ngắt kết nối và tắt chế độ 24/7 trên máy chủ.
- **Xử lý An toàn Khi Kênh Bị Xóa (`voice-channel-delete.event.ts`):**
  - Tự động phát hiện khi kênh thoại đang treo bị xóa khỏi Discord để tắt cấu hình trong DB và ngắt kết nối an toàn, tránh rơi vào vòng lặp lỗi.
- **Cơ sở Dữ liệu & Prisma Schema:**
  - Bổ sung model Prisma `VoiceKeeperConfig` tại `src/shared/db/schema.prisma`.
  - Thực thi migration `20261022012405_add_voice_keeper_config`.
- **Bản địa hóa & Tài liệu:**
  - Từ điển song ngữ `vi` / `en` chuẩn Zero `any` tại `voice-keeper.locale.ts`.
  - Đặc tả yêu cầu chi tiết tại `FRD.md` và cẩm nang vận hành tại `README.md`.

---

## [0.4.0] - 2026-10-22 [FEAT-03: Swarm Linked Roles & Connection Metadata Engine]

### Đã thêm (Added)
- **Kiến trúc & Động cơ Metadata (Connection Metadata Engine):**
  - Xây dựng lát cắt độc lập hoàn toàn `src/features/swarm-linked-roles/` tuân thủ kiến trúc Vertical Slice.
  - Tầng Service `SwarmMetadataService` (`swarm-metadata.service.ts`) quản lý giao tiếp trực tiếp với Discord REST API (`PUT /users/@me/applications/{id}/role-connection`) và đăng ký schema metadata ở cấp độ Application.
  - Tầng Service `SwarmAuthService` (`swarm-auth.service.ts`) xử lý toàn bộ luồng OAuth2 (`identify`, `role_connections.write`), đổi authorization code lấy token, bảo vệ chống CSRF bằng chữ ký HMAC-SHA256, và cơ chế tự động refresh access token trước khi hết hạn.
  - Tầng Service `SwarmOperatorService` (`swarm-operator.service.ts`) thực thi mô hình phân quyền 2 tầng: Bot Owner (Super Admin) và Delegated Operator.
  - Tầng Service `SwarmNotificationService` (`swarm-notification.service.ts`) quản lý kênh thông báo per-guild, phát Embed thăng cấp và thu hồi role trang trọng.
- **Tích hợp Web Server Kép (Fastify BotRoute):**
  - Triển khai `swarm.route.ts` với prefix `/auth`, tự động nạp qua `route.loader.ts`.
  - Endpoint `GET /auth/discord/login` điều hướng sang Discord consent screen.
  - Endpoint `GET /auth/discord/callback` xác thực state, trao đổi mã token, cập nhật metadata tức thì và trả về trang HTML thông báo thành công với giao diện dark mode hiện đại.
- **Bộ Lệnh Slash Command (`/swarm`):**
  - Triển khai Root Command `/swarm` với 6 subcommands độc lập:
    - `/swarm set <user> <level>`: Operator gán cấp độ từ 1 đến 8 và đẩy dữ liệu lên Discord.
    - `/swarm remove <user>`: Operator thu hồi cấp độ về 0 để Discord gỡ role.
    - `/swarm status [user]`: Tra cứu hồ sơ cấp độ, trạng thái OAuth2 và người cập nhật.
    - `/swarm link`: Nhận liên kết xác thực Discord OAuth2 an toàn.
    - `/swarm delegate add|remove|list`: Bot Owner ủy quyền hoặc gỡ quyền Operator.
    - `/swarm channel set|remove`: Operator cấu hình kênh nhận thông báo thăng cấp/thu hồi.
- **Công cụ CLI & Script Triển khai:**
  - Script CLI `register-metadata.ts` và lệnh `npm run deploy:metadata` để đăng ký schema `swarm_level` (Integer Equal) lên Discord Developer Portal.
- **Cơ sở Dữ liệu & Prisma Schema:**
  - Bổ sung 4 model Prisma mới: `SwarmMemberMetadata`, `SwarmOAuthToken`, `SwarmOperator`, `SwarmGuildConfig`.
  - Thực thi migration `20261021174647_add_swarm_linked_roles`.
- **Bản địa hóa & Tài liệu:**
  - Từ điển song ngữ `vi`/`en` chuẩn Zero `any` tại `swarm.locale.ts`.
  - Bản đặc tả yêu cầu `FRD.md` và cẩm nang vận hành `README.md`.

---

## [0.3.0] - 2026-10-21 [FEAT-02: Perks Management - Donator (Time-Bank & Hybrid Retention)]

### Đã thêm (Added)
- **Nghiệp vụ Cốt lõi & Động cơ Quỹ Thời Gian (Time-Bank Engine):**
  - Xây dựng tầng Service trung tâm `DonatorPerkService` (`donator-perk.service.ts`) quản lý toàn diện vòng đời tài khoản Donator.
  - Cơ chế **Lazy Evaluation Engine**: Tính toán tiêu hao credit chính xác theo $\Delta t$ và burn rate ($1.0x$ khi trang bị, $0.2x$ khi cất kho, $0.0x$ khi đóng băng tắt tính năng).
  - Tối ưu an toàn bộ nhớ: Hàm `getAccountStatus()` thực hiện tính toán thuần túy in-memory (`commit = false`), tuyệt đối không ghi/cập nhật DB, loại bỏ nguy cơ khóa ghi SQLite.
  - Đòn bẩy Thưởng Kép (Hybrid Multiplier): Thưởng giá trị nạp (Volume Bonus $10\% - 35\%$) và Thưởng chuỗi tuần (Weekly Streak Bonus $+5\% - +20\%$) neo cứng múi giờ UTC+7 (`Asia/Ho_Chi_Minh`).
  - Hỗ trợ trần tích lũy chuỗi vinh danh `WeeklyStreakRule.MAX_STREAK = 100` tuần, trong khi trần thưởng kinh tế neo cố định tại mốc $\ge 4$ tuần (`MAX_BONUS_STREAK_TIER = 4`).
- **Gateway Events & Scheduled Background Jobs:**
  - `donator-leave.event.ts`: Lắng nghe sự kiện `Events.GuildMemberRemove` để tự động chốt nợ credit ở tốc độ $1.0x$ và chuyển sang trạng thái cất kho ($0.2x$) nhằm bảo lưu tối đa thời gian cho thành viên khi rời server.
  - `donator-cleanup.job.ts`: Cron job định kỳ mỗi 10 phút (`*/10 * * * *`) tự động quét và thu hồi role của các tài khoản cạn quỹ credit (`creditSeconds <= 0`), hỗ trợ xử lý an toàn lỗi Discord API 50007 (khi user chặn DM) và fallback thông báo sang kênh đã cấu hình.
  - `donator-decay.job.ts`: Cron job chạy lúc 00:00 Thứ Hai hàng tuần (UTC+7) thực hiện suy giảm mềm (-1 streak) cho các user không đạt hạn mức tuần trước.
- **Cơ sở Dữ liệu & Prisma Schema:**
  - Bổ sung 3 model Prisma mới: `DonatorPerkConfig`, `DonatorAccount`, `DonatorTransaction` với khóa ngoại, unique constraints và index tối ưu.
  - Thực thi migration `20261021002237_add_donator_perk_models`.
- **Giao diện & Bộ Lệnh Slash Command (`/perk donator`):**
  - Xây dựng từ điển bản địa hóa song ngữ `vi`/`en` chuẩn Zero `any` tại `src/features/perks/donator/donator.locale.ts`.
  - Triển khai 9 Subcommand Executors độc lập trong `src/features/perks/donator/subcommands/`:
    - `donator-info.sub.ts`: Bảng quy đổi cơ sở (200k = 30 ngày), bảng thưởng Volume (10% - 35%), thưởng Streak (5% - 20%), cơ chế cất kho (0.2x) và đóng băng bảo lưu (0.0x).
    - `donator-status.sub.ts`: Tra cứu chi tiết số dư credit, trạng thái trang bị/cất kho, chuỗi streak tuần này và ngày dự kiến cạn quỹ (bảo vệ quyền riêng tư, chỉ Administrator được xem người khác).
    - `donator-equip.sub.ts`: Thành viên tự chủ động đeo role và kích hoạt tốc độ tiêu hao 1.0x.
    - `donator-unequip.sub.ts`: Thành viên tự chủ cất role vào kho tiết kiệm, giảm tốc độ tiêu hao 5 lần (0.2x).
    - `donator-add.sub.ts`: Administrator ghi nhận khoản ủng hộ, tự động áp dụng công thức thưởng kép, cộng credit và cấp role tức thì.
    - `donator-adjust.sub.ts`: Administrator điều chỉnh tăng/giảm quỹ thời gian credit có ghi nhận lý do.
    - `donator-setstreak.sub.ts`: Administrator can thiệp thủ công bậc streak cho thành viên (0 đến 100).
    - `donator-config.sub.ts`: Cấu hình hệ thống Donator Perk (xem cấu hình `view`, gán role `set_role` có kiểm tra Bot Role Hierarchy, cài đặt kênh thông báo `set_channel`).
    - `donator-toggle.sub.ts`: Administrator Bật/Tắt tính năng Donator Perk (kèm cơ chế đóng băng thời gian 0.0x khi tắt).
  - Tích hợp Subcommand Group `donator` vào Root Command `/perk` (`perks.command.ts`).

### Đã thay đổi (Changed)
- Cập nhật `/perk list` (`list.sub.ts`): Bổ sung phần giới thiệu chi tiết quyền lợi Donator (Gói ủng hộ tự chủ & Thưởng kép).
- Cập nhật `/perk status` (`status.sub.ts`): Bổ sung section "Donator Status" hiển thị hài hòa bên dưới "Booster Status" khi thành viên có credit.
- Nâng cấp phiên bản toàn hệ thống lên `v0.3.0`.

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

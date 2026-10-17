# PROJECT ROADMAP & PROGRESS TRACKER

Tài liệu này theo dõi tiến độ phát triển của dự án theo từng giai đoạn (Milestones). 
Mọi phiên làm việc (Session) mới bắt buộc phải đọc tệp này để xác định nhiệm vụ tiếp theo, không được làm tắt hoặc nhảy cóc qua giai đoạn khi các điều kiện tiên quyết (Prerequisites) chưa hoàn tất.

---

## Trạng thái Quy ước:
* `[ ]` Chưa thực hiện
* `[/]` Đang tiến hành
* `[x]` Đã hoàn thành và đã kiểm thử (Verified & Committed)

---

## Phase 0: Project Skeleton & Core Loaders (Bộ khung bất biến)
> **Mục tiêu:** Dựng xong toàn bộ hạ tầng `src/core/`, chạy được lệnh `/ping` thử nghiệm qua cơ chế Dynamic Loader mà không gặp lỗi.

- [x] **Phase 0.0: Architecture & Environment Patching (Đồng bộ hạ tầng & Vá lỗi thiết kế)**
  - [x] Chuyển đổi `package.json` sang ESM (`"type": "module"`), cài đặt đầy đủ dependencies (`zod`, `pino`, `fastify`, `@fastify/cors`, `node-cron`, `@prisma/client`, `prisma`) và devDependencies (`pino-pretty`, `@types/node-cron`, `tsx`, `typescript`, `@types/node`).
  - [x] Thiết lập scripts chuẩn trong `package.json`: `dev`, `build`, `deploy:dev`, `deploy:prod`, `deploy:clear:dev`, `deploy:clear:global`.
  - [x] Tối ưu hóa `tsconfig.json`: Tắt `exactOptionalPropertyTypes`, loại bỏ cấu hình thừa `jsx`, cấu hình chuẩn Node.js ESM (`NodeNext`).
  - [x] Đồng bộ `.env.example`: Đổi sang `DEV_GUILD_ID`, bổ sung `LOG_LEVEL=debug`, `NODE_ENV=development`, chuỗi kết nối SQLite tối ưu (`journal_mode=WAL`, `busy_timeout=5000`).
  - [x] Cập nhật `docs/CONVENTIONS.md`: Nới lỏng quy tắc 2.5s, bổ sung ngoại lệ rõ ràng cho Autocomplete (`respond`), Modal (`showModal`), và Component update (`deferUpdate`).
  - [x] Cập nhật `docs/ARCHITECTURE.md`: Đổi quy ước hậu tố subcommand thành `*.sub.ts`, thiết kế lại Event Bus thành `AsyncEventBus` (`Promise.allSettled`, `maxListeners: 50`), bổ sung Gateway Readiness Guard cho Fastify routes, bổ sung chuẩn cấu hình SQLite WAL.

- [x] **0.1. Cấu hình Môi trường & Core Modules**
  - [x] Khởi tạo `src/core/types/index.ts`: Khai báo `BotCommand`, `SubcommandExecutor`, `BotEvent`.
  - [x] Khởi tạo `src/core/errors.ts`: Định nghĩa class `AppError`.
  - [x] Khởi tạo `src/core/config.ts`: Validate `.env` bằng Zod (`DISCORD_TOKEN`, `CLIENT_ID`, `DEV_GUILD_ID`, `DATABASE_URL`, `PORT`, `NODE_ENV`, `LOG_LEVEL`).
  - [x] Khởi tạo `src/core/logger.ts`: Logger chuẩn bằng Pino (`pino-pretty` khi dev).
  - [x] Khởi tạo `src/core/bus.ts`: `AsyncEventBus` singleton kế thừa `EventEmitter` (`emitAsync`, `maxListeners: 50`).
  - [x] Khởi tạo `src/core/client.ts`: `ExtendedClient` kế thừa `Client` của discord.js (tích hợp Collection lưu trữ commands, bus).
- [x] **0.2. Dynamic Loaders**
  - [x] `src/core/loaders/command.loader.ts`: Quét đệ quy thư mục `src/features/` tìm các tệp `*.command.ts` (bỏ qua `*.sub.ts`).
  - [x] `src/core/loaders/event.loader.ts`: Quét đệ quy tìm các tệp `*.event.ts` và đăng ký listener với Client (bọc Error Boundary).
- [x] **0.3. Gateway Handlers & Error Boundary**
  - [x] `src/shared/constants/colors.ts`: Bảng mã màu Embed chuẩn (`EmbedColor`).
  - [x] `src/core/events/ready.ts`: Báo bot online, in tag bot và số lượng lệnh đã load.
  - [x] `src/core/events/interactionCreate.ts`: Điều hướng Slash Commands, bọc Error Boundary toàn cục, xử lý trả lời Ephemeral Embed khi xảy ra lỗi.
- [x] **0.4. Slash Command Deployment Script**
  - [x] `src/core/scripts/deploy.ts`: CLI script độc lập hỗ trợ các cờ:
    - `--dev`: Push lệnh vào Server Test (`DEV_GUILD_ID`).
    - `--prod`: Push lệnh lên Global.
    - `--clear-dev` / `--clear-global`: Xóa sạch lệnh rác.
- [x] **0.5. Feature Mẫu (Verification Slice)**
  - [x] Tạo `src/features/ping/`:
    - `ping.command.ts`: Lệnh `/ping`.
    - `ping.service.ts`: Xử lý tính toán roundtrip latency và websocket ping.
  - [x] Triển khai bootstrapper `src/index.ts` kết nối loaders, safety nets và gateway login.
  - [x] Kiểm thử tự động nhận diện Slash Command `/ping` và các Gateway Events thành công.

---

## Phase 1: Shared Kernel & Database Infrastructure
> **Mục tiêu:** Thiết lập kết nối cơ sở dữ liệu và các tiện ích dùng chung sẵn sàng cho các feature nghiệp vụ.

- [x] **1.1. Tầng Cơ sở dữ liệu (Database Layer)**
  - [x] Khởi tạo Prisma với SQLite tại `src/shared/db/schema.prisma` (`GuildSetting` model, WAL mode, busy timeout).
  - [x] Tạo singleton client tại `src/shared/db/client.ts`.
  - [x] Thiết lập migration script ban đầu (`npx prisma migrate dev`).
- [x] **1.2. Shared Utilities & Constants**
  - [x] `src/shared/constants/colors.ts`: Bảng mã màu Embed chuẩn (`PRIMARY`, `SUCCESS`, `ERROR`, `WARNING`, `MUTED`).
  - [x] `src/shared/utils/embed.util.ts`: Helper tạo Embed chuẩn hóa (tự gắn màu, footer, timestamp).
  - [x] `src/shared/utils/i18n.util.ts`: Helper phân giải ngôn ngữ (`getUserLocale`) dựa trên DB / Discord locale / fallback `vi`.

---

## Phase 2: Asynchronous Runners & Web Infrastructure
> **Mục tiêu:** Hoàn thiện 2 loader còn lại: Background Scheduler và Fastify Web Server.

- [ ] **2.1. Background Jobs Engine**
  - [ ] `src/core/loaders/job.loader.ts`: Quét các tệp `*.job.ts`, khởi tạo lịch với `node-cron`, tích hợp cờ chống chạy đè (concurrency guard).
- [ ] **2.2. Fastify Web Server**
  - [ ] `src/core/server/server.ts`: Khởi tạo Fastify instance, mở cổng `PORT`.
  - [ ] `src/core/loaders/route.loader.ts`: Quét các tệp `*.route.ts`, inject context `{ client, db }` vào từng route plugin.
- [ ] **2.3. Vòng đời tắt an toàn (Graceful Shutdown)**
  - [ ] `src/core/lifecycle.ts`: Bắt `SIGINT`/`SIGTERM`, tuần tự dừng Jobs $\rightarrow$ đóng Server HTTP $\rightarrow$ ngắt kết nối DB $\rightarrow$ ngắt kết nối Gateway.

---

## Phase 3: Vertical Slices - Nghiệp vụ Tính năng
> **Nguyên tắc:** Mỗi tính năng được phát triển độc lập trong `src/features/<feature-name>/`, hoàn thiện trọn vẹn và test xong mới chuyển sang tính năng kế tiếp.

- [ ] **Feature: Perks Management (Booster & Donator Role Policies)**
  - [ ] Bổ sung Schema tables cho Perk & Grace Period vào `schema.prisma`.
  - [ ] `perks.service.ts`: Logic cấp perk, tính ngày hết hạn, gia hạn, thu hồi.
  - [ ] `perks.event.ts`: Bắt event booster rời server hoặc unboost để kích hoạt grace period đếm ngược.
  - [ ] `perks.job.ts`: Cronjob định kỳ quét DB kiểm tra perk hết hạn để thu hồi role tự động.
  - [ ] `commands/`: Cấu trúc bóc tách các lệnh con (`/perk claim`, `/perk check`, `/perk manage`).
- [ ] **Feature: Wordchain (Trò chơi nối từ)**
  - [ ] State management: Lưu ván chơi live trên RAM, snapshot checkpoint vào DB.
  - [ ] `wordchain.service.ts`: Thuật toán kiểm tra từ điển tiếng Việt, lượt đi, tính điểm.
  - [ ] `wordchain.command.ts`: `/wordchain start`, `/wordchain stop`.
  - [ ] `wordchain.event.ts`: Lắng nghe tin nhắn trong kênh chơi game.
- [ ] **Feature: Voice Keeper 24/7 (Giữ Voice Channel)**
  - [ ] Cấu hình lưu kênh cần treo vào DB.
  - [ ] `voice-keeper.service.ts`: Quản lý voice connection, cơ chế tự động kết nối lại (auto-reconnect) khi rớt Gateway.
  - [ ] `voice-keeper.event.ts`: Lắng nghe `voiceStateUpdate` để phát hiện bị disconnect.
- [ ] **Feature: Linked Roles (Custom Connection Metadata)**
  - [ ] `linked-roles.route.ts`: Endpoint `/auth/discord` và callback OAuth2.
  - [ ] `linked-roles.service.ts`: Đẩy metadata user lên Discord API.
  - [ ] Script đăng ký Connection Metadata Schema với Discord.
- [ ] **Feature: Server Moderation (Tùy chọn bổ sung)**
  - [ ] Các công cụ quản trị cơ bản (`/ban`, `/kick`, `/warn`, `/purge`).

---

## Phase 4: Web Dashboard (Tách biệt hoàn toàn)
> **Mục tiêu:** Dựng giao diện quản lý trên thư mục `dashboard/` (Vite + React/Vue).

- [ ] `dashboard-api.route.ts`: Cung cấp REST API cho Dashboard lấy dữ liệu bot, perks, server config.
- [ ] Khởi tạo thư mục `dashboard/` với Vite SPA.
- [ ] Tích hợp Discord OAuth2 login cho Dashboard.
- [ ] Xây dựng các trang cấu hình (Perk dashboard, Wordchain stats, Voice control).
# Cột Mốc Kỹ Thuật: CORE-01 - Nền Tảng Hạ Tầng & Dynamic Loaders

> **Trạng thái:** HOÀN THÀNH & ĐÓNG BĂNG (Archived & Frozen)  
> **Phiên bản tương ứng:** `v0.1.0`  
> **Phạm vi mã nguồn:** `src/core/`, `src/shared/`, root configs (`package.json`, `tsconfig.json`, `.env.example`).  
> **Mục đích:** Tài liệu này lưu trữ chi tiết toàn bộ các thành phần hạ tầng cốt lõi đã được xây dựng, cấu hình và nghiệm thu trong giai đoạn khởi tạo nền tảng bot. Chỉ tham khảo tài liệu này khi cần bảo trì, nâng cấp Core Loader, Event Bus hoặc xử lý vòng đời hệ thống.

---

## 1. Kiến Trúc & Cấu Hình Môi Trường (Environment & Architecture)

- [x] **Thiết lập Module ESM & Dependencies:**
  - `package.json` kích hoạt `"type": "module"`.
  - Dependencies: `discord.js` (v14.18+), `fastify` (v5.2+), `@fastify/cors`, `node-cron`, `pino`, `zod`, `@prisma/client`, `prisma`.
  - DevDependencies: `tsx`, `typescript` (v5.7+), `pino-pretty`, `@types/node`, `@types/node-cron`.
  - Scripts CLI: `dev`, `build`, `start`, `deploy:dev`, `deploy:prod`, `deploy:clear:dev`, `deploy:clear:global`.
- [x] **Cấu hình TypeScript (`tsconfig.json`):**
  - Compiler target: `ES2022`, module: `NodeNext`, moduleResolution: `NodeNext`.
  - Strict mode 100%, cấm `any`, tắt `exactOptionalPropertyTypes` để tương thích mềm dẻo với Discord.js options.
- [x] **Cấu hình Môi trường & Biến toàn cục (`.env.example`):**
  - Quản lý các biến môi trường: `DISCORD_TOKEN`, `CLIENT_ID`, `DEV_GUILD_ID`, `DATABASE_URL`, `PORT`, `NODE_ENV`, `LOG_LEVEL`.
  - Chuỗi kết nối SQLite chuẩn WAL: `file:./dev.db?connection_limit=1&busy_timeout=5000`.

---

## 2. Các Module Cốt Lõi (Core Platform Infrastructure)

- [x] **Hệ thống Kiểu Dữ liệu & Hợp đồng Thực thi (`src/core/types/index.ts`):**
  - `BotCommand`: Khai báo Slash Command gốc (`data: SlashCommandBuilder`, `execute(interaction)`).
  - `SubcommandExecutor`: Khai báo hàm thực thi của subcommand con (`(interaction) => Promise<void>`).
  - `BotEvent`: Khai báo lắng nghe Gateway Event (`name`, `once`, `execute(...args)`).
  - `BotJob`: Khai báo Cron Job chạy nền (`name`, `schedule`, `run(context)`).
  - `BotRoute`: Khai báo HTTP Route plugin cho Fastify (`(fastify, opts) => Promise<void>`).
- [x] **Quản lý Lỗi Tập Trung (`src/core/errors.ts`):**
  - Class `AppError` kế thừa `Error`: Quản lý thông điệp thân thiện với người dùng, error code và cờ `isOperational`.
- [x] **Kiểm tra Ràng buộc Môi trường (`src/core/config.ts`):**
  - Validate biến môi trường runtime thông qua Zod schema ngay khi khởi động.
- [x] **Hệ thống Ghi Log Chuẩn Hóa (`src/core/logger.ts`):**
  - Sử dụng Pino singleton, định dạng log qua `pino-pretty` khi phát triển local. Tuyệt đối cấm `console.log`.
- [x] **Internal Asynchronous Event Bus (`src/core/bus.ts`):**
  - Singleton `AsyncEventBus` kế thừa `EventEmitter`.
  - Hỗ trợ `emitAsync`: Thực thi song song các listeners bất đồng bộ bằng `Promise.allSettled`.
  - Bọc Error Boundary cô lập trên từng listener, nâng `maxListeners = 50`.
- [x] **Extended Discord Client (`src/core/client.ts`):**
  - `ExtendedClient` kế thừa `Client` của `discord.js`, tích hợp Collection lưu trữ Slash Commands và bus.

---

## 3. Cơ Chế Nạp Động Tự Động (Dynamic File Loaders)

- [x] **Command Loader (`src/core/loaders/command.loader.ts`):**
  - Quét đệ quy thư mục `src/features/` tìm các tệp có hậu tố `*.command.ts`.
  - Bỏ qua các tệp subcommand `*.sub.ts` để tránh nạp trùng lên Discord REST API.
- [x] **Event Loader (`src/core/loaders/event.loader.ts`):**
  - Quét đệ quy tìm các tệp `*.event.ts` và đăng ký listener tương ứng vào `client.on(...)` hoặc `client.once(...)`.
  - Bọc Error Boundary tự động cho từng sự kiện.
- [x] **Job Loader (`src/core/loaders/job.loader.ts`):**
  - Quét các tệp `*.job.ts` và đăng ký lịch với `node-cron`.
  - Tích hợp cờ khóa tương tranh (`isRunning` concurrency guard) ngăn ngừa tác vụ chạy đè lên nhau.
- [x] **Route Loader (`src/core/loaders/route.loader.ts`):**
  - Quét các tệp `*.route.ts`, đăng ký route plugin vào Fastify instance, inject context `{ client, db }`.

---

## 4. Xử Lý Gateway, Deployment CLI & Feature Mẫu

- [x] **Sự Kiện Khởi Động (`src/core/events/ready.ts`):**
  - Ghi nhận trạng thái bot online, in danh sách tags và tổng số Slash Commands đã nạp.
- [x] **Sự Kiện Tương Tác Tập Trung (`src/core/events/interactionCreate.ts`):**
  - Điều hướng tương tác đến Slash Command handler.
  - Bọc Error Boundary toàn cục: Tự động bắt `AppError` hoặc lỗi không kiểm soát, phản hồi lại Discord qua Ephemeral Embed.
- [x] **CLI Script Đăng Ký Lệnh Tách Rời (`src/core/scripts/deploy.ts`):**
  - Hỗ trợ triển khai lệnh độc lập qua Discord REST API: `--dev`, `--prod`, `--clear-dev`, `--clear-global`.
- [x] **Feature Mẫu Xác Thực Hệ Thống (`src/features/ping/`):**
  - `ping.command.ts`: Lệnh `/ping`.
  - `ping.service.ts`: Tính toán roundtrip API latency và websocket heartbeat.
- [x] **Bootstrapper Gốc (`src/index.ts`):**
  - Khởi tạo Client, nạp tuần tự các loaders, kết nối Database, mở Web Server và kết nối Discord Gateway.

---

## 5. Tầng Dữ Liệu & Hạ Tầng Dùng Chung (Shared Kernel)

- [x] **Cơ Sở Dữ Liệu Prisma (`src/shared/db/`):**
  - Schema tại `src/shared/db/schema.prisma` sử dụng SQLite WAL mode.
  - Bảng cơ sở `GuildSetting` lưu cấu hình máy chủ.
  - Prisma client singleton tại `src/shared/db/client.ts`.
- [x] **Bảng Màu Embed Chuẩn Hóa (`src/shared/constants/colors.ts`):**
  - Bộ hằng số `EmbedColor` (`PRIMARY`, `SUCCESS`, `ERROR`, `WARNING`, `MUTED`).
- [x] **Tiện Ích Embed (`src/shared/utils/embed.util.ts`):**
  - `createBaseEmbed`, `createErrorEmbed`, `createSuccessEmbed`.
- [x] **Tiện Ích Ngôn Ngữ & Bản Địa Hóa (`src/shared/utils/i18n.util.ts`):**
  - Hàm `getUserLocale()` phân giải locale theo thứ tự ưu tiên: cấu hình user $\rightarrow$ locale Discord $\rightarrow$ mặc định tiếng Việt (`vi`).

---

## 6. Web Server Song Song & Vòng Đời Tắt An Toàn (Lifecycle)

- [x] **Fastify HTTP Server (`src/core/server/server.ts`):**
  - Khởi tạo Fastify instance trên cổng `PORT` cấu hình.
  - Tích hợp CORS và middleware guard `requireDiscordReady`.
- [x] **Quy Trình Tắt An Toàn (`src/core/lifecycle.ts`):**
  - Lắng nghe `SIGINT` và `SIGTERM`.
  - Tuần tự dọn dẹp tài nguyên runtime: Dừng tất cả Cron Jobs $\rightarrow$ Đóng Fastify HTTP Server $\rightarrow$ Ngắt kết nối Prisma DB $\rightarrow$ Hủy kết nối Discord Gateway.

# ARCHITECTURE SPECIFICATION

Tài liệu này xác định bản vẽ kỹ thuật, quy tắc phân tầng và ranh giới kiến trúc bất biến cho dự án Lora (discordbot_lora). Mọi dòng code sinh ra phải tuân thủ 100% các nguyên tắc trong tài liệu này; không có ngoại lệ.

---

## 1. Triết lý Kiến trúc: Vertical Slice Architecture

Dự án áp dụng mô hình **Vertical Slice Architecture** (Feature-based Modularization). 

Thay vì chia mã nguồn theo tầng kỹ thuật ngang truyền thống (tất cả controller một nơi, tất cả model một nơi), hệ thống đóng gói toàn bộ logic của một tính năng vào một thư mục nghiệp vụ duy nhất.

```
Request / Gateway Event
↓
┌────────────────────────────────────────────────────────┐
│  src/core/ (Loaders, Router, Server & Safety Nets)     │
└────────────────────────────────────────────────────────┘
↓ (Dispatch)
┌────────────────────────────────────────────────────────┐
│  src/features/<feature-name>/                          │
│  ├── *.command.ts  (Nhận input & validate)             │
│  ├── *.event.ts    (Lắng nghe Discord Gateway)         │
│  ├── *.route.ts    (Fastify HTTP Endpoints)            │
│  ├── *.job.ts      (Cron Jobs chạy ngầm)               │
│  ├── *.service.ts  (Nghiệp vụ thuần túy)               │
│  └── *.types.ts    (Interfaces & Schemas nội bộ)       │
└────────────────────────────────────────────────────────┘
↓ (Chỉ đọc/ghi qua lớp dùng chung)
┌────────────────────────────────────────────────────────┐
│  src/shared/ (Prisma DB Client, Helpers, Embed Utils)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Bản đồ Thư mục & Trách nhiệm Phân vùng

```text
discordbot_lora/
├── docs/                         # Context Anchors (ARCHITECTURE, CONVENTIONS, ROADMAP)
├── dashboard/                    # Frontend độc lập hoàn toàn (Browser Runtime - React/Vite/...)
│
└── src/                          # 100% Backend Runtime (Node.js)
    ├── index.ts                  # Bootstrapper: khởi động Core, nạp Loaders, login Gateway
    │
    ├── core/                     # Hạ tầng hệ sinh thái (Core Platform)
    │   ├── client.ts             # Discord Client mở rộng (chứa Collection lưu commands, bus)
    │   ├── config.ts             # Validate biến môi trường runtime (.env)
    │   ├── logger.ts             # Logger tập trung
    │   ├── bus.ts                # Internal Event Bus (Node.js EventEmitter)
    │   ├── lifecycle.ts          # Graceful shutdown handler (SIGINT, SIGTERM)
    │   ├── server/               # Fastify Web & REST API Architecture
    │   │   ├── server.ts         # Fastify instance, startServer, stopServer
    │   │   ├── auth/             # Session crypto & token signing (HMAC SHA-256)
    │   │   ├── guards/           # PreHandler guards (requireAuth, requirePermit, requireBotOwner, requireDiscordReady)
    │   │   ├── plugins/          # Modular plugins (cookie, cors, static SPA fallback)
    │   │   ├── sse/              # Server-Sent Events Manager (heartbeats, guild & system push)
    │   │   └── routes/           # Core platform routes (auth.route.ts, system.route.ts, sse.route.ts)
    │   ├── types/                # Core Interfaces (BotCommand, BotEvent, BotJob, BotRoute)
    │   ├── loaders/              # Dynamic Scanner nạp tự động tài nguyên từ core routes & features
    │   │   ├── command.loader.ts
    │   │   ├── event.loader.ts
    │   │   ├── job.loader.ts
    │   │   └── route.loader.ts
    │   └── scripts/
    │       └── deploy.ts         # CLI script độc lập để đăng ký Slash Commands qua Discord REST
    │
    ├── shared/                   # TÀI NGUYÊN DÙNG CHUNG (Shared Kernel)
    │   ├── db/
    │   │   ├── client.ts         # PrismaClient singleton instance
    │   │   └── schema.prisma     # NƠI TẬP TRUNG TOÀN BỘ DATABASE SCHEMA CỦA DỰ ÁN
    │   ├── permit/               # Shared Wick-style RBAC Permit Engine (Service & Constants)
    │   ├── utils/                # Helper functions (Embed formatters, Time/String utilities)
    │   └── constants/            # ID cố định, Discord Permissions, Enums toàn cục
    │
    └── features/                 # VÙNG NGHIỆP VỤ (Mỗi folder là một lát cắt tính năng độc lập)
        └── <feature-name>/       # Đóng gói hoàn chỉnh từng domain (ping, swarm-linked-roles, perks, voice-keeper, wordchain, permit, guild-meta...)
```

---

## 3. Quy ước Tệp tin & Cơ chế Dynamic Loaders

Hệ thống Core sử dụng cơ chế **File Convention Discovery** để tự động quét cả Core Server Routes lẫn thư mục `src/features/` khi khởi động. Mọi tệp tin phải tuân thủ đúng hậu tố:

| Hậu tố tệp tin | Giao diện thực thi (Interface) | Hành vi của Core Loader |
| --- | --- | --- |
| `*.command.ts` | `BotCommand` | Đăng ký vào `client.commands` Collection (Chỉ dành cho Top-level / Root Slash Commands) |
| `*.sub.ts` | `SubcommandExecutor` | Lệnh con (Subcommand): Được nạp nội bộ bởi Root Command, Dynamic Loader bỏ qua không quét độc lập |
| `*.event.ts` | `BotEvent` | Bind trực tiếp vào `client.on(...)` hoặc `client.once(...)` |
| `*.job.ts` | `BotJob` | Đăng ký lịch chạy với `node-cron` kèm cơ chế chống chạy đè |
| `*.route.ts` | `BotRoute` | Khởi tạo plugin route trên Fastify Server, inject `{ client, db }` |
| `*.service.ts` | Class / Object Functions | Chứa logic nghiệp vụ thuần; không tự động load qua loader |
| `*.types.ts` | Type definitions / Zod schemas | Chứa định nghĩa kiểu dữ liệu; compile-time only |

### Quy chuẩn Subcommands (Lệnh con)

Đối với các tính năng có cấu trúc Slash Command phức tạp gồm nhiều lệnh con hoặc phân chia theo Subcommand Group:

* **Tên file & Thư mục:** Bắt buộc bóc tách từng subcommand thành các file mang hậu tố `*.sub.ts` nằm trong thư mục `subcommands/` (hoặc `commands/`) của feature (ví dụ: `src/features/<feature>/subcommands/check.sub.ts`). Với các feature phân nhánh thành nhiều sub-slice/domain (như `perks/common/subcommands/`, `perks/booster/subcommands/`, `perks/donator/subcommands/`), các file `*.sub.ts` được đặt trực tiếp trong thư mục con tương ứng.
* **Tránh xung đột Loader:** Việc sử dụng hậu tố `*.sub.ts` đảm bảo Dynamic Command Loader (chỉ tìm `*.command.ts`) không đăng ký nhầm subcommand thành một Slash Command cấp cao nhất trên Discord REST API.
* **Router điều phối:** File `<feature-name>.command.ts` tại root của feature sẽ tập hợp toàn bộ metadata (`SlashCommandBuilder.addSubcommand(...)`, `addSubcommandGroup(...)`) và điều hướng tương tác đến từng executor tương ứng.

---

## 4. Luật Ranh giới & Giao tiếp Liên Module (Isolation Rules)

Nhằm đảm bảo dự án có thể mở rộng lâu dài và không bao giờ gặp lỗi **Circular Dependency**:

### 4.1. Luật Nhập khẩu (Import Constraints)

1. **Zero Cross-Feature Import:** Folder `src/features/A/` **TUYỆT ĐỐI CẤM** import bất kỳ file nào từ `src/features/B/`.
2. **Cho phép:** Mọi feature được phép import từ:
* Chính thư mục nội bộ của nó (`src/features/<feature-name>/*`).
* Tầng dùng chung (`src/shared/*`).
* Tầng hạ tầng (`src/core/*` - types, logger, bus, guards, không import loaders).

### 4.2. Luật Giao tiếp Giữa các Feature

Khi một hành động ở Feature A cần kích hoạt hệ quả ở Feature B:

* **Hành động từ Discord Gateway:** Nếu cả hai feature cùng quan tâm một sự kiện (ví dụ: thành viên bị ban, rời server, đổi role), mỗi feature phải tự khai báo file `*.event.ts` của riêng mình để lắng nghe sự kiện đó một cách độc lập.
* **Hành động nghiệp vụ nội bộ (Async Event Bus):** Feature A phát tín hiệu qua `eventBus` (`src/core/bus.ts`):
```typescript
await eventBus.emitAsync('perk:expired', { userId, guildId, perkType });
```
* **Quy chuẩn Kỹ thuật của `AsyncEventBus`:**
  - Nâng `maxListeners` lên tối thiểu 50 để tránh cảnh báo rò rỉ bộ nhớ khi nhiều feature cùng đăng ký lắng nghe sự kiện.
  - Sử dụng `emitAsync` bọc bằng `Promise.allSettled` để thực thi song song các listener bất đồng bộ.
  - Mỗi listener được cô lập trong Error Boundary: Nếu Feature B gặp lỗi khi xử lý sự kiện, lỗi sẽ được ghi log chi tiết (kèm context) qua `core/logger.ts`, hoàn toàn không làm sập tiến trình, không gây `unhandledRejection` và không ảnh hưởng đến listener của Feature C.

### 4.3. Phân tách Luồng Dữ liệu Nội bộ (Internal Data Flow)

```
Interaction / Route
       ↓ (1. Parse & Validate input)
  Command / Route Handler
       ↓ (2. Forward payload)
    Service Layer (Pure Business Logic)
       ↓ (3. Read / Write)
Shared Database Client (Prisma)
```

* **Cấm:** Viết logic nghiệp vụ, thuật toán phức tạp hoặc truy vấn DB trực tiếp bên trong file Command/Route. Command chỉ làm nhiệm vụ: Parse input $\rightarrow$ Gọi Service $\rightarrow$ Trả kết quả UI.

---

## 5. Chiến lược Triển khai Slash Command (Deployment Decoupling)

Tuyệt đối **KHÔNG** tích hợp logic đăng ký Slash Command (REST API calls) vào tiến trình khởi động bot (`index.ts`). Việc này được tách thành script CLI riêng: `src/core/scripts/deploy.ts`.

### Quy trình Vận hành:

* **Local Development:**
* Lệnh dev chỉ triển khai cho Server Test thông qua REST Guild endpoint (cập nhật tức thì):
```bash
npm run deploy:dev
```

* **Production Deployment:**
* Khi release phiên bản mới lên VPS, chạy lệnh deploy Global:
```bash
npm run deploy:prod
```

* **Dọn dẹp đồng bộ (Clean-up):**
* Xóa command rác/trùng lặp bằng cách gửi mảng rỗng `[]` lên REST API tương ứng:
```bash
npm run deploy:clear:dev    # Xóa sạch Guild commands trên server test
npm run deploy:clear:global # Xóa sạch Global commands
```

---

## 6. Quản lý Trạng thái & Cơ sở Dữ liệu

### 6.1. Nguyên tắc Schema Tập trung

* Toàn bộ cấu trúc bảng và quan hệ cơ sở dữ liệu phải nằm tập trung tại duy nhất một file: `src/shared/db/schema.prisma`.
* Các bảng thuộc phạm vi của từng feature phải được nhóm lại kèm comment phân cách rõ ràng theo từng Domain:

```prisma
// ==========================================
// DOMAIN: CORE & GUILD SETTINGS
// ==========================================
model GuildSetting {
  guildId   String   @id
  locale    String   @default("vi")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("guild_settings")
}

// ==========================================
// DOMAIN: CUSTOM PERMIT & RBAC (WICK-STYLE)
// ==========================================
model GuildPermitConfig {
  guildId           String   @id @map("guild_id")
  trustedAdminFlags Int      @default(29) @map("trusted_admin_flags")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("guild_permit_configs")
}

model GuildPermitAssignment {
  id          String   @id @default(cuid())
  guildId     String   @map("guild_id")
  targetType  String   @map("target_type")
  targetId    String   @map("target_id")
  tier        String   @map("tier")
  permissions Int      @default(1) @map("permissions")
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([guildId, targetType, targetId])
  @@index([guildId, tier])
  @@map("guild_permit_assignments")
}
```

* **Quy chuẩn Cơ sở Dữ liệu Môi trường Dev (SQLite Optimization):**
  - Trong môi trường local development, hệ thống sử dụng SQLite.
  - Để tránh lỗi `SQLITE_BUSY: database is locked` do các tiến trình đồng thời (Cron Jobs quét định kỳ, Discord Gateway Events, Fastify Webhooks), chuỗi kết nối `DATABASE_URL` bắt buộc kích hoạt:
    - **Write-Ahead Logging (WAL mode):** `PRAGMA journal_mode=WAL;`
    - **Busy Timeout:** `busy_timeout=5000` (chờ tối đa 5 giây khi có transaction ghi khác đang thực thi).
    - Ví dụ chuỗi kết nối: `file:./dev.db?connection_limit=1&busy_timeout=5000`.

### 6.2. Phân loại Trạng thái (State Classification)

1. **Persistent State (Dữ liệu vĩnh viễn / Trách nhiệm cao):**
* Cấu hình server, thời hạn perks, quyền hạn, transaction logs... $\rightarrow$ **Bắt buộc lưu vào Database qua Prisma.**

2. **Ephemeral / Live State (Trạng thái thời gian thực):**
* Voice connections, ván game đang diễn ra, session cache tạm... $\rightarrow$ Lưu trên Memory (Map/Set) của Service tương ứng.
* *Quy tắc Hybrid:* Nếu trạng thái live có giá trị khôi phục sau sự cố, Service phải có cơ chế đồng bộ snapshot định kỳ hoặc lưu checkpoint vào Database để hàm khởi tạo (`init()`) có thể phục hồi dữ liệu khi bot restart.

---

## 7. Tầng Web & HTTP Server (Fastify Clean Architecture)

Hệ thống duy trì **duy nhất một HTTP Server instance** chạy song song với tiến trình bot trên một cổng duy nhất (`PORT`, mặc định: `3000`).

### 7.1. Phân định Backend API vs Frontend Dashboard

* `src/`: 100% là Node.js Backend (xử lý Bot Gateway + Fastify REST API).
* `dashboard/`: Thư mục chứa mã nguồn giao diện (Frontend SPA: React/Vite/...). Thư mục này tách biệt hoàn toàn về dependencies, build pipeline và runtime. Không chia sẻ code trực tiếp với `src/`.

### 7.2. Cấu trúc Mô-đun của Tầng Server (`src/core/server/`)

Hạ tầng Fastify Server được tổ chức theo chuẩn Clean Architecture:
* `server.ts`: Điểm khởi chạy Fastify instance, vòng đời start/stop.
* `plugins/`: Đóng gói các plugin hạ tầng độc lập:
  * `cors.plugin.ts`: Cấu hình CORS mở rộng với `credentials: true`.
  * `cookie.plugin.ts`: Quản lý Cookie an toàn với secret key.
  * `static.plugin.ts`: Phục vụ file tĩnh SPA (`dashboard/dist`) với bộ điều hướng 404 fallback về `index.html`.
* `guards/`: Các PreHandler Guards dùng chung:
  * `auth.guard.ts`: Xác thực phiên làm việc (`requireAuth`), kiểm tra Bot Owner (`requireBotOwner`).
  * `permit.guard.ts`: Kiểm tra cờ quyền Bitfield trên Guild (`requirePermit`).
  * `discord.guard.ts`: Bảo vệ tài nguyên khi Gateway chưa sẵn sàng (`requireDiscordReady`).
* `sse/`: `SSEManager` quản lý kết nối Server-Sent Events, heartbeat định kỳ và chuyển tiếp sự kiện từ `eventBus`.
* `routes/`: Các route cốt lõi của nền tảng (`auth.route.ts`, `system.route.ts`, `sse.route.ts`).

### 7.3. Dependency Injection cho Routes

Mỗi file `*.route.ts` được Core Router truyền trực tiếp Context của bot:

```typescript
export interface RouteContext {
  client: ExtendedClient;
  db: PrismaClient;
}
```

Cấm route tự ý import hoặc tạo mới instance Client/Prisma.

---

## 8. Xử lý Lỗi & Vòng đời Tiến trình (Resilience & Lifecycle)

### 8.1. Phân cấp Xử lý Lỗi (Error Boundaries)

* **Tầng Interaction:** Toàn bộ lệnh người dùng được bọc trong khối an toàn tại `core/events/interactionCreate.ts`.
* Nếu Service hoặc Command ném lỗi (`throw new Error` hoặc `AppError`), interaction handler tự động ghi log lỗi chi tiết qua `core/logger.ts`.
* Phản hồi cho người dùng bằng một Discord Embed màu đỏ đồng nhất ở chế độ ẩn danh (`flags: MessageFlags.Ephemeral`).
* Tự động nhận diện trạng thái interaction (`deferred` $\rightarrow$ `editReply()`, chưa acknowledged $\rightarrow$ `reply()`).

* **Tầng Process (Safety Net):**
* `unhandledRejection`: Bắt các Promise chưa bắt lỗi, ghi log mức `ERROR`, giữ tiến trình tiếp tục chạy.
* `uncaughtException`: Bắt các lỗi chí mạng, ghi log mức `FATAL`, kích hoạt quy trình tắt bot an toàn.

### 8.2. Quy trình Tắt Bot An toàn (Graceful Shutdown)

Khi nhận tín hiệu dừng tiến trình (`SIGINT`, `SIGTERM`), hệ thống kích hoạt bộ điều phối tắt tuần tự theo 5 bước:

```
[1. Dừng Scheduled Jobs] 
         ↓
[2. Ngắt Voice Connections an toàn] 
         ↓
[3. Đóng HTTP Web Server (Chờ request hoàn tất)] 
         ↓
[4. Ngắt kết nối Database (Prisma.$disconnect)] 
         ↓
[5. Hủy Discord Gateway Client & process.exit(0)]
```

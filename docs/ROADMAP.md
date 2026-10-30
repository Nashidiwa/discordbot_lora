# PROJECT ROADMAP & WORKSTREAM TRACKER

Tài liệu này theo dõi lộ trình phát triển và điều phối tiến độ dự án theo mô hình **Workstream Tracks (Luồng công việc song song)**.
Tài liệu được thiết kế tối giản, đóng vai trò **Executive Dashboard**. Chi tiết kỹ thuật sâu của từng tính năng được phân tán về tệp tài liệu riêng của tính năng đó (`src/features/<feature>/README.md`) hoặc kho lưu trữ (`docs/history/`).

---

## 📊 Bảng Điều Phối Tổng Thể (Executive Status)

* **Phiên bản hiện tại:** `v0.8.5`
* **Tiêu điểm tiếp theo:** `Đóng gói phát hành bản cập nhật & Kiểm thử thực chiến (Release Packaging & Production Readiness)`
* **Quy ước trạng thái:**
  * `[ ]` Chưa thực hiện (Backlog)
  * `[/]` Đang tiến hành (In Progress)
  * `[x]` Đã hoàn thành và đã kiểm thử (Completed & Verified)

---

## 🎯 Track F: Bot Features (Tính Năng Discord Bot)

> Mỗi tính năng được phát triển độc lập theo mô hình Vertical Slice. Khi hoàn thành, tài liệu chi tiết được lưu trữ tại `README.md` nội bộ của chính tính năng đó.

- [x] **FEAT-01: Perks Management - Server Booster** `(v0.2.9)`
  > 📖 *Tài liệu đặc tả kiến trúc, cẩm nang vận hành và nhật ký phát triển chi tiết:* [`src/features/perks/booster/README.md`](../src/features/perks/booster/README.md)
  - Tự động hóa Custom Role đơn sắc và Gradient 2 màu qua Discord API `EnhancedRoleColors`.
  - Nhận diện Booster hợp nhất (`member.premiumSince` + `boostCount > 0`).
  - Vòng đời ân hạn 7 ngày (Grace Period) và Cron Job tự động thu hồi role hết hạn.
  - Bộ lệnh Slash `/perk list`, `/perk status`, `/perk server_booster *`.
  - Quy trình quản trị unboost tương tác (Interactive Unboost Workflow) với 2 nút bấm xác nhận.

- [x] **FEAT-02: Perks Management - Donator (Time-Bank & Hybrid Retention)** `(v0.3.0)`
  > 📖 *Tài liệu đặc tả kiến trúc & cẩm nang vận hành:* [`src/features/perks/donator/README.md`](../src/features/perks/donator/README.md) | *Đặc tả yêu cầu (FRD):* [`src/features/perks/donator/FRD.md`](../src/features/perks/donator/FRD.md)
  - Mô hình Quỹ Thời Gian (Time-Bank) tự chủ với tốc độ tiêu hao $1.0x$ (đeo role) và $0.2x$ (cất kho).
  - Đòn bẩy thưởng kép: Thưởng giá trị đóng góp (Volume Bonus) và Thưởng chuỗi tuần (Weekly Streak Bonus) neo múi giờ UTC+7.
  - Cơ chế suy giảm mềm (Soft Decay) chuỗi tuần và bảo vệ quyền lợi đóng băng thời gian ($0.0x$) khi tắt tính năng.
  - Tự động cất role vào kho ($0.2x$) bảo lưu quyền lợi khi thành viên rời server (`donator-leave.event.ts`).
  - Phân quyền quản trị nghiêm ngặt `Administrator` tuyệt đối cho các thao tác nạp tiền, điều chỉnh và cấu hình.
  - Bộ lệnh Slash `/perk donator *` tích hợp với hệ thống `/perk list` và `/perk status` chung.

- [x] **FEAT-03: Swarm Linked Roles & Connection Metadata** `(v0.4.0)`
  > 📖 *Tài liệu đặc tả kiến trúc & cẩm nang vận hành:* [`src/features/swarm-linked-roles/README.md`](../src/features/swarm-linked-roles/README.md) | *Đặc tả yêu cầu (FRD):* [`src/features/swarm-linked-roles/FRD.md`](../src/features/swarm-linked-roles/FRD.md)
  - Quản lý Application Connection Metadata cho 8 Linked Roles (`The Swarm I` đến `VIII`).
  - Phân quyền RBAC 2 tầng: Bot Owner (toàn quyền & ủy quyền) và Delegated Operator.
  - Script CLI `register-metadata.ts` tự động đăng ký schema `swarm_level` lên Discord REST API.
  - Tích hợp Fastify Web Server xử lý OAuth2 handshake an toàn với chữ ký HMAC CSRF state.
  - Tự động phát thông báo thăng cấp và thu hồi qua kênh per-guild được cấu hình.

- [x] **FEAT-04: Voice Keeper 24/7 (Treo Kênh Thoại & Tự Phục Hồi)** `(v0.5.0)`
  > 📖 *Tài liệu đặc tả kiến trúc & cẩm nang vận hành:* [`src/features/voice-keeper/README.md`](../src/features/voice-keeper/README.md) | *Đặc tả yêu cầu (FRD):* [`src/features/voice-keeper/FRD.md`](../src/features/voice-keeper/FRD.md)
  - Quản lý kết nối Voice Connection per-guild và cấu hình kênh thoại 24/7 vào DB.
  - Cơ chế tự phục hồi 3 tầng: Khởi động (`ClientReady`), Reactive Gateway (`voiceStateUpdate`), và Watchdog Cron Job định kỳ 10 phút.
  - Cơ chế chống spam: Exponential Backoff và Circuit Breaker ngắt sau 5 lần retry thất bại liên tiếp.
  - Tối ưu tài nguyên mạng với chế độ mặc định `selfDeaf: true` và `selfMute: true`.
  - Bộ lệnh Slash `/voice_keeper set`, `/voice_keeper status`, `/voice_keeper reconnect`, `/voice_keeper stop`.

- [x] **FEAT-05: Wordchain (Trò Chơi Nối Từ Đa Tầng & Hệ Thống Karma)** `(v0.6.0)`
  > 📖 *Tài liệu đặc tả kiến trúc & cẩm nang vận hành:* [`src/features/wordchain/README.md`](../src/features/wordchain/README.md)
  - Kiến trúc từ điển 3 tầng: Local SCOWL RAM Lexicon (79.9K từ), SQLite Cache khóa phức hợp `[language, word]`, MediaWiki Action API Fallback + SingleFlight coalescing (`DEC-003`).
  - Hệ thống điểm Karma hợp tác với phân rã lặp hậu tố hàm mũ (`DEC-007`) và tự động hóa vai trò Reliable / Failed Role (`DEC-002`).
  - Khóa tuần tự hóa FIFO per-guild per-mode và giao dịch database atomic bảo vệ tính toàn vẹn trạng thái ván chơi.
  - Vòng đời ân hạn 7 ngày khi bot rời guild (`DEC-006`) và Cron Job dọn dẹp hàng ngày lúc 00:00.
  - Bộ 2 Slash Command chính: `/wordchain` (6 user subcommands) và `/wordchain-manage` (7 admin subcommands kèm quyền quản trị GDPR, `DEC-004`, `DEC-008`).

- [x] **FEAT-07: Custom Permit System (Wick-style RBAC)** `(v0.7.0)`
  > 📖 *Tài liệu đặc tả kiến trúc & cẩm nang vận hành:* [`src/features/permit/README.md`](../src/features/permit/README.md)
  - Hệ thống phân quyền ủy quyền nâng cao chuẩn Wickbot, độc lập khỏi Discord native permissions.
  - Cây thẩm quyền 4 tầng: Bot Owner (Tier 0) $\rightarrow$ Server Owner (`guild.ownerId`, Tier 1) $\rightarrow$ Co-Owner (Tier 2) $\rightarrow$ Trusted Admin (Tier 3) $\rightarrow$ Custom Grants (Tier 4).
  - Ma trận cờ quyền bitfield linh hoạt (`VIEW_DASHBOARD`, `MANAGE_PERMITS`, `MANAGE_SETTINGS`, `MANAGE_PERKS`, `MANAGE_VOICE_KEEPER`, `MANAGE_WORDCHAIN`, `MANAGE_SWARM`).
  - Bộ lệnh Slash Discord `/permit` (`co_owner`, `trusted_admin`, `grant`, `revoke`, `list`) song song với giao diện Web Dashboard.

- [ ] **FEAT-06: Server Moderation (Quản Trị Mở Rộng - Tùy Chọn)**
  - Các công cụ quản trị mở rộng: `/ban`, `/kick`, `/warn`, `/purge`.

---

## 🌐 Track W: Web & Management Dashboard (Hoàn Tất MVP)

> Phân hệ Dashboard được xây dựng độc lập trên thư mục `dashboard/` và kết nối với Backend qua Fastify REST API và Server-Sent Events (SSE).

- [x] **WEB-01: Fastify REST API Core Routes** `(v0.7.0)`
  - Cung cấp toàn diện REST endpoints cho Dashboard truy xuất trạng thái bot, voice keeper, perks và server config.
  - Hệ thống PreHandler Guards (`requireAuth`, `requirePermit`) bảo vệ từng route theo cờ quyền Bitfield.
  - Server-Sent Events (SSE) live streaming cho Guild Voice Status và Bot Owner System Metrics.
- [x] **WEB-02: Vite + React Dashboard UI** `(v0.8.0)`
  > 📖 *Tài liệu kiến trúc Dashboard:* [`dashboard/README.md`](../dashboard/README.md) | *Đặc tả yêu cầu & Thiết kế (FRD):* [`dashboard/FRD.md`](../dashboard/FRD.md)
  - Single Page Application (SPA) độc lập trong thư mục `dashboard/` (React 18, Vite, TypeScript Strict, Tailwind CSS, Lucide Icons, TanStack Query).
  - Kiến trúc UI Primitives nội bộ, Ambient Canvas Engine (Living Aurora Mesh, Cyber Dot-Grid, Pointer Flashlight Beam).
  - Tái thiết kế trải nghiệm: Bento Grid Overview (SVG Sparkline Ping, RAM Gauge), Audio 12-Bar Equalizer HUD, Live Discord Chat Simulator với Gradient 2 màu, và Phân cấp danh dự Donator (Crown/Diamond/Flame).
  - Tối ưu hóa tương tác: Thẻ kính Spotlight Card với viền phát sáng 0ms latency theo con trỏ chuột.
  - Cơ chế đóng gói Single-Port Hybrid: Fastify tự động phục vụ `dashboard/dist` trên port 3000 ở production; hỗ trợ Vite proxy ở local dev.
- [x] **WEB-03: Discord OAuth2 & State Management** `(v0.7.0)`
  - Tích hợp đăng nhập Discord OAuth2 lưu phiên qua **HTTP-Only Secure Cookie** chống XSS.
  - Hỗ trợ song song Master API Key (`x-api-key`) cho Bot Owner và automated scripts.
  - Tự động đối soát danh sách Mutual Guilds với Discord Gateway Cache và DB Permit.
- [x] **WEB-04: Feature Expansion & Financial Reporting Overhaul** `(v0.8.1)`
  - **Mở rộng giao diện The Swarm (`FEAT-03`):** Quản lý 8 bậc role linked, kênh thông báo thăng cấp/thu hồi, nút copy URL OAuth2, gán cấp bậc đẩy trực tiếp lên Discord REST API.
  - **Mở rộng giao diện Wordchain (`FEAT-05`):** Live HUD 2 chế độ chơi (Normal 1 ký tự / Hard 2 ký tự), Bảng vàng xếp hạng Karma chống phá chuỗi và tổng điểm Score, thiết lập kênh/vai trò và công cụ Reset ván chơi khẩn cấp.
  - **Báo cáo tài chính Donator:** Lọc thời gian thực theo khoảng ngày (Date Range) và từ khóa (User ID/ghi chú); xuất báo cáo CSV chuẩn hóa UTF-8 BOM hiển thị tiếng Việt hoàn hảo trên Excel.
- [x] **WEB-05: Global Management Scope, Swarm Strict RBAC & Smart Componentry** `(v0.8.3)`
  - **Kiến trúc Không gian Kép (Server Scope vs Global Scope):** Hộp chuyển đổi Workspace Switcher trên Navbar phân định rõ chế độ quản trị theo từng máy chủ (`/dashboard/*`) và chế độ quản trị toàn hệ thống cấp Ứng Dụng (`/dashboard/global/*`).
  - **Phân định Tổng quan (Overview Partitioning):** Máy chủ tập trung danh tính và dịch vụ nội bộ (loại bỏ telemetry thừa); Cấp Toàn Cầu sở hữu Bento Grid telemetry hạ tầng và Mạng Lưới Máy Chủ Discord kèm tìm kiếm và lối tắt chuyển nhanh.
  - **Bảo mật Đa Tầng The Swarm (`FEAT-03`):** Phân quyền nghiêm ngặt giữa Server Admin (chỉ đọc danh sách thành viên bậc 8 $\rightarrow$ 0, ẩn `updatedBy`, ẩn Operators) và Delegated Operator/Bot Owner (toàn quyền gán bậc toàn cầu, bổ nhiệm/thu hồi Operator).
  - **Smart Resource Selectors & Discord Identity Preview:** `ChannelSelect` nhóm category Discord, `RoleSelect` xếp theo Discord Role Hierarchy kèm màu vai trò, `UserInput` tra cứu debounce 400ms hiển thị Avatar/Username và ngăn lưu ID lỗi, `UserDisplay` chuẩn hóa `username (userID)`.
  - **Trình Giả Lập Discord Nâng Cấp:** Chuẩn hóa toàn diện dải màu hex/decimal và gradient 2 màu cho Server Booster Custom Role Simulator.
- [x] **WEB-06: Scoped URLs (:guildId), Deep Linking & State Sync** `(v0.8.4)`
  - **Tái Cấu Trúc Router Phân Cấp Máy Chủ:** Chuyển đổi toàn diện hệ thống URL Server Scope sang dạng scoped URL chuẩn `/dashboard/guilds/:guildId/*`. Hỗ trợ Deep Linking, bookmark và mở nhiều tab độc lập.
  - **Bảo Toàn Tab Khi Đổi Máy Chủ:** `GuildSwitcher` tự động trích xuất subpath hiện tại và điều hướng sang tab tương ứng của máy chủ mới (ví dụ `/perks` $\rightarrow$ `/perks`).
  - **Đồng Bộ State Tự Động & Chuyển Hướng Dự Phòng:** Tự động đối soát `:guildId` từ URL với session cache; ghi nhớ `lora_last_active_guild` trong `localStorage`; tự động fallback an toàn cho `/dashboard`, `/dashboard/guilds`, `/dashboard/servers` và các legacy URLs.
  - **Chính Sách Bảo Vệ Vùng Cấm:** Thực thi 100% phía frontend dashboard mà không can thiệp vào `src/core/`.

---

## ⚙️ Track C: Core Platform & Infrastructure (Hạ Tầng Cốt Lõi)

> Hạ tầng bất biến. Chỉ can thiệp hoặc mở rộng khi bảo trì hoặc nâng cấp hệ thống nền tảng.

- [x] **CORE-01: System Bootstrap & Dynamic Loaders** `(v0.1.0)`
  > 📖 *Hồ sơ nghiệm thu kỹ thuật chi tiết đã đóng băng:* [`docs/history/01-foundation-core.md`](./history/01-foundation-core.md)
  - Khởi tạo kiến trúc Vertical Slice, TypeScript ESM Strict, Pino Logger, Zod Config.
  - Singleton `AsyncEventBus` (Error Boundary cô lập, `maxListeners: 50`).
  - Hệ thống nạp tự động (Dynamic Loaders): Command, Event, Job, Route.
  - Cơ sở dữ liệu Prisma (SQLite WAL Mode) và Fastify Web Server chạy song song.
  - Vòng đời tắt an toàn (Graceful Shutdown) bắt `SIGINT`/`SIGTERM`.

- [x] **CORE-02: Security Audit, Core Platform Hardening & Data Integrity** `(v0.8.5)`
  - Rà soát toàn diện mã nguồn với 2 subagents kiểm thử độc lập (Backend & Core Auditor và Frontend Dashboard Auditor): Xác nhận 100% Zero `any`, Zero `enum`, Zero cross-feature import, Zero `console.log`.
  - Nâng cấp toàn diện hạ tầng cốt lõi `src/core/`: Hoàn thiện Graceful Shutdown 5 bước với Subsystem Cleanup Hooks, unref'd watchdog timer 10 giây chống deadlock khi tắt tiến trình, fail-fast schema Zod config, cô lập unhandled rejections trên AsyncEventBus, song song hóa kiểm tra quyền hạn guild `/api/guilds`, chuẩn hóa CORS và nâng cấp `MessageFlags.Ephemeral`.
  - Khắc phục lỗ hổng leo thang đặc quyền (Privilege Escalation) trong Custom Permit.
  - Đóng gói giao dịch tài chính Donator bằng Prisma `$transaction` nguyên tử (ACID).
  - Triệt tiêu hoàn toàn Race Condition trong Voice Keeper auto-reconnect (cờ `isConnecting` và `finally` clearing), bổ sung event dọn dẹp khi bị kick (`voice-guild-delete.event.ts`), và bảo vệ hàng đợi Mutex Wordchain (`withLock`).
  - Thắt chặt Input Validation trên Fastify routes (Snowflake ID regex trên `/users/lookup` và chuẩn hóa mã ngôn ngữ trên Wordchain config).
  - Đồng bộ nhận diện thương hiệu `lora_icon_badge.png` (App Engine Icon) trên toàn bộ Frontend Dashboard, chuẩn hóa thứ tự thẻ tính năng Overview khớp với Sidebar tabs, và tối ưu hóa vòng đời React (`useMemo`, responsive combobox).

- [ ] **CORE-03: Telemetry, Sharding & Multi-Guild Optimization (Tương Lai)**
  - Tích hợp OpenTelemetry / Prometheus metrics đo lường hiệu năng.
  - Hỗ trợ Discord Sharding khi số lượng máy chủ vượt ngưỡng 2,500 guilds.

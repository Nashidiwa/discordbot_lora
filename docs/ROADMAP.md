# PROJECT ROADMAP & WORKSTREAM TRACKER

Tài liệu này theo dõi lộ trình phát triển và điều phối tiến độ dự án theo mô hình **Workstream Tracks (Luồng công việc song song)**.
Tài liệu được thiết kế tối giản, đóng vai trò **Executive Dashboard**. Chi tiết kỹ thuật sâu của từng tính năng được phân tán về tệp tài liệu riêng của tính năng đó (`src/features/<feature>/README.md`) hoặc kho lưu trữ (`docs/history/`).

---

## 📊 Bảng Điều Phối Tổng Thể (Executive Status)

* **Phiên bản hiện tại:** `v0.5.0`
* **Tiêu điểm đang triển khai:** `FEAT-05: Wordchain (Trò Chơi Nối Từ)`
* **Quy ước trạng thái:**
  * `[ ]` Chưa thực hiện (Backlog)
  * `[/]` Đang tiến hành (In Progress)
  * `[x]` Đã hoàn thành và đã kiểm thử (Completed & Verified)

---

## 🎯 Track F: Bot Features (Tính Năng Discord Bot)

> Mỗi tính năng được phát triển độc lập theo mô hình Vertical Slice. Khi hoàn thành, tài liệu chi tiết được lưu trữ tại `README.md` nội bộ của chính tính năng đó.

- [x] **FEAT-01: Perks Management - Server Booster** `(v0.2.8)`
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

- [ ] **FEAT-05: Wordchain (Trò Chơi Nối Từ)**
  - Quản lý trạng thái ván chơi: In-memory live session + Snapshot lưu DB.
  - Service thuật toán kiểm tra từ điển tiếng Việt, lượt đi, tính điểm thưởng.
  - Lệnh Slash `/wordchain start`, `/wordchain stop` và Gateway Event bắt tin nhắn trong kênh chơi.

- [ ] **FEAT-06: Server Moderation (Quản Trị Mở Rộng - Tùy Chọn)**
  - Các công cụ quản trị mở rộng: `/ban`, `/kick`, `/warn`, `/purge`.

---

## 🌐 Track W: Web & Management Dashboard (Phát Triển Song Song)

> Phân hệ Dashboard được xây dựng độc lập trên thư mục `dashboard/` và kết nối với Backend qua Fastify REST API.

- [ ] **WEB-01: Fastify REST API Core Routes**
  - Cung cấp REST endpoints cho Dashboard truy xuất dữ liệu trạng thái bot, perks và server config.
  - Xác thực bảo mật qua API Tokens / Session Cookies.
- [ ] **WEB-02: Vite + React Dashboard UI**
  - Khởi tạo Single Page Application (SPA) độc lập trong thư mục `dashboard/`.
  - Xây dựng giao diện trực quan: Bảng điều khiển Perks, thống kê Wordchain, điều khiển Voice Keeper.
- [ ] **WEB-03: Discord OAuth2 & State Management**
  - Tích hợp đăng nhập Discord OAuth2 cho Quản trị viên server.
  - Đồng bộ quyền hạn quản trị Discord với giao diện Web Dashboard.

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

- [ ] **CORE-02: Telemetry, Sharding & Multi-Guild Optimization (Tương Lai)**
  - Tích hợp OpenTelemetry / Prometheus metrics đo lường hiệu năng.
  - Hỗ trợ Discord Sharding khi số lượng máy chủ vượt ngưỡng 2,500 guilds.

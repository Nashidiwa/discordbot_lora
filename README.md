# 🤖 Lora - Discord Bot Core (Modular Re-architecture)

> Hệ thống bot **Lora** (`discordbot_lora`) thế hệ mới được xây dựng theo kiến trúc **Vertical Slice Architecture**, tối ưu hóa 100% cho quy trình phát triển bằng AI Coding Agents (Vibecoding). Không spaghetti code, module hóa tuyệt đối, chịu tải cao và sẵn sàng mở rộng lâu dài.

---

## ⚡ Tính Năng Cốt Lõi & Kiến Trúc

* **Kiến trúc Lát cắt Dọc (Vertical Slice):** Mỗi tính năng (`src/features/<feature-name>/`) là một module độc lập, đóng gói hoàn chỉnh từ Slash Command, Gateway Event, Cron Job cho đến Service nghiệp vụ và HTTP Routes.
* **Cơ chế Nạp Động (Dynamic Loaders):** Hệ thống tự động quét và đăng ký tài nguyên runtime theo quy ước tệp tin (`*.command.ts`, `*.event.ts`, `*.job.ts`, `*.route.ts`).
* **Zero Cross-Feature Dependencies:** Các module độc lập hoàn toàn, giao tiếp phi tập trung qua Discord Gateway hoặc Internal Async Event Bus.
* **Tách biệt Triển khai Lệnh (Decoupled Deployment):** Đăng ký Slash Command được quản lý độc lập qua CLI script, triệt tiêu nguy cơ dính Discord API Rate Limit khi reboot bot.
* **Tích hợp Web Server Kép:** Chạy song song HTTP Web Server (Fastify) phục vụ Discord OAuth2 Linked Roles và REST API cho Web Dashboard trong tương lai.
* **Bền bỉ & An toàn (Resilience):** Cơ sở dữ liệu Prisma (SQLite WAL Mode / PostgreSQL), mạng lưới bắt lỗi tập trung (Error Boundaries) và quy trình ngắt kết nối an toàn (Graceful Shutdown).

---

## 🛠️ Công Nghệ Sử Dụng

* **Ngôn ngữ:** [Node.js](https://nodejs.org/) (ESM) + [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Thư viện Bot:** [Discord.js v14](https://discord.js.org/)
* **Web Framework:** [Fastify](https://fastify.dev/)
* **ORM & Database:** [Prisma](https://www.prisma.io/) + SQLite (WAL Mode) / PostgreSQL
* **Validation & Types:** [Zod](https://zod.dev/)
* **Logger:** [Pino](https://github.com/pinojs/pino) + `pino-pretty`
* **Task Scheduler:** [node-cron](https://github.com/node-cron/node-cron)
* **Dev Runner:** [tsx](https://github.com/privatenumber/tsx)

---

## 📂 Cấu Trúc Dự Án

```text
discordbot_lora/
├── AGENTS.md                     # Chỉ thị hệ thống bắt buộc cho AI Agents
├── docs/                         # Context Anchors (Kiến trúc & Quy chuẩn)
│   ├── ARCHITECTURE.md           # Bản vẽ kỹ thuật, quy tắc phân tầng & ranh giới
│   ├── CONVENTIONS.md            # Bộ quy chuẩn code, style guide & handling
│   └── ROADMAP.md                # Bản đồ theo dõi tiến độ từng Milestone
│
├── dashboard/                    # Giao diện quản trị độc lập (React/Vite SPA)
│
└── src/                          # Backend 100% (Bot Gateway + Fastify REST)
    ├── index.ts                  # Bootstrapper chính
    ├── core/                     # Hạ tầng hệ thống (Loaders, Client, Logger, Bus, Scripts)
    ├── shared/                   # Dữ liệu & Tiện ích dùng chung (Prisma DB, Colors, Utils)
    └── features/                 # Các lát cắt tính năng độc lập
        ├── ping/                 # Feature mẫu xác thực hệ thống
        └── perks/                # Quản lý đặc quyền thành viên (Perks Management)
            ├── common/           # Lệnh tổng quát (/perk status) & shared types/locales
            └── booster/          # Quản lý Custom Role & đặc quyền Server Booster
```

---

## 🚀 Hướng Dẫn Bắt Đầu Nhanh

### 1. Yêu Cầu Môi Trường

* Node.js version `>= 20.0.0`
* Trình quản lý gói `npm` hoặc `pnpm`
* Đã tạo Discord Application và Bot Token trên [Discord Developer Portal](https://discord.com/developers/applications).
* **Lưu ý quan trọng về Gateway Intents:** Bắt buộc kích hoạt 2 công tắc đặc quyền trong tab **Bot** $\rightarrow$ **Privileged Gateway Intents** trên Discord Portal:
  - `Server Members Intent` (`GatewayIntentBits.GuildMembers`)
  - `Message Content Intent` (`GatewayIntentBits.MessageContent`)

### 2. Cài Đặt

```bash
# Clone repository
git clone <repo-url>
cd discordbot_lora

# Cài đặt thư viện
npm install

# Thiết lập biến môi trường
cp .env.example .env

```

Điền đầy đủ thông tin vào `.env`:

* `DISCORD_TOKEN`: Token của bot.
* `CLIENT_ID`: ID ứng dụng Discord.
* `DEV_GUILD_ID`: ID máy chủ Discord dùng để kiểm thử.

### 3. Đồng Bộ Cơ Sở Dữ Liệu

```bash
npx prisma migrate dev --name init

```

### 4. Triển Khai Slash Commands

Trước khi chạy bot lần đầu, cần đẩy danh sách lệnh lên server test:

```bash
npm run deploy:dev

```

### 5. Khởi Động Bot (Development Mode)

```bash
npm run dev

```

---

## 📜 Danh Sách Lệnh CLI (Scripts)

| Lệnh | Chức năng |
| --- | --- |
| `npm run dev` | Chạy bot ở chế độ theo dõi file thay đổi (`tsx watch`) |
| `npm run build` | Biên dịch TypeScript sang JavaScript |
| `npm start` | Chạy bản build production |
| `npm run deploy:dev` | Đăng ký Slash Commands vào Server Test (`DEV_GUILD_ID`) |
| `npm run deploy:prod` | Đăng ký Slash Commands lên phạm vi Toàn cầu (Global) |
| `npm run deploy:clear:dev` | Xóa sạch toàn bộ Slash Commands rác trên Server Test |
| `npm run deploy:clear:global` | Xóa sạch toàn bộ Slash Commands trên Global |

---

## 📖 Tài Liệu Phát Triển

Để đóng góp hoặc bổ sung tính năng mới cho dự án, bắt buộc phải tham khảo các tài liệu quy chuẩn trong thư mục `docs/`:

1. [Bản vẽ kiến trúc kỹ thuật](./docs/ARCHITECTURE.md)
2. [Quy chuẩn lập trình & Discord Interaction](./docs/CONVENTIONS.md)
3. [Checklist tiến độ tính năng](./docs/ROADMAP.md)

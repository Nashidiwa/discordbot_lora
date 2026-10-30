# Lora Bot Management Dashboard (`dashboard/`)

Giao diện quản trị Web Single Page Application (SPA) độc lập cho bot **Lora**.

> 📖 **Tài liệu Đặc tả Yêu cầu Tính năng & Thiết kế (FRD):** [`dashboard/FRD.md`](./FRD.md)

---

## 🛠️ Công Nghệ Sử Dụng

* **Core:** React 18 + TypeScript (Strict Mode) + Vite
* **Styling:** Tailwind CSS + Discord Dark Aesthetic Design Palette
* **Icons:** `lucide-react`
* **Data Fetching & Cache:** `@tanstack/react-query` (v5)
* **Routing:** `react-router-dom` (v6)
* **Real-time Updates:** Server-Sent Events (SSE)

---

## 📂 Cấu Trúc Thư Mục

```text
dashboard/
├── index.html
├── package.json
├── vite.config.ts           # Cấu hình Proxy chuyển tiếp /api, /auth, /sse về Fastify Backend
├── src/
│   ├── main.tsx             # Entry point (QueryClientProvider, BrowserRouter, AuthProvider)
│   ├── App.tsx              # Định tuyến trang (/login, /dashboard/*, /dashboard/global/*)
│   ├── index.css            # Tailwind base, custom scrollbar & animation helpers
│   ├── lib/
│   │   └── utils.ts         # cn() helper, formatVnd, formatDurationSeconds, formatDateTime
│   ├── types/               # TypeScript interfaces & DTOs
│   ├── api/                 # Fetch wrapper với credentials: 'include'
│   ├── context/             # AuthContext (quản lý session, guilds, selectedGuild, operator/owner status)
│   ├── components/
│   │   ├── ui/              # Bespoke UI Primitives:
│   │   │   ├── Button.tsx, Input.tsx, Switch.tsx, Badge.tsx, Card.tsx, Modal.tsx, Toast.tsx, Skeleton.tsx
│   │   │   ├── ChannelSelect.tsx   # Bộ chọn kênh theo Category & Hierarchy
│   │   │   ├── RoleSelect.tsx      # Bộ chọn vai trò theo Discord Role Hierarchy & Color
│   │   │   ├── UserInput.tsx       # Tra cứu & xác thực Discord User ID tức thì kèm Avatar preview
│   │   │   └── UserDisplay.tsx     # Chuẩn hóa hiển thị username (userID) kèm avatar
│   │   ├── layout/          # Navbar, Sidebar, GuildSwitcher, DashboardLayout, AmbientBackground
│   │   └── perks/           # DiscordChatSimulator (Trình giả lập tin nhắn Discord kèm Gradient 2 màu)
│   └── pages/               # Trang giao diện:
│       ├── LoginPage.tsx
│       ├── OverviewPage.tsx        # Tổng quan máy chủ (không gian Server Scope)
│       ├── GlobalOverviewPage.tsx  # Tổng quan hệ thống & telemetry (không gian Global Scope)
│       ├── VoiceKeeperPage.tsx
│       ├── PerksPage.tsx
│       ├── PermitPage.tsx
│       ├── SwarmPage.tsx           # Quản lý Swarm cấp server (Read-only an toàn cho Admin thường)
│       ├── GlobalSwarmPage.tsx     # Bảng quản trị Swarm toàn cầu (Bot Owner / Operator)
│       └── WordchainPage.tsx
```

---

## 🏛️ Hai Không Gian Quản Trị (Dual Workspace Architecture)

Hệ thống phân tách ranh giới rõ rệt giữa hai chế độ điều khiển trên thanh điều hướng:

### 1. Không Gian Quản Trị Máy Chủ (Server Scope - Scoped URLs)
* **Điều hướng Chuẩn:** `/dashboard/guilds/:guildId/*`
* **Deep Linking & Persistence:** Hỗ trợ bookmark và mở song song nhiều tab mà không ghi đè máy chủ nhờ tham số `:guildId` trên URL. Khi đổi máy chủ trên `GuildSwitcher`, hệ thống tự động giữ nguyên tab hiện tại và chuyển sang máy chủ mới.
* **Tự động Chuyển hướng (Fallback & Redirect):** Truy cập `/dashboard`, `/dashboard/guilds` hoặc các URL phẳng cũ (`/dashboard/perks`, `/dashboard/servers/:guildId`...) sẽ tự động chuyển hướng tới máy chủ hoạt động gần nhất (`lastActiveGuildId`) hoặc máy chủ đầu tiên khả dụng.
* **Thứ tự Menu:**
  1. 📊 **Tổng quan Máy chủ** (`/dashboard/guilds/:guildId`): Danh tính máy chủ và trạng thái tổng hợp các dịch vụ nội bộ.
  2. 🛡️ **Phân quyền (Permit)** (`/dashboard/guilds/:guildId/permits`): Quản lý ủy quyền Wick-style RBAC cấp server.
  3. 💎 **Quản lý Đặc quyền** (`/dashboard/guilds/:guildId/perks`): Booster Roles (kèm Simulator), Donator Time-Bank, Báo cáo tài chính CSV.
  4. 🎙️ **Voice Keeper 24/7** (`/dashboard/guilds/:guildId/voice-keeper`): Trạng thái kênh thoại treo và Equalizer 12 cột.
  5. ⛓️ **Wordchain Engine** (`/dashboard/guilds/:guildId/wordchain`): Live HUD ván chơi, bảng xếp hạng Karma, reset khẩn cấp.
  6. 🔗 **The Swarm Linked** (`/dashboard/guilds/:guildId/swarm`): Danh sách thành viên bậc 8 $\rightarrow$ 0, trạng thái kênh thông báo (Read-only đối với Admin thường).

### 2. Không Gian Quản Trị Toàn Cầu (Global Application Scope)
* **Điều hướng:** `/dashboard/global/*`
* **Đối tượng:** Dành riêng cho **Bot Owner** hoặc **Delegated Operator**.
* **Menu:**
  1. 🌐 **Tổng quan Hệ thống** (`/dashboard/global`): Bento Grid telemetry phần cứng thời gian thực, RAM heap, WebSocket ping sparkline, và danh sách toàn bộ server kết nối kèm tìm kiếm và lối tắt chuyển sang cài đặt server (`/dashboard/guilds/:guildId`).
  2. 🔗 **The Swarm Toàn Cầu** (`/dashboard/global/swarm`): KPI liên kết toàn mạng lưới, quản lý danh sách Operator, gán/thu hồi cấp bậc toàn cầu, bảng thành viên bậc 8 $\rightarrow$ 0 kèm tên người cập nhật (`updatedBy`).

---

## 🚀 Hướng Dẫn Vận Hành

### 1. Chế độ Phát triển (Development)
Khi phát triển local, chạy song song Backend Bot và Frontend Vite:

```bash
# Terminal 1: Chạy Backend Fastify & Bot Gateway (Port 3000)
npm run dev

# Terminal 2: Chạy Frontend Vite Dev Server (Port 5173)
npm run dev:dashboard
```

Truy cập: `http://localhost:5173`. Các request `/api/*`, `/auth/*`, `/sse/*` sẽ được Vite tự động proxy về `http://localhost:3000`.

### 2. Triển khai Production (Single-Port Hybrid)
Trong môi trường production (Docker / VPS), toàn bộ frontend được biên dịch tĩnh và phục vụ trực tiếp bởi Fastify Web Server trên cùng một cổng duy nhất (`PORT=3000`):

```bash
# 1. Biên dịch frontend SPA
npm run build:dashboard

# 2. Biên dịch backend TypeScript
npm run build

# 3. Khởi động tiến trình bot (Fastify tự động serve dashboard/dist)
npm start
```

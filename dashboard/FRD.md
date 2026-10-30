# FUNCTIONAL REQUIREMENTS DOCUMENT (FRD) & DESIGN SPECIFICATION
## TRACK W: WEB & MANAGEMENT DASHBOARD (LORA DISCORD BOT)

> **Document Version:** 1.0.0  
> **Release Target:** `v0.7.0` (Dashboard MVP & Custom Permit RBAC)  
> **Status:** APPROVED & ACTIVE IN CODEBASE  
> **Audience:** System Architects, Fullstack Engineers, UX/UI Designers  

---

## 1. TỔNG QUAN DỰ ÁN & MỤC TIÊU NGHIỆP VỤ

### 1.1. Bối cảnh & Vấn đề
Hiện tại, bot **Lora** vận hành chủ yếu thông qua các Slash Commands trên Discord Gateway. Việc cấu hình các tính năng phức tạp như **Donator Time-Bank**, **Server Booster Grace Period**, **Voice Keeper 24/7** và theo dõi tài nguyên bot qua chat command bị hạn chế về mặt trực quan, khó thao tác hàng loạt và thiếu một bảng điều khiển tập trung.

### 1.2. Mục tiêu Cốt lõi của Track W
1. **Web Dashboard Quản Trị Trực Quan:** Xây dựng Single Page Application (SPA) độc lập tại thư mục `dashboard/` hỗ trợ cấu hình bot theo thời gian thực.
2. **Hệ thống Custom Permit (Wick-style RBAC):** Thay thế việc phụ thuộc vào Discord native permissions bằng mô hình kiểm soát truy cập phân tầng độc lập (Bot Owner, Server Owner, Co-Owner, Trusted Admin, Custom Role/User grants).
3. **Kiến trúc Ghép nối Độc lập (Pluggable Vertical Slice):** Cả Backend REST API và Frontend Dashboard UI đều được thiết kế module hóa, cho phép cắm/rút các tính năng mới trong tương lai (Wordchain, Swarm, Moderation) mà không phải tái cấu trúc core.
4. **Trải nghiệm Thời gian thực Hybrid (REST + SSE):** Thao tác CRUD/cấu hình qua REST API + TanStack Query; nhận push cập nhật trạng thái sống (Voice Connection, Bot Health) tức thì qua Server-Sent Events (SSE).

---

## 2. MA TRẬN PHÂN QUYỀN (WICK-STYLE PERMIT SPECIFICATION)

### 2.1. Phân cấp Thẩm quyền (Authority Hierarchy)
Hệ thống loại bỏ hoàn toàn việc dùng quyền Discord Administrator/Manage Guild làm điều kiện tiên quyết, thiết lập cây phân cấp độc lập:

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 0: Bot Owner (Global System Super Admin)              │
│  - Cấu hình qua biến môi trường (.env: BOT_OWNER_ID)        │
│  - Toàn quyền hệ thống, System Health, truy cập mọi Guilds   │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│  Tier 1: Discord Server Owner (Root Authority per Guild)    │
│  - Xác định tự động qua Discord API: guild.ownerId          │
│  - Quyền gốc tối cao trong server, toàn quyền cấu hình      │
│  - Người duy nhất có thể bổ nhiệm / bãi nhiệm Co-Owner      │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│  Tier 2: Co-Owner (Ủy quyền Toàn diện)                      │
│  - Do Server Owner bổ nhiệm (User-based)                    │
│  - Toàn quyền quản lý tính năng bot trong Guild             │
│  - Không thể tự ý hạ bệ Server Owner hoặc Co-Owner khác     │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│  Tier 3: Trusted Admin (Quản trị Tin cậy)                   │
│  - Do Server Owner hoặc Co-Owner bổ nhiệm                   │
│  - Mặc định có quyền quản trị vận hành bot trong Guild      │
│  - Bị giới hạn: Không có quyền sửa đổi danh sách Permit     │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│  Tier 4: Custom Permits (Cấp quyền Module Linh hoạt)        │
│  - Gán trực tiếp cho User cụ thể hoặc Role cụ thể           │
│  - Khai báo theo Bitfield Flags cho từng module nghiệp vụ   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Bảng Cờ Quyền Hạn (Permission Bitfield Flags)

```typescript
export const PermitFlag = {
  VIEW_DASHBOARD:      1 << 0, // 0x01: Cho phép đăng nhập và xem Dashboard của Guild
  MANAGE_PERMITS:      1 << 1, // 0x02: Cấu hình Co-Owner, Trusted Admin, Custom Permits
  MANAGE_SETTINGS:     1 << 2, // 0x04: Cấu hình cài đặt chung của Guild
  MANAGE_PERKS:        1 << 3, // 0x08: Quản lý Server Booster & Donator Time-Bank
  MANAGE_VOICE_KEEPER: 1 << 4, // 0x10: Cấu hình kênh thoại 24/7 & kích hoạt Reconnect
  MANAGE_WORDCHAIN:    1 << 5, // 0x20: Cấu hình trò chơi nối từ (Future Expansion)
  MANAGE_SWARM:        1 << 6, // 0x40: Cấu hình The Swarm Linked Roles (Future Expansion)
} as const;

export type PermitFlagName = keyof typeof PermitFlag;
```

* **Quy tắc Kiểm tra Quyền:**
  * `Bot Owner` hoặc `Server Owner`: Mặc định `ALL_PERMISSIONS`.
  * `Co-Owner`: Mặc định sở hữu tất cả các cờ ngoại trừ việc chuyển quyền chủ guild.
  * `Trusted Admin`: Mặc định sở hữu `VIEW_DASHBOARD | MANAGE_SETTINGS | MANAGE_PERKS | MANAGE_VOICE_KEEPER`.
  * `Custom Permit`: Kiểm tra phép toán `(userBitfield & REQUIRED_FLAG) === REQUIRED_FLAG`. Nếu user có nhiều role, bitfield được gộp bằng toán tử `OR` (`|`).

---

## 3. KIẾN TRÚC HỆ THỐNG & TẦNG GIAO TIẾP

### 3.1. Luồng Xác thực Kép (Dual-Auth Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Web Client (Browser)
    participant Fastify as Fastify HTTP Server (:3000)
    participant Discord as Discord OAuth2 API
    participant Bot as Discord Gateway & DB

    User->>Fastify: GET /api/auth/discord (Redirect to Discord)
    Fastify-->>User: 302 Redirect (Discord OAuth2 Authorize URL với HMAC-signed State)
    User->>Discord: Xác nhận cấp quyền (identify, guilds)
    Discord-->>Fastify: Callback /api/auth/discord/callback?code=XYZ&state=ABC
    Fastify->>Fastify: Kiểm tra Timing-Safe State khớp lora_oauth_state cookie
    Fastify->>Discord: Trao đổi code lấy access_token & refresh_token
    Discord-->>Fastify: Token payload + User Profile
    Fastify->>Fastify: Tạo HMAC-signed Session (userId, avatar, username)
    Fastify-->>User: Set-Cookie: lora_session=...; HttpOnly; Secure; SameSite=Lax
    
    Note over User, Fastify: Các request tiếp theo tự động gửi kèm Cookie
    User->>Fastify: GET /api/guilds (Lấy danh sách server có quyền truy cập)
    Fastify->>Bot: Đối soát Guilds Cache + DB Permit Table
    Bot-->>Fastify: Danh sách Guilds + Quyền hạn tương ứng
    Fastify-->>User: JSON [{ guildId, name, icon, roleTier, permissions }]
```

* **Master API Key Support:** Header `x-api-key: <MASTER_SECRET_KEY>` được hỗ trợ độc lập cho Bot Owner hoặc Automation Scripts, bypass OAuth2 để tương tác trực tiếp với các endpoint quản trị hệ thống.

### 3.2. Mô hình Đồng bộ Dữ liệu Hybrid (REST API + SSE)
* **REST API Endpoints:** Phục vụ các thao tác cấu hình chuẩn (Settings, Top-up Donator, Cập nhật Grace Period, Gán Permit).
* **Server-Sent Events (SSE Channel):** 
  * Endpoint: `/api/sse/guilds/:guildId`
  * Sự kiện push:
    * `voice:status`: Thay đổi trạng thái kết nối thoại (`READY`, `CONNECTING`, `RECONNECTING`, `DISCONNECTED`).
    * `perk:update`: Khi có giao dịch Donator mới hoặc Booster cập nhật custom role.
    * `permit:changed`: Khi danh sách permit của guild bị thay đổi.
  * Endpoint: `/api/sse/system` (Dành riêng cho Bot Owner: push CPU, RAM, WebSocket Ping mỗi 3 giây).

### 3.3. Cơ chế Triển khai Đơn Cổng (Single-Port Hybrid Deployment)
* **Production:**
  * Fastify sử dụng `@fastify/static` ánh xạ thư mục tĩnh `dashboard/dist` phục vụ người dùng.
  * Các route `/api/*`, `/auth/*`, `/sse/*` được Fastify xử lý ưu tiên. Mọi request không khớp đường dẫn API được chuyển tiếp về `index.html` của React Router.
  * Toàn bộ tiến trình Bot + API + Web Dashboard chạy gọn gàng trên **1 cổng duy nhất** (`PORT=3000`), tương thích hoàn hảo với Docker container và VPS.
* **Development:**
  * Vite Dev Server chạy tại `http://localhost:5173`.
  * File `vite.config.ts` cấu hình proxy trỏ `/api`, `/auth`, `/sse` về `http://localhost:3000`.

---

## 4. BẢN VẼ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA SPECIFICATION)

Cập nhật tập trung tại `src/shared/db/schema.prisma`:

```prisma
// ==========================================
// DOMAIN: CUSTOM PERMIT & RBAC (WICK-STYLE)
// ==========================================

enum PermitTier {
  CO_OWNER
  TRUSTED_ADMIN
  CUSTOM
}

enum PermitTargetType {
  USER
  ROLE
}

model GuildPermitConfig {
  guildId           String   @id @map("guild_id")
  trustedAdminFlags Int      @default(29) @map("trusted_admin_flags") // Default: VIEW | SETTINGS | PERKS | VOICE
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("guild_permit_configs")
}

model GuildPermitAssignment {
  id          String           @id @default(cuid())
  guildId     String           @map("guild_id")
  targetType  PermitTargetType @map("target_type") // USER | ROLE
  targetId    String           @map("target_id")   // Discord User ID hoặc Role ID
  tier        PermitTier       @map("tier")        // CO_OWNER | TRUSTED_ADMIN | CUSTOM
  permissions Int              @default(1) @map("permissions") // Bitfield flags
  createdBy   String           @map("created_by")  // User ID thực hiện cấp quyền
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  @@unique([guildId, targetType, targetId])
  @@index([guildId, tier])
  @@map("guild_permit_assignments")
}
```

---

## 5. ĐẶC TẢ TÍNH NĂNG WEB DASHBOARD & DESIGN SYSTEM

### 5.1. Thiết Kế Trực Quan & Design System (Discord Dark Aesthetic)
Bảng mã màu chuẩn tuân thủ nghiêm ngặt bộ màu Discord và Brand của Lora:
* **Backgrounds:**
  * Main Canvas: `#1e1f22` (Discord Darkest)
  * Card / Sidebar: `#2b2d31` (Discord Surface Dark)
  * Elevated / Dropdown / Modals: `#313338` (Discord Popover)
  * Borders / Dividers: `#3f4147` / `#4e5058`
* **Accents & States:**
  * Blurple Primary: `#5865F2` (Hover: `#4752C4`)
  * Green Success: `#57F287`
  * Yellow Warning: `#FEE75C`
  * Red Destructive: `#ED4245`
  * Text Primary: `#F2F3F5`
  * Text Muted: `#949BA4`

### 5.2. Các Trang Tính Năng Chính (Core Views)

#### View 1: Overview & System Metrics (`/dashboard`)
* **Đối tượng:** Tất cả người dùng có quyền `VIEW_DASHBOARD`. Riêng Bot Owner được xem phần **System Infrastructure Metrics**.
* **Nội dung:**
  * Thẻ chào mừng & Thông tin Server đang chọn.
  * Chỉ số tổng quan: Trạng thái Voice Keeper (Đang chạy/Dừng), Trạng thái Perks (Booster/Donator).
  * **Bot Owner Panel:** Live Uptime, RAM (Heap Used / RSS), CPU Usage, WebSocket Ping (ms) nhận liên tục qua SSE.

#### View 2: Quản lý Phân quyền (`/dashboard/permits`)
* **Đối tượng:** Yêu cầu quyền `MANAGE_PERMITS` hoặc Server Owner/Bot Owner.
* **Giao diện:**
  * **Section Co-Owners:** Quản lý danh sách Co-Owners (chỉ Server/Bot Owner có quyền thêm/xóa).
  * **Section Trusted Admins:** Quản lý danh sách Trusted Admins và cấu hình các cờ quyền mặc định của tier này.
  * **Section Custom Grants:** Ma trận bảng gán quyền theo Role hoặc Thành viên cụ thể. Checkbox chọn trực tiếp từng cờ quyền (`VIEW_DASHBOARD`, `MANAGE_PERKS`, `MANAGE_VOICE_KEEPER`,...).

#### View 3: Quản lý Kênh Thoại 24/7 (`/dashboard/voice-keeper`)
* **Đối tượng:** Yêu cầu quyền `MANAGE_VOICE_KEEPER`.
* **Giao diện:**
  * Badge trạng thái kết nối Live qua SSE (`READY`, `CONNECTING`, `RECONNECTING`, `DISCONNECTED`).
  * Dropdown danh sách Voice & Stage Channels lấy từ Discord Gateway.
  * Tùy chọn chuyển đổi (Toggles): `Self-Deaf`, `Self-Mute`, `Auto-Reconnect`.
  * Bộ 3 nút bấm tác vụ:
    * `Lưu & Khởi Động Giữ Kênh`: Lưu cấu hình và yêu cầu bot kết nối.
    * `Buộc Reconnect Ngay`: Ngắt kết nối hiện tại và tái thiết lập kết nối sạch.
    * `Dừng Giữ Kênh`: Thoát phòng thoại và tắt tính năng cho guild.

#### View 4: Quản lý Đặc quyền Perks (`/dashboard/perks`)
* **Đối tượng:** Yêu cầu quyền `MANAGE_PERKS`.
* **Giao diện:**
  * **Sub-tab Server Booster:** Cấu hình thời gian ân hạn Grace Period (ngày), kênh thông báo, kênh log. Bảng danh sách custom role booster đang sở hữu.
  * **Sub-tab Donator Time-Bank:** Bật/Tắt module Donator. Cấu hình tỷ giá VND/giờ và tốc độ đốt khi cất kho (`idleBurnRate`). Bảng điều khiển quỹ thời gian thành viên, form nạp thêm giờ (`Top-up`) và bảng lịch sử giao dịch.

---

## 6. HƯỚNG DẪN DÀNH CHO UX/UI DESIGN AGENT

Khi agent chuyên về UX/UI tiếp nhận mã nguồn `dashboard/`:
1. **Thư mục làm việc trọng tâm:** Toàn bộ mã nguồn giao diện nằm trong `dashboard/src/`:
   * `components/layout/`: `Sidebar.tsx`, `Navbar.tsx`, `DashboardLayout.tsx`
   * `pages/`: `OverviewPage.tsx`, `PermitPage.tsx`, `VoiceKeeperPage.tsx`, `PerksPage.tsx`, `LoginPage.tsx`
   * `index.css`: Tailwind classes & custom visual effects.
2. **Nguyên tắc Thiết kế:**
   * Giữ phong cách **Discord Native Aesthetic** tối giản, mượt mà, đậm chất Gaming/Tech community.
   * Chú trọng trạng thái tương tác: Loading skeletons, active states, hover transitions, toast notifications.
   * Đảm bảo tính nhất quán giữa trạng thái nhận qua Server-Sent Events (SSE) và các thao tác mutations từ TanStack Query.
3. **Quy tắc API Integration:**
   * Sử dụng hàm `apiFetch` từ `dashboard/src/api/client.ts`. Hàm này đã được cấu hình tự động truyền cookie phiên (`credentials: 'include'`) và chỉ đính kèm header `Content-Type: application/json` khi có payload body.

# FEAT-08: Landmine Chat Engine (`src/features/landmine`)

Tài liệu đặc tả kiến trúc kỹ thuật, cẩm nang vận hành và hướng dẫn triển khai của phân hệ **Landmine Chat Engine (Mìn Chat / Bẫy Kênh)** thuộc bot **Lora**.

> 📖 *Tài liệu Đặc Tả Yêu Cầu Tính Năng (FRD) & Acceptance Criteria chi tiết:* [`FRD.md`](./FRD.md)

---

## 1. Tổng Quan & Triết Lý Kiến Trúc

Tính năng `landmine/` được thiết kế nhằm tạo ra cơ chế minigame giải trí mang tính bất ngờ, kịch tính trong các kênh chat Discord. Mỗi tin nhắn của thành viên có một tỉ lệ ngẫu nhiên nhất định kích hoạt "mìn chat", dẫn tới hình phạt timeout (cấm ngôn) tạm thời.

Tính năng được xây dựng bám sát **Vertical Slice Architecture** với các nguyên lý cốt lõi:

* **Tối Ưu Hiệu Năng Tin Nhắn Tuyệt Đối (In-Memory Cache):**
  * Sự kiện `MessageCreate` xảy ra với tần suất cực cao trên Discord. Để triệt tiêu hoàn toàn độ trễ I/O và nghẽn cơ sở dữ liệu SQLite, toàn bộ cấu hình module (`LandmineModule`) và thiết lập máy chủ (`LandmineGuildConfig`) được lưu trữ trên bộ nhớ RAM (`Map<string, GuildLandmineCache>`).
  * Bộ nhớ cache được nạp đồng loạt khi bot khởi động qua `landmine-ready.event.ts` và được đồng bộ hóa tức thì (write-through / invalidate) mỗi khi quản trị viên thực hiện chỉnh sửa cấu hình qua lệnh Slash.
  * Chỉ khi mìn thực sự phát nổ, bot mới thực hiện ghi nhận chỉ số thống kê vào database (`LandmineRecord`) theo phương thức bất đồng bộ không chặn luồng chat.

* **Cơ Chế Đánh Giá First-Hit Stop:**
  * Mỗi máy chủ hỗ trợ tối đa **10 module mìn**:
    * **Module 1 (M1 - Landmine Foundation):** Module mặc định với tỉ lệ tĩnh gán cứng 0.8%, thời gian timeout 1 phút.
    * **Module 2 (M2 - Landmine Advanced):** Module mặc định với thuật toán ngẫu nhiên động đa tầng (Dynamic Chaos Lottery).
    * **Module 3 - 10 (M3 - M10):** Các module tùy chỉnh do Quản trị viên tự thiết lập tỉ lệ (0.01% - 100%) và thời gian phạt (5 giây - 28 ngày).
  * Quy trình duyệt module diễn ra theo thứ tự ưu tiên slot ($M1 \rightarrow M10$). Ngay khi một module kích hoạt nổ thành công hoặc thất bại, vòng lặp dừng ngay lập tức (`First-Hit Stop`), đảm bảo **1 tin nhắn không bao giờ bị dẫm nhiều mìn cùng lúc**.

* **Xử Lý Xung Đột Phân Cấp Discord (Aura Cao Kháng Mìn):**
  * Bot không thể timeout thành viên có vai trò cao hơn bot hoặc Chủ Server (`DiscordAPIError: 50013 / Missing Permissions`). Thay vì báo lỗi sụp đổ, hệ thống bắt mã lỗi này và chuyển đổi thành cơ chế hài hước: **"Aura cao quá mìn không dám nổ" (Nổ thất bại)**.
  * Chỉ số dẫm mìn nhưng nổ thất bại được lưu riêng vào cơ sở dữ liệu và hiển thị vinh danh trên Bảng Xếp Hạng.

* **Trải Nghiệm Người Dùng & Không Spam:**
  * **Zero DM Spam:** Tuyệt đối không gửi tin nhắn riêng (Direct Message) cho người dùng khi bị timeout.
  * **Tự Động Thu Dọn:** Embed thông báo nổ mìn hỗ trợ tùy chọn tự động xóa sau 15 giây cố định để giữ cho kênh chat luôn sạch sẽ.
  * **Đa Ngôn Ngữ Linh Hoạt (i18n):** Hỗ trợ ép buộc ngôn ngữ toàn server (`vi` / `en`) hoặc tự động (`auto`) nhận diện theo locale của người dùng. Tin nhắn tùy chỉnh của Server Admin được giữ nguyên vẹn không dịch.

* **Bảo Mật & Phân Quyền Tuyệt Đối:**
  * Mọi lệnh cấu hình yêu cầu nghiêm ngặt cờ quyền Discord Native `PermissionFlagsBits.Administrator`. Từ chối `ManageGuild` hoặc thấp hơn.

---

## 2. Danh Mục Lệnh Tương Tác (`/landmine`)

Tất cả lệnh quản trị được gom nhóm dưới root command `/landmine`:

| Lệnh | Phân Quyền | Chức năng |
| :--- | :--- | :--- |
| `/landmine list` | Mọi người | Xem danh sách tổng quan tất cả module mìn của server (trạng thái, tỉ lệ, thời gian phạt, kênh & role). |
| `/landmine leaderboard [module] [sort]` | Mọi người | Bảng xếp hạng dẫm mìn (toàn server hoặc theo từng module). Hỗ trợ sort theo số lần (`count`) hoặc thời lượng phạt (`duration`). |
| `/landmine toggle <module> <state>` | `Administrator` | Bật hoặc tắt nhanh hoạt động của một module mìn. |
| `/landmine create <rate> <duration> [note]` | `Administrator` | Tạo mới một custom module mìn vào slot trống đầu tiên (M3 - M10). |
| `/landmine delete <module>` | `Administrator` | Xóa vĩnh viễn một module tùy chỉnh (chỉ áp dụng cho module M3 - M10; cấm xóa M1 và M2). |
| `/landmine edit <module> [note] [rate] [duration] [channel_scope] [role_scope] [leaderboard] [autodelete] [success_msg] [failed_msg]` | `Administrator` | Chỉnh sửa cấu hình chi tiết của module (M1 & M2 chỉ sửa note, scope, leaderboard, autodelete, custom messages). |
| `/landmine channels <module> <mode> [channels]` | `Administrator` | Cấu hình phạm vi kênh áp dụng (`ALL`, `WHITELIST` - chỉ áp dụng các kênh này, `BLACKLIST` - bỏ qua các kênh này). |
| `/landmine roles <module> <mode> [roles]` | `Administrator` | Cấu hình phạm vi vai trò (`ALL`, `WHITELIST` - chỉ áp dụng các role này, `BLACKLIST` - miễn trừ cho các role này). |
| `/landmine set_locale <locale>` | `Administrator` | Cấu hình ngôn ngữ hiển thị Embed thông báo của server (`vi`, `en`, `auto`). |
| `/landmine reset_stats <module>` | `Administrator` | Xóa trắng dữ liệu thống kê BXH dẫm mìn (`all` hoặc mã module cụ thể). |

---

## 3. Thuật Toán Ngẫu Nhiên (RNG Engine)

### 3.1. Thuật Toán Tĩnh (Static Random) — Module 1 & Module Tùy Chỉnh (M3 - M10)
Tỉ lệ nổ được gán cố định dưới dạng phần trăm $R \in [0.01\%, 100\%]$:
$$\text{Hit} \iff \text{Math.random}() \times 100 < R$$

* **Module 1 (Default):** $R = 0.8\%$, thời gian phạt $P = 60\text{ giây}$.

### 3.2. Thuật Toán Động Đa Tầng (Dynamic Chaos Lottery) — Module 2
Module 2 mô phỏng cơ chế xổ số hỗn loạn với tỉ lệ kích hoạt ban đầu và các hệ số nhân ngẫu nhiên:

```
[Message Create]
       │
       ▼
 [Lần 1: Kích hoạt cơ hội] ──(50% Không trúng)──► [Bỏ qua an toàn]
       │
   (50% Trúng)
       ▼
 [Lần 2: Quay Rate Multiplier] ──► RM ∈ {1, 2, 3} (Đồng xác suất 1/3)
       │
       ▼
 [Tạo 3 Tầng Xác Suất Thực Tế]
   ├── Tầng 1: 0.1% × RM  (Base Duration: 5 phút = 300s)
   ├── Tầng 2: 0.3% × RM  (Base Duration: 2 phút = 120s)
   └── Tầng 3: 1.0% × RM  (Base Duration: 1 phút = 60s)
       │
       ▼
 [Lần 3: Quay Thưởng Độc Lập - Không Đè Lên Nhau]
   Roll ∈ [0, 100)
   ├── Nếu Roll < Rate(Tầng 1)                   ──► Trúng Tầng 1 (Base: 5m)
   ├── Ngược lại nếu Roll < Rate(Tầng 1 + Tầng 2) ──► Trúng Tầng 2 (Base: 2m)
   ├── Ngược lại nếu Roll < Rate(Tổng 3 tầng)     ──► Trúng Tầng 3 (Base: 1m)
   └── Không trúng tầng nào                       ──► [Bỏ qua an toàn]
       │
   (Nếu Trúng 1 Tầng)
       ▼
 [Lần 4: Quay Punishment Multiplier] ──► PM ∈ {1, 2, 3} (Đồng xác suất 1/3)
       │
       ▼
 [Thời Gian Phạt Thực Tế] = Base Duration × PM
```

Footer của thông báo nổ mìn cho Module 2 sẽ hiển thị minh bạch toàn bộ các hệ số:
`RM: x{RM} | Tầng: {Tier} | PM: x{PM} | Phạt: {Duration}`

---

## 4. Mô Hình Dữ Liệu Prisma (`schema.prisma`)

```prisma
model LandmineGuildConfig {
  guildId      String   @id @map("guild_id")
  forcedLocale String?  @map("forced_locale")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("landmine_guild_configs")
}

model LandmineModule {
  id                         String   @id @default(cuid())
  guildId                    String   @map("guild_id")
  moduleKey                  String   @map("module_key")
  isDefault                  Boolean  @default(false) @map("is_default")
  isEnabled                  Boolean  @default(false) @map("is_enabled")
  note                       String?  @map("note")
  algorithmType              String   @default("STATIC") @map("algorithm_type")
  staticRate                 Float    @default(0.008) @map("static_rate")
  punishmentDurationSeconds  Int      @default(60) @map("punishment_duration_seconds")
  channelScopeType           String   @default("WHITELIST") @map("channel_scope_type")
  channelIds                 String   @default("[]") @map("channel_ids")
  roleScopeType              String   @default("BLACKLIST") @map("role_scope_type")
  roleIds                    String   @default("[]") @map("role_ids")
  includeInServerLeaderboard Boolean  @default(true) @map("include_in_server_leaderboard")
  autoDeleteNotification     Boolean  @default(false) @map("auto_delete_notification")
  successMessage             String?  @map("success_message")
  failedMessage              String?  @map("failed_message")
  createdAt                  DateTime @default(now()) @map("created_at")
  updatedAt                  DateTime @updatedAt @map("updated_at")

  @@unique([guildId, moduleKey])
  @@index([guildId, isEnabled])
  @@map("landmine_modules")
}

model LandmineRecord {
  id                  String   @id @default(cuid())
  guildId             String   @map("guild_id")
  moduleKey           String   @map("module_key")
  userId              String   @map("user_id")
  totalSteps          Int      @default(0) @map("total_steps")
  successCount        Int      @default(0) @map("success_count")
  failedCount         Int      @default(0) @map("failed_count")
  totalTimeoutSeconds BigInt   @default(0) @map("total_timeout_seconds")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@unique([guildId, moduleKey, userId])
  @@index([guildId, totalSteps])
  @@index([guildId, totalTimeoutSeconds])
  @@index([guildId, userId])
  @@map("landmine_records")
}
```

---

## 5. Quy Chuẩn Bảng Xếp Hạng (Leaderboard Engine)

Bảng xếp hạng hỗ trợ 2 chế độ hiển thị:
1. **Module Leaderboard (`/landmine leaderboard [module:<name>]`):** Chỉ tính điểm các lần dẫm mìn kích hoạt bởi module cụ thể (ví dụ: `foundation`, `advanced`, `M3`..`M10`).
2. **Server Global Leaderboard (`/landmine leaderboard`):** Tổng hợp điểm từ tất cả các module có bật cờ `includeInServerLeaderboard = true`.

### Tiêu Chí Sắp Xếp Đa Chiều:
* **`sort: count` (Mặc định):**
  * Tiêu chí chính: Tổng số lần dẫm mìn (`totalSteps DESC`).
  * Tiêu chí phụ khi hòa: Tổng thời gian timeout (`totalTimeoutSeconds DESC`).
* **`sort: duration`:**
  * Tiêu chí chính: Tổng thời gian timeout (`totalTimeoutSeconds DESC`).
  * Tiêu chí phụ khi hòa: Tổng số lần dẫm mìn (`totalSteps DESC`).

Mỗi dòng trên Bảng Xếp Hạng thể hiện đầy đủ:
* Thứ hạng vinh danh (Top 1 🥇, Top 2 🥈, Top 3 🥉).
* Định danh thành viên (`<@userId>`).
* Tổng số lần dẫm, chi tiết số lần nổ thành công, số lần Aura cao kháng mìn (`🛡️`), và tổng thời lượng cấm ngôn tích lũy.

---

## 6. Phân Hệ Quản Trị Web Management Dashboard (`v0.9.0`)

Phân hệ Landmine Chat Engine được kết nối trực tiếp lên Web Management Dashboard thông qua bộ REST API Fastify và giao diện người dùng React:

### 6.1. Danh Sách REST API Endpoints (`src/features/landmine/landmine.route.ts`)

| Phương thức | Endpoint | Quyền hạn (Permit) | Chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/guilds/:guildId/landmine/config` | `VIEW_DASHBOARD` | Lấy cấu hình `forcedLocale` và danh sách DTO của 10 module mìn. |
| `PUT` | `/api/guilds/:guildId/landmine/config` | `MANAGE_SETTINGS` | Cập nhật ngôn ngữ thông báo ép buộc (`auto`, `vi`, `en`). |
| `POST` | `/api/guilds/:guildId/landmine/modules` | `MANAGE_SETTINGS` | Khởi tạo custom module mới vào slot trống đầu tiên (M3 - M10). |
| `PUT` | `/api/guilds/:guildId/landmine/modules/:moduleKey` | `MANAGE_SETTINGS` | Chỉnh sửa module (tỉ lệ, thời gian phạt, scope kênh/role, tin nhắn nổ). |
| `POST` | `/api/guilds/:guildId/landmine/modules/:moduleKey/toggle` | `MANAGE_SETTINGS` | Bật hoặc tắt trạng thái hoạt động của module. |
| `DELETE` | `/api/guilds/:guildId/landmine/modules/:moduleKey` | `MANAGE_SETTINGS` | Xóa module tùy chỉnh (chặn thao tác với M1 và M2). |
| `GET` | `/api/guilds/:guildId/landmine/leaderboard` | `VIEW_DASHBOARD` | Tra cứu Bảng Xếp Hạng (`?module=server|m1...&sort=count|duration&limit=50`). |
| `POST` | `/api/guilds/:guildId/landmine/reset` | `MANAGE_SETTINGS` | Xóa dữ liệu thống kê BXH theo phạm vi yêu cầu (`moduleKey: 'all' | string`). |

### 6.2. Giao Diện Người Dùng (`dashboard/src/pages/LandminePage.tsx`)
* **Header & General Settings:** Bộ chọn ngôn ngữ `forcedLocale` trực quan, badge phiên bản `v0.9.0` và nút reset dữ liệu BXH khẩn cấp.
* **KPI Bento Highlights:** Thống kê trực tiếp tổng module đang kích hoạt, tổng lượt nổ mìn và tổng thời gian phạt.
* **Tab 1 - Quản Lý 10 Slots Module:**
  * Hiển thị dạng Bento Cards cho cả 10 slots.
  * M1 (Foundation): Hiển thị rate 0.8% và phạt 60s có biểu tượng khóa cố định.
  * M2 (Advanced): Tích hợp giải thích trực quan thuật toán Dynamic Chaos Lottery.
  * M3 - M10 (Custom Modules): Tự do cấu hình tỉ lệ (0.01% - 100%) và thời gian phạt (5s - 28 ngày).
  * Thẻ Slot Trống: Card viền nét đứt kèm nút "+ Tạo Module Mới".
  * Modal cấu hình chi tiết: Tích hợp chọn Scope Kênh & Vai trò (Whitelist/Blacklist/All) và editor tin nhắn nổ mìn với nút chèn nhanh `{user}`.
* **Tab 2 - Bảng Xếp Hạng Trực Quan:** Lọc theo từng module hoặc toàn server; chuyển đổi chế độ sắp xếp theo số lần dẫm (`count`) hoặc thời gian phạt (`duration`); vinh danh Top 1 🥇, Top 2 🥈, Top 3 🥉 với avatar `UserDisplay`.
* **Bản Địa Hóa Song Ngữ:** Đồng bộ 100% từ điển `vi` và `en`, không hardcode chuỗi hiển thị.

---

## 7. Kiểm Thử & Nghiệm Thu (Verification Checklist)

* [x] **Zero `any` & Strict Typing:** Hoàn thành 100%, vượt qua `npx tsc --noEmit` với 0 cảnh báo.
* [x] **Zero Cross-Feature Import:** Toàn bộ logic nội bộ gói gọn trong `src/features/landmine/`.
* [x] **Fastify REST API & Zod Validation:** 8 endpoints chuẩn RESTful với Zod validation & RBAC guards.
* [x] **Dashboard SPA Integration:** Route `/dashboard/guilds/:guildId/landmine` hoạt động mượt mà, vượt qua `npm run build:dashboard`.
* [x] **Cache Reliability:** In-memory cache hoạt động độc lập, không block Gateway event loop.
* [x] **First-Hit Stop:** Đã kiểm chứng tính tuần tự ngắt vòng lặp khi trúng mìn.
* [x] **Discord API Hierarchy 403:** Xử lý ngoại lệ mượt mà, chuyển đổi sang "Aura cao" không gây văng bot.
* [x] **Auto Delete Timer:** Tự động hủy tin nhắn thông báo nổ sau 15 giây cố định khi bật cờ.
* [x] **Administrator RBAC:** Chặn toàn bộ người dùng thiếu quyền Quản trị viên đối với các lệnh cấu hình.

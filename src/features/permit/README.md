# FEAT-07: Custom Permit System (Wick-style RBAC) (`src/features/permit`)

Tài liệu đặc tả kiến trúc kỹ thuật, cẩm nang vận hành và hướng dẫn triển khai của phân hệ **Custom Permit System** thuộc bot **Lora**.

---

## 1. Tổng Quan & Triết Lý Kiến Trúc

Hệ thống Custom Permit được thiết kế theo chuẩn **Wick-style RBAC**, hoàn toàn độc lập và không phụ thuộc vào hệ thống Discord native permissions (Administrator, Manage Guild, ...):

* **Quyền Gốc Tối Cao (Root Authority):**
  * `Bot Owner`: Toàn quyền trên mọi server và hệ thống quản trị (`process.env.BOT_OWNER_ID` hoặc Master API Key).
  * `Server Owner`: Quyền gốc tối cao trong từng máy chủ xác định tự động qua Discord API (`guild.ownerId`).
* **Phân Cấp Thẩm Quyền (Authority Tiers):**
  * **Co-Owner (`CO_OWNER`):** Được ủy quyền toàn diện để quản lý mọi tính năng của bot trong Guild. Chỉ cá nhân User mới có thể được bổ nhiệm và chỉ Server Owner mới có quyền bổ nhiệm/bãi nhiệm.
  * **Trusted Admin (`TRUSTED_ADMIN`):** Quản trị viên tin cậy được hưởng bộ cờ quyền mặc định (`VIEW_DASHBOARD`, `MANAGE_SETTINGS`, `MANAGE_PERKS`, `MANAGE_VOICE_KEEPER`). Có thể gán cho User hoặc Role.
  * **Custom Permits (`CUSTOM`):** Cấp quyền module cụ thể theo từng cờ quyền (Bitfield Flags) cho một User hoặc Role bất kỳ.
* **Ma Trận Cờ Quyền (Bitfield Flags):**
  * `VIEW_DASHBOARD (1 << 0)`: Cho phép đăng nhập và truy cập Dashboard của Guild.
  * `MANAGE_PERMITS (1 << 1)`: Bổ nhiệm, chỉnh sửa và thu hồi phân quyền.
  * `MANAGE_SETTINGS (1 << 2)`: Thay đổi các cài đặt chung của Guild.
  * `MANAGE_PERKS (1 << 3)`: Quản lý Server Booster và Donator Time-Bank.
  * `MANAGE_VOICE_KEEPER (1 << 4)`: Cấu hình và điều khiển kênh thoại 24/7.
  * `MANAGE_WORDCHAIN (1 << 5)`: Cấu hình trò chơi nối từ.
  * `MANAGE_SWARM (1 << 6)`: Cấu hình The Swarm Linked Roles.

---

## 2. Danh Mục Lệnh Slash Commands (`/permit`)

| Lệnh | Phân Quyền Yêu Cầu | Chức năng |
| :--- | :--- | :--- |
| `/permit co_owner add <user>` | **Server Owner / Bot Owner** | Bổ nhiệm Co-Owner cho bot trong server. |
| `/permit co_owner remove <user>` | **Server Owner / Bot Owner** | Bãi nhiệm Co-Owner. |
| `/permit trusted_admin add <action> [user] [role]` | **Server Owner / Co-Owner** | Bổ nhiệm Trusted Admin cho cá nhân hoặc vai trò. |
| `/permit trusted_admin remove <action> [user] [role]` | **Server Owner / Co-Owner** | Xóa tư cách Trusted Admin. |
| `/permit grant <flag> [user] [role]` | **`MANAGE_PERMITS`** | Cấp quyền module cụ thể cho người dùng hoặc vai trò. |
| `/permit revoke [user] [role]` | **`MANAGE_PERMITS`** | Thu hồi toàn bộ quyền ủy quyền. |
| `/permit list` | **`VIEW_DASHBOARD`** | Xem danh sách phân quyền hiện tại trong Guild. |

---

## 3. Cấu Trúc Bảng Dữ Liệu Prisma

```prisma
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
  targetType  String   @map("target_type") // 'USER' | 'ROLE'
  targetId    String   @map("target_id")
  tier        String   @map("tier")        // 'CO_OWNER' | 'TRUSTED_ADMIN' | 'CUSTOM'
  permissions Int      @default(1) @map("permissions")
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([guildId, targetType, targetId])
  @@index([guildId, tier])
  @@map("guild_permit_assignments")
}
```


---

## 4. Tích Hợp Web Dashboard & Chống Leo Thang Đặc Quyền (`permit.route.ts`)

Giao diện quản lý phân quyền Wick-style RBAC được tích hợp trực tiếp tại `/dashboard/guilds/:guildId/permits`:

* **Danh Mục REST API Endpoints:**
  * `GET /api/guilds/:guildId/permits`: Truy xuất toàn bộ danh sách ủy quyền (Co-Owner, Trusted Admin, Custom Grants) và cờ quyền hiệu lực của người đang truy cập (yêu cầu quyền `VIEW_DASHBOARD`).
  * `POST /api/guilds/:guildId/permits/co-owners`: Bổ nhiệm Co-Owner cho bot trong máy chủ (độc quyền Server Owner hoặc Bot Owner).
  * `DELETE /api/guilds/:guildId/permits/co-owners/:userId`: Bãi nhiệm Co-Owner.
  * `POST /api/guilds/:guildId/permits/trusted-admins`: Bổ nhiệm Trusted Admin cho User hoặc Role (yêu cầu Server Owner hoặc Co-Owner).
  * `PUT /api/guilds/:guildId/permits/trusted-admins/flags`: Thiết lập bộ cờ quyền mặc định của nhóm Trusted Admin.
  * `DELETE /api/guilds/:guildId/permits/trusted-admins/:targetType/:targetId`: Xóa tư cách Trusted Admin.
  * `POST /api/guilds/:guildId/permits/grants`: Cấp phát cờ quyền module cụ thể cho người dùng hoặc vai trò (yêu cầu quyền `MANAGE_PERMITS`).
  * `DELETE /api/guilds/:guildId/permits/grants/:targetType/:targetId`: Thu hồi quyền ủy quyền.
* **Cơ Chế Bảo Vệ Chống Leo Thang Đặc Quyền (Privilege Escalation Guard):**
  * So sánh bitwise `(permit.effectivePermissions & body.permissions) !== body.permissions`: Nghiêm cấm Quản trị viên cấp phát bất kỳ cờ quyền nào mà chính bản thân họ không nắm giữ.
  * Thẩm tra vai trò (`guild.roles.cache.has`): Ngăn chặn việc truyền ID vai trò không có thật hoặc vai trò thuộc máy chủ khác.
  * Bảo vệ cấp bậc: Ngăn chặn Admin cấp dưới cố tình thu hồi quyền hạn của nhóm `TRUSTED_ADMIN` hoặc `CO_OWNER`.

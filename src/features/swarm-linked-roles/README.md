# FEAT-03: Swarm Linked Roles & Connection Metadata (`src/features/swarm-linked-roles`)

Tài liệu đặc tả kiến trúc kỹ thuật, cẩm nang vận hành và hướng dẫn triển khai của phân hệ **The Swarm Linked Roles** thuộc bot **Lora**.

> 📖 *Tài liệu Đặc Tả Yêu Cầu Tính Năng (FRD) & Acceptance Criteria chi tiết:* [`FRD.md`](./FRD.md)

---

## 1. Tổng Quan & Triết Lý Kiến Trúc

Tính năng `swarm-linked-roles/` được thiết kế theo mô hình **Vertical Slice Architecture**, độc lập hoàn toàn với `perks/` hay bất kỳ feature nào khác:

* **Tận dụng Discord Linked Roles Native**: Thay vì bot phải tự gán/gỡ role theo quyền hạn truyền thống (dễ dẫn tới lỗi Role Hierarchy hoặc thiếu quyền), Discord đóng vai trò là bên trực tiếp thẩm định và cấp/thu hồi vai trò khi user thỏa mãn điều kiện `swarm_level = [1..8]`.
* **Phân cấp Ủy quyền 2 Tầng (2-Tier RBAC)**:
  * **Bot Owner (Super Admin)**: Tự động nhận diện qua `client.application.owner` hoặc `BOT_OWNER_ID`. Toàn quyền gán/xóa metadata và độc quyền quản lý danh sách Operator (`/swarm delegate *`).
  * **Delegated Operator**: Người vận hành được ủy quyền (lưu trong DB `SwarmOperator`), có quyền gán/thu hồi level (`/swarm set`, `/swarm remove`) và cấu hình kênh thông báo (`/swarm channel *`).
* **Kênh Thông Báo Thăng Cấp & Thu Hồi (Per-Guild Notification)**:
  * Khi cập nhật level từ 1 lên 2, Discord thu hồi role `The Swarm I` cũ. Bot tự động phát thông báo hướng dẫn vào kênh đã cấu hình để thành viên vào nhận role `The Swarm II` mới.
  * Khi thu hồi level về 0, bot phát thông báo thu hồi và Discord tự động gỡ bỏ vai trò khỏi tài khoản.
* **Tích Hợp Web Server Song Song (Fastify BotRoute)**:
  * Tự động đăng ký qua `src/core/loaders/route.loader.ts` với prefix `/auth`.
  * Endpoint `/auth/discord/login` & `/auth/discord/callback` trao đổi mã OAuth2, bảo vệ chống CSRF bằng HMAC signature và đẩy metadata lên Discord REST API.

---

## 2. Hướng Dẫn Cấu Hình Discord Developer Portal

Để tính năng hoạt động, Quản trị viên cần hoàn thành 2 bước trên [Discord Developer Portal](https://discord.com/developers/applications):

### Bước 1: Khai Báo OAuth2 Redirect URI
1. Vào ứng dụng bot $\rightarrow$ **OAuth2** $\rightarrow$ **General**.
2. Thêm Redirect URI: `http://<your-domain-or-ip>:3000/auth/discord/callback`.
3. Bấm **Save Changes**.

### Bước 2: Thiết Lập Linked Roles Verification URL
1. Trong Developer Portal $\rightarrow$ **General Information**.
2. Điền ô **Linked Roles Verification URL**: `http://<your-domain-or-ip>:3000/auth/discord/login`.
3. Bấm **Save Changes**.

### Bước 3: Đăng Ký Metadata Schema Lên Discord
Chạy lệnh CLI:
```bash
npm run deploy:metadata
```
Sau khi chạy thành công, Discord API sẽ công nhận khóa metadata `swarm_level` (Kiểu: `INTEGER_EQUAL`).

### Bước 4: Tạo 8 Linked Roles Trong Server Settings
Vào Discord Client $\rightarrow$ **Server Settings** $\rightarrow$ **Roles** $\rightarrow$ **Links**:
* Tạo role **The Swarm I**: Thêm điều kiện `Swarm Level = 1`.
* Tạo role **The Swarm II**: Thêm điều kiện `Swarm Level = 2`.
* ...
* Tạo role **The Swarm VIII**: Thêm điều kiện `Swarm Level = 8`.

---

## 3. Danh Mục Lệnh Tương Tác (`/swarm`)

| Lệnh | Phân Quyền | Chức năng |
| :--- | :--- | :--- |
| `/swarm set <user> <level>` | **Operator / Owner** | Gán cấp độ Swarm từ 1 đến 8 và đẩy metadata sang Discord. |
| `/swarm remove <user>` | **Operator / Owner** | Thu hồi cấp độ (đặt về 0) để Discord gỡ bỏ role. |
| `/swarm status [user]` | **Mọi người** | Tra cứu cấp độ Swarm và tình trạng liên kết OAuth2. |
| `/swarm link` | **Mọi người** | Lấy link kèm nút bấm xác thực OAuth2 cá nhân. |
| `/swarm delegate add <user>` | **Bot Owner Only** | Ủy quyền thêm Operator mới vào hệ thống. |
| `/swarm delegate remove <user>` | **Bot Owner Only** | Xóa quyền Operator của một người dùng. |
| `/swarm delegate list` | **Bot Owner Only** | Xem toàn bộ danh sách Operator hiện tại. |
| `/swarm channel set <channel>` | **Operator / Owner** | Chỉ định kênh nhận thông báo thăng cấp/thu hồi. |
| `/swarm channel remove` | **Operator / Owner** | Hủy kênh nhận thông báo (chuyển về im lặng). |

---

## 4. Cấu Trúc Bảng Dữ Liệu Prisma

* `SwarmMemberMetadata`: Lưu `userId`, `swarmLevel`, `updatedBy`, `updatedAt`.
* `SwarmOAuthToken`: Lưu `accessToken`, `refreshToken`, `expiresAt`, `scope`.
* `SwarmOperator`: Lưu danh sách các User ID được Owner ủy quyền.
* `SwarmGuildConfig`: Lưu `guildId` và `notificationChannelId`.

---

## 5. Kiến Trúc Dashboard 2 Không Gian: Server Scope & Global Scope

Phân hệ The Swarm trên Web Dashboard được tổ chức thành 2 không gian điều khiển phân quyền rõ rệt:

### 1. Không Gian Quản Trị Server (`/dashboard/guilds/:guildId/swarm` - `Server Scope`)
* **Dành cho:** Server Admin (và Operator khi đang xem server đó).
* **Quyền hạn Server Admin:**
  * Xem số lượng thành viên The Swarm hiện diện trong máy chủ này.
  * Xem số lượng thành viên phân bổ theo từng bậc (Level 1..8) trong server.
  * Xem Kênh thông báo hiện tại của server (ở chế độ chỉ đọc `read-only`).
  * Xem hướng dẫn cấu hình và sao chép Verification URL.
  * Xem danh sách thành viên trong server được sắp xếp từ **The Swarm 8 về 0**.
  * **Bảo mật:** Ẩn hoàn toàn trường Người cập nhật (`updatedBy`), ẩn số lượng Operators, vô hiệu hóa nút gán/thu hồi cấp bậc.
* **Quyền hạn Operator/Owner khi ở Server Scope:**
  * Được phép cấu hình kênh thông báo của server.
  * Xem người cập nhật (`updatedBy`) và có nút thao tác điều chỉnh cấp bậc.
  * Có nút chuyển nhanh sang **Bảng Quản Trị Swarm Toàn Cầu**.

### 2. Không Gian Quản Trị Toàn Cầu (`/dashboard/global/swarm` - `Global Scope`)
* **Dành riêng cho:** Bot Owner và Delegated Operator.
* **Tính năng:**
  * Truy cập bằng cách chọn **`🌐 Toàn Hệ Thống (Global)`** trên hộp chuyển đổi (Workspace Switcher) ở Navbar.
  * Thống kê KPI toàn mạng lưới: Tổng thành viên linked toàn cầu, tổng Operators, số server đã cấu hình kênh.
  * Bảng phân bổ 8 bậc danh hiệu trên toàn hệ thống.
  * **Quản lý Delegated Operators:** Bot Owner được quyền bổ nhiệm thêm hoặc thu hồi Operator bằng Discord User ID.
  * **Gán Cấp Bậc Toàn Cầu:** Modal tra cứu User ID trực tiếp qua Discord Gateway và gán bậc từ 0 (thu hồi) đến 8.
  * **Danh Sách Toàn Bộ Thành Viên:** Sắp xếp từ bậc 8 về 0, hiển thị đầy đủ `updatedBy`, thời gian và nút điều chỉnh.

### 3. Danh Mục Endpoints REST API
* `GET /api/swarm/auth-status`: Kiểm tra quyền hạn `isOperator` & `isBotOwner` của tài khoản đăng nhập.
* `GET /api/guilds/:guildId/swarm`: Lấy dữ liệu The Swarm của riêng server (bảo mật dữ liệu theo quyền).
* `PUT /api/guilds/:guildId/swarm/config`: Cấu hình kênh thông báo (Chỉ Operator / Bot Owner).
* `GET /api/swarm/global`: Lấy toàn bộ dữ liệu The Swarm toàn hệ thống (Chỉ Operator / Bot Owner).
* `POST /api/swarm/global/members/:userId`: Gán/thu hồi level cấp toàn cầu (Chỉ Operator / Bot Owner).
* `POST /api/swarm/global/operators`: Bổ nhiệm Operator mới (Chỉ Bot Owner).
* `DELETE /api/swarm/global/operators/:userId`: Thu hồi quyền Operator (Chỉ Bot Owner).

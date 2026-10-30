# FEAT-META: Guild Resources & Discord Identity Metadata (`src/features/guild-meta`)

Phân hệ cung cấp các REST API endpoints truy xuất tài nguyên máy chủ (Kênh, Vai trò) và danh tính người dùng Discord nhằm phục vụ các bộ thành phần giao diện thông minh trên Dashboard.

---

## 1. Tổng Quan & Mục Tiêu Kiến Trúc

* **Phục vụ UI Components:** Phân hệ được thiết kế để giải quyết triệt để vấn đề nhập ID thủ công (dễ sai sót) và hiển thị ID trần trụi thiếu trực quan trên Web Dashboard.
* **Nguyên tắc Phân tầng (Vertical Slice):** Đóng gói độc lập trong `src/features/guild-meta/guild-meta.route.ts`, không can thiệp vào `src/core/` và tuân thủ chặt chẽ các Route Guards (`requireAuth`, `requirePermit`).
* **Hiệu năng:** Tận dụng tối đa In-Memory Cache của Discord.js Gateway Client (`guild.channels.cache`, `guild.roles.cache`, `client.users.cache`) và chỉ gọi Discord REST API khi bắt buộc.

---

## 2. Danh Mục Endpoints REST API

| Method | Endpoint | Yêu cầu Quyền | Chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/guilds/:guildId/channels` | `VIEW_DASHBOARD` | Lấy danh sách kênh Text, Announcement, Voice, Stage được sắp xếp theo đúng nhóm Danh mục (Category) và vị trí của server Discord. |
| `GET` | `/api/guilds/:guildId/roles` | `VIEW_DASHBOARD` | Lấy danh sách Vai trò được sắp xếp nghiêm ngặt theo **Discord Role Hierarchy** (vị trí cao nhất xếp trên cùng), lọc bỏ `@everyone`. |
| `GET` | `/api/users/:userId` | Đã đăng nhập (`requireAuth`) | Tra cứu và xác thực người dùng Discord theo ID (trả về Avatar, Username, Global Name, cờ Bot). |
| `POST` | `/api/users/lookup` | Đã đăng nhập (`requireAuth`) | Tra cứu hàng loạt (Batch Lookup) tối đa 50 User ID trong một request, tối ưu cho việc render bảng dữ liệu. |

---

## 3. Ứng Dụng Trên Web Dashboard

Các endpoints trên trực tiếp cấp nguồn dữ liệu cho 4 thành phần UI dùng chung trong `dashboard/src/components/ui/`:

1. **`ChannelSelect.tsx`:** Dropdown chọn kênh trực quan theo Category, phân biệt icon Text (`#`), Loa (Voice), Micro (Stage).
2. **`RoleSelect.tsx`:** Dropdown chọn vai trò theo thứ tự quyền hạn, hiển thị màu sắc thực tế và nhãn vai trò tích hợp.
3. **`UserInput.tsx`:** Ô nhập User ID có debounce 400ms xác thực tức thì và hiển thị thẻ xem trước tài khoản người dùng kèm Avatar.
4. **`UserDisplay.tsx`:** Chuẩn hóa hiển thị danh tính dạng `username (userID)` kèm avatar thu nhỏ trên toàn bộ bảng dữ liệu hệ thống.

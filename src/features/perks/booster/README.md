# FEAT-01: Perks Management - Server Booster (`features/perks/booster`)

Tài liệu đặc tả kiến trúc, hướng dẫn vận hành và nhật ký phát triển của hệ thống quản lý quyền lợi dành riêng cho **Server Booster** thuộc bot **Lora**.

---

## 1. Tổng Quan & Phạm Vi Nghiệp Vụ

Lát cắt `booster/` nằm trong tính năng `src/features/perks/`, được thiết kế theo mô hình **Vertical Slice Architecture**, độc lập hoàn toàn với các gói quyền lợi khác (như `donator/`):

* **Quyền sở hữu:** Mỗi Server Booster chỉ được sở hữu tối đa **1 Custom Role duy nhất**.
* **Đặc quyền màu sắc:**
  * **Single Booster (1 boost):** Tùy chỉnh Tên role và Màu đơn sắc (Solid Hex Color).
  * **Double Booster (2+ boosts):** Mở khóa đặc quyền phối màu **Gradient 2 màu** (`color1` chuyển sang `color2`) được áp dụng tự động 100% qua Discord API.
* **Chính sách Ân hạn (Grace Period):** Khi người dùng hết hạn boost trên Discord (hoặc Admin hạ boost về 0), Custom Role được bảo lưu **7 ngày** trên server. Sau 7 ngày nếu không boost lại, hệ thống sẽ tự động thu hồi và xóa role vĩnh viễn.

---

## 2. Yêu Cầu Tiên Quyết Phía Máy Chủ Discord (Prerequisites)

Để hệ thống Server Booster vận hành tự động và chính xác, máy chủ Discord cần cấu hình đúng 3 điều kiện sau:

### 1. Bật Thông Báo Hệ Thống Khi Có Boost (Bắt Buộc)
* **Vị trí:** Discord `Server Settings` -> `Overview` -> `System Messages Channel`.
* **Cấu hình:** Đánh dấu chọn **"Send a message when someone boosts this server"**.
* **Lý do:** Do Discord API không cung cấp số lượt boost chi tiết của từng cá nhân qua `GuildMember`, bot lắng nghe các tin nhắn sự kiện `MessageType.GuildBoost` qua Gateway để tự động cộng dồn số lượt boost (`boostCount`) cho người dùng.

### 2. Mở Khóa Gói Màu Nâng Cao Discord (Để Sử Dụng Gradient)
* **Tính năng Discord:** **Enhanced Role Styles** (`GuildFeature.EnhancedRoleColors`).
* **Điều kiện:** Máy chủ cần có tối thiểu **3 Server Boosts** được phân bổ cho tính năng Enhanced Role Styles.
* **Cơ chế an toàn:** Nếu máy chủ chưa đạt điều kiện này, bot sẽ từ chối cấu hình 2 màu và thông báo rõ ràng cho người dùng lý do máy chủ chưa kích hoạt tính năng.

### 3. Vị Trí Phân Cấp Role Của Bot (Role Hierarchy)
* Role cao nhất của Bot phải được đặt **nằm trên** Role mỏ neo (`anchorRoleId`) và các Custom Role của Booster để đảm bảo Bot có đủ quyền hạn chỉnh sửa màu sắc, đặt tên và quản lý vị trí Role.

---

## 3. Danh Mục Lệnh Tương Tác (Commands Reference)

Hệ thống cung cấp nhóm lệnh `/perk` tương tác qua Slash Commands:

### Nhóm Lệnh Chung (`common/`)
* `/perk list`: Xem danh sách tất cả các gói quyền lợi hiện có của máy chủ.
* `/perk status`: Xem trạng thái các quyền lợi cá nhân (Server Booster, thời gian kích hoạt, số lượt boost ghi nhận, tình trạng Custom Role, thời gian ân hạn nếu có).

### Nhóm Lệnh Server Booster (`booster/`)
* `/perk server_booster info`: Xem chi tiết chính sách và quyền lợi độc quyền của Server Booster.
* `/perk server_booster role_view [user]`: Xem chi tiết thông số Custom Role (tên, mã màu, trạng thái trang bị, số lượt boost). Thành viên chỉ xem được của mình; Staff (`ManageRoles`) có thể tra cứu của thành viên khác.
* `/perk server_booster role_claim`: Tạo mới hoặc trang bị lại Custom Role cho bản thân.
* `/perk server_booster role_unclaim`: Tạm thời gỡ Custom Role khỏi hồ sơ cá nhân mà không xóa role khỏi server.
* `/perk server_booster role_config [name] [color1] [color2]`: Cập nhật tên và mã màu Hex cho Custom Role. Nhập cả 2 màu để kích hoạt Gradient style (yêu cầu 2+ boosts và server hỗ trợ).
* `/perk server_booster set_boost user:<@User> count:<number>`: **(Dành riêng cho Administrator)** Đồng bộ số lượt boost chuẩn cho thành viên khi phát sinh sai lệch hoặc cấp quyền thủ công.

---

## 4. Các Quy Trình Nghiệp Vụ Cốt Lõi

### 1. Nhận Diện Booster Hợp Nhất (Unified Booster Resolution)
Một thành viên được hệ thống công nhận là Booster hợp lệ khi thỏa mãn **MỘT TRONG HAI** điều kiện:
1. `member.premiumSince != null`: Người dùng có boost thực tế trên Discord (hoạt động bình thường kể cả khi user boost trong thời gian bot offline).
2. `perk.boostCount > 0`: Người dùng được Administrator bảo chứng thủ công thông qua lệnh `/perk server_booster set_boost`.

### 2. Tự Động Hóa Màu Sắc (Zero-Touch Automation)
* Sử dụng cấu trúc mới nhất của Discord API v10 (`discord.js: 14.27.0`):
  * Màu đơn sắc: Gọi `role.edit({ colors: { primaryColor: hex1 } })` và cập nhật `roleColor = hex1, roleColor2 = null`.
  * Màu Gradient: Kiểm tra `guild.features.includes(GuildFeature.EnhancedRoleColors)`. Nếu đủ điều kiện, gọi `role.edit({ colors: { primaryColor: hex1, secondaryColor: hex2 } })` để biến đổi màu tức thì sau 0.5s.
* Khi người dùng đang sở hữu màu Gradient chuyển về màu đơn, hệ thống tự động reset `roleColor2 = null` để đảm bảo lệnh `role_view` không bị kẹt hiển thị mã màu thứ 2 cũ.

### 3. Vòng Đời Ân Hạn (Grace Period Lifecycle)
* **Kích hoạt:** Khi thành viên unboost hoàn toàn trên Discord (`GuildMemberUpdate`), role chuyển sang `status: 'GRACE_PERIOD'` với hạn định 7 ngày (`gracePeriodExpiresAt`).
* **Bảo lưu:** Role vẫn được giữ nguyên trên người dùng. Giao diện `/perk server_booster role_view` chuyển sang màu vàng cảnh báo kèm bộ đếm ngược thời gian hết hạn.
* **Khôi phục:** Nếu người dùng re-boost trong vòng 7 ngày, bot tự động xóa hạn ân hạn và đưa trạng thái về `ACTIVE`.
* **Thu hồi tự động:** Cron Job định kỳ mỗi 10 phút (`booster-cleanup.job.ts`) tự động quét và xóa Custom Role khỏi Discord nếu đã quá hạn 7 ngày, đồng thời reset `boostCount = 0`, `status: 'REVOKED'`.

### 4. Quy Trình Can Thiệp Quản Trị Đặc Biệt (Interactive Unboost Workflow)
Khi Administrator thực hiện `/perk server_booster set_boost user:<@User> count:0` đối với thành viên đang sở hữu Custom Role, Bot sẽ gửi Embed cảnh báo đi kèm **2 nút bấm tương tác**:
* **Nút 1: `Tiêu Chuẩn (7 Ngày Ân Hạn)` (Secondary):** Dành cho trường hợp điều chỉnh bình thường. Người dùng được hưởng trọn vẹn 7 ngày ân hạn để boost lại mà không mất role.
* **Nút 2: `Can Thiệp (Thu Hồi Ngay)` (Danger):** Dành cho trường hợp kỷ luật, gian lận, hoặc hủy quyền khẩn cấp. Bot lập tức xóa vĩnh viễn Custom Role trên server Discord và chuyển bản ghi về `REVOKED` ngay tức thì.
* **Bảo mật:** Nút bấm chỉ chấp nhận tương tác từ chính Quản trị viên đã khởi tạo lệnh.

---

## 5. Lịch Sử Phát Triển & Nhật Ký Phiên Bản (Changelog)

| Phiên bản | Nội dung triển khai chính |
| :--- | :--- |
| **`v0.2.0`** | Khởi tạo cấu trúc ban đầu của feature `booster/`, tạo bảng Database Prisma (`BoosterPerkConfig`, `CustomRolePerk`), các dịch vụ hierarchy, subcommands, và cronjob dọn dẹp. |
| **`v0.2.1` - `v0.2.2`** | Khắc phục vấn đề đồng bộ số lượt boost bằng lệnh quản trị `/perk server_booster set_boost` (chỉ dành cho `Administrator`), thiết lập Authoritative Baseline. |
| **`v0.2.3`** | Tái cấu trúc thư mục phân tầng thành `common/` và `booster/`. Bổ sung cảnh báo ân hạn trong `role_view` và reset `boostCount = 0` khi thu hồi role. |
| **`v0.2.4`** | Khắc phục lỗi lưu giữ mã màu gradient cũ (`roleColor2`) khi người dùng cấu hình lại Custom Role về màu đơn sắc. |
| **`v0.2.5`** | Tự động hóa hoàn toàn 100% phối màu gradient qua Discord API `EnhancedRoleColors`. Loại bỏ hoàn toàn hàng đợi duyệt thủ công. Xóa sạch 100% cảnh báo Deprecation của `discord.js: 14.27.0`. |
| **`v0.2.6`** | Hợp nhất cơ chế nhận diện Server Booster (**Unified Booster Resolution**), cho phép claim role và hiển thị trạng thái chính xác cho cả booster tự nhiên lẫn tài khoản test được Admin gán thủ công. |
| **`v0.2.7`** | Bổ sung quy trình unboost tương tác (**Interactive Unboost Workflow**) với 2 nút bấm: Tiêu Chuẩn (ân hạn 7 ngày) và Can Thiệp (xóa role tức thì) khi Admin đặt số boost về 0. |
| **`v0.2.8`** | Đồng bộ hóa toàn diện hệ thống: Xóa bỏ bảng và model `RoleUpdateQueue` khỏi database; bổ sung kiểm tra bắt buộc `color1` khi tạo gradient lần đầu; đồng bộ danh xưng trong `role_view` cho Staff; cập nhật chuẩn hóa kiến trúc tài liệu. |


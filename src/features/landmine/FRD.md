# ĐẶC TẢ YÊU CẦU TÍNH NĂNG (FEATURE REQUIREMENTS DOCUMENT - FRD)
## FEAT-08: LANDMINE CHAT ENGINE (MÌN CHAT & BẪY KÊNH THOẠI)

---

### 1. MỤC TIÊU & BỐI CẢNH SỬ DỤNG THỰC TẾ

* **Bối cảnh**: Để gia tăng độ tương tác và sự sôi nổi trong các kênh chat cộng đồng, server cần một cơ chế minigame mang tính "Russian Roulette" (Cò quay Nga) bất ngờ và kịch tính. Thành viên khi nhắn tin trong các kênh được chỉ định sẽ có xác suất ngẫu nhiên giẫm phải "mìn" và bị cấm chat (Discord Timeout) trong một khoảng thời gian nhất định.
* **Mục tiêu sản phẩm**:
  * **Tạo sự phấn khích & gắn kết (Engagement & Social Fun)**: Biến các kênh chat thông thường thành sàn đấu sống sót đầy tiếng cười và bất ngờ; tạo các câu chuyện bàn tán khi thành viên bị phạt.
  * **An toàn tài nguyên tính toán (Zero CPU Overhead)**: Giới hạn tỉ lệ cố định bằng giá trị phần trăm (Random tĩnh) và một thuật toán xổ số đặc biệt được tối ưu hóa sẵn, triệt tiêu hoàn toàn rủi ro ReDoS hoặc lạm dụng CPU.
  * **Tùy biến đa tầng linh hoạt (Multi-Module Architecture)**: Cho phép mỗi máy chủ quản lý danh mục tối đa **10 modules** (gồm **2 Default Modules**: M1 - Foundation & M2 - Advanced, và tối đa **8 Custom Modules**: M3 – M10) với phạm vi kênh (Channel Scope), vai trò miễn trừ (Role Scope) độc lập.
  * **Vinh danh & Bảng vàng (Dual-layer Leaderboards)**: Duy trì bảng xếp hạng riêng cho từng module và bảng tổng sắp toàn máy chủ, ghi nhận cả số lần bị phạt và số lần "Aura cao kháng mìn" với tùy chọn sắp xếp linh hoạt theo lượt dẫm hoặc thời gian phạt.
  * **Tối ưu trải nghiệm (Zero Spam DMs)**: **Tuyệt đối KHÔNG gửi tin nhắn riêng (DM)** cho thành viên khi bị timeout; toàn bộ tương tác hiển thị công khai trên kênh chat để giữ trọn vẹn không khí hào hứng chung.
  * **Chuẩn mực Đa ngôn ngữ (i18n Aware)**: Hỗ trợ ép ngôn ngữ mặc định per-guild (`vi` hoặc `en`) hoặc tự động phân giải theo ngôn ngữ ứng dụng của nạn nhân dẫm mìn.
  * **Sẵn sàng tích hợp Web Dashboard (Track W)**: Kiến trúc hỗ trợ cấu hình động qua Fastify REST API và giao diện Web SPA.

---

### 2. DANH SÁCH USER ROLES & QUYỀN HẠN

| Vai trò | Điều kiện & Phân quyền Discord | Quyền hạn trong tính năng |
| :--- | :--- | :--- |
| **Server Administrator** | **BẮT BUỘC có cờ quyền `PermissionFlagsBits.Administrator`** *(Cấm tuyệt đối `ManageGuild` hoặc các quyền quản trị cấp dưới)* | • Bật / Tắt từng module mìn (`toggle`).<br>• Cấu hình ngôn ngữ bắt buộc cho Embed nổ (`vi` / `en` / `auto`).<br>• Tạo mới (tối đa 8 module M3 – M10 vào các slot trống), chỉnh sửa hoặc xóa Custom Module (`create`, `edit`, `delete`).<br>• Cấu hình 2 module mặc định (`Foundation`, `Advanced`).<br>• Xem và reset số liệu bảng xếp hạng (`reset_stats`). |
| **Thành viên Server (@everyone)** | Mọi thành viên tham gia nhắn tin | • Nhắn tin trong các kênh có đặt bẫy và chịu xác suất kích nổ.<br>• Tra cứu danh sách các module mìn đang kích hoạt trong server (`/landmine list`).<br>• Tra cứu bảng xếp hạng cá nhân và toàn server (`/landmine leaderboard`). |
| **Thành viên Miễn trừ (Bypass / Immune)** | Có Role nằm trong Blacklist của module HOẶC sở hữu quyền Admin/Owner/Role cao hơn Bot | • Được miễn trừ hoàn toàn (không bao giờ dẫm mìn nếu thuộc Role Blacklist).<br>• Nếu là Admin giẫm mìn, kích hoạt cơ chế nổ thất bại ("Aura cao kháng mìn") và ghi nhận chỉ số danh dự trên Leaderboard. |

---

### 3. QUY TRÌNH & THUẬT TOÁN KÍCH NỔ (CORE ALGORITHMS & MECHANICS)

#### 3.1. Phân Loại Module & Giới Hạn Số Lượng
Mỗi máy chủ Discord được quản lý danh mục mìn gồm:
1. **Module Mặc Định 1 (`Foundation` - Bất biến thuật toán):**
   * Tỉ lệ tĩnh: Cố định **$0.8\%$**.
   * Thời gian phạt: Cố định **$1\text{ phút}$** ($60\text{s}$).
   * Mặc định ban đầu: **Tắt (`isEnabled: false`)**.
   * Có thể tùy biến: Channels, Roles, Toggles (Bật/Tắt, BXH, Auto-delete), Custom Messages.
2. **Module Mặc Định 2 (`Advanced` - Thuật toán động Chaos Mine):**
   * Thuật toán xổ số 2 tầng đặc biệt (xem mục 3.2).
   * Mặc định ban đầu: **Tắt (`isEnabled: false`)**.
   * Có thể tùy biến: Channels, Roles, Toggles, Custom Messages.
3. **Custom Modules (`M3` $\rightarrow$ `M10` - Tối đa 8 module tùy chỉnh):**
   * Mặc định ban đầu khi tạo: **Tắt (`isEnabled: false`)**.
   * Cấp phát tự động vào slot trống đầu tiên từ M3 đến M10 (tổng cộng tối đa 10 module trên server).
   * Quản trị viên tự do thiết lập tỉ lệ phần trăm tĩnh ($0.01\% - 100\%$) và thời gian timeout ($5\text{ giây} - 28\text{ ngày}$).
   * Tự do cấu hình toàn bộ phạm vi kênh, vai trò và thông điệp.

---

#### 3.2. Thuật Toán Xổ Số Động Đặc Biệt (`Landmine Advanced`)

Mỗi khi tin nhắn hợp lệ gửi vào kênh áp dụng:

```
[Tin nhắn gửi đến]
        ↓ (50% cơ hội tham gia xổ số)
[Quay Tỉ Lệ Tham Gia] ── (Trượt 50%) ──> [Bỏ qua, an toàn]
        ↓ (Trúng 50%)
[Quay Rate Multiplier (RM) ∈ {1, 2, 3}]
        ↓
[Tính Dải Xác Suất Tích Lũy (Cumulative Range Partition)]
  • Tier 1 (5m): Base 0.1% × RM  →  Range [0, Rate1)
  • Tier 2 (2m): Base 0.3% × RM  →  Range [Rate1, Rate1 + Rate2)
  • Tier 3 (1m): Base 1.0% × RM  →  Range [Rate1 + Rate2, Rate1 + Rate2 + Rate3)
        ↓
[Quay Số Ngẫu Nhiên R ∈ [0, 1)]
  ├── R < Rate1                        → Trúng Tier 1 (Base Duration = 5m)
  ├── Rate1 ≤ R < Rate1 + Rate2         → Trúng Tier 2 (Base Duration = 2m)
  ├── Rate1 + Rate2 ≤ R < Tổng Rate     → Trúng Tier 3 (Base Duration = 1m)
  └── R ≥ Tổng Rate                    → [Không trúng mìn, an toàn]
        ↓
[Quay Punishment Multiplier (PM) ∈ {1, 2, 3}]
        ↓
[Thời Gian Timeout Thực Tế = Base Duration × PM]
```

* **Nguyên tắc loại trừ lẫn nhau (Mutually Exclusive):**
  * Ba Tier được ánh xạ thành các đoạn liên tiếp không giao nhau trên trục số xác suất.
  * Không bao giờ xảy ra tình trạng nổ đồng thời 2 Tier trên cùng một tin nhắn.

---

#### 3.3. Bộ Lọc Phạm Vi & Điều Kiện Kích Hoạt (Scope Rules)

* **Bộ lọc Kênh (Channel Scope):**
  * `WHITELIST`: Mìn CHỈ phát nổ trong các kênh được liệt kê.
  * `BLACKLIST`: Mìn có hiệu lực trên TẤT CẢ các kênh của server, NGOẠI TRỪ các kênh bị chặn.
* **Bộ lọc Vai Trò (Role Scope):**
  * `BLACKLIST` (Mặc định - Role Miễn Trừ): Mọi thành viên đều có thể dẫm mìn, trừ những người sở hữu ít nhất một vai trò trong danh sách miễn trừ.
  * `WHITELIST` (Áp dụng riêng): Chỉ những thành viên có ít nhất một vai trò trong danh sách mới có thể dẫm mìn.
* **Điều Kiện Bỏ Qua Tự Động (Safety Bypass):**
  1. `message.author.bot === true` hoặc tin nhắn từ Webhook/Hệ thống $\rightarrow$ Bỏ qua.
  2. Thành viên đang trong trạng thái cấm chat (`member.isCommunicationDisabled()`) $\rightarrow$ Bỏ qua.
  3. Tin nhắn gửi trong DM hoặc guild chưa cấu hình bot $\rightarrow$ Bỏ qua.
* **Quy Tắc "First-Hit Stop" (Chạm Một Mìn Là Dừng):**
  * Nếu một kênh chat có nhiều module mìn đang cùng hoạt động (ví dụ cả `Foundation` / `M1` và `M3`):
  * Hệ thống duyệt qua các module theo thứ tự ưu tiên. Hễ người dùng giẫm trúng một quả mìn thì tiến hành xử lý timeout và **dừng ngay lập tức**, không duyệt tiếp các module sau trên cùng tin nhắn đó.

---

#### 3.4. Xử Lý Phân Cấp & Cơ Chế Kháng Mìn ("Aura Cao")

Khi một người dùng giẫm phải mìn:
* Bot tiến hành gọi Discord API: `member.timeout(durationMs, reason)`.
* **Quy tắc DM:** **Tuyệt đối KHÔNG gửi tin nhắn riêng (DM)** cho thành viên khi bị timeout.
* **Trường hợp 1 - Thành công:** Người dùng bị mute ngay lập tức. Ghi nhận số liệu `successCount += 1`, `totalTimeoutSeconds += durationMs / 1000`, gửi thông báo nổ thành công.
* **Trường hợp 2 - Thất bại do Quyền Hạn (Discord 403 Forbidden):**
  * Xảy ra khi nạn nhân là: Server Owner, Administrator, hoặc có Role cao hơn/ngang bằng Role của Bot.
  * Bot bắt lỗi an toàn (Zero Crash).
  * Ghi nhận số liệu kháng mìn `failedCount += 1` (không cộng thời gian phạt).
  * Gửi thông báo "Aura cao kháng mìn" theo mẫu cấu hình.

---

### 4. THIẾT KẾ EMBED THÔNG BÁO PHÁT NỔ & QUY CHUẨN ĐA NGÔN NGỮ (I18N)

#### 4.1. Chuỗi Phân Giải Ngôn Ngữ Embed (Locale Resolution Chain)
Ngôn ngữ hiển thị của Embed thông báo phát nổ được xác định theo chuỗi ưu tiên:
1. **Server Forced Locale:** Nếu Quản trị viên đã cấu hình ngôn ngữ bắt buộc cho server (`forcedLocale = 'vi'` hoặc `'en'`), Embed bắt buộc dùng ngôn ngữ đó.
2. **Victim Client Locale:** Nếu server để chế độ tự động (`forcedLocale = null`), ngôn ngữ Embed sẽ lấy theo ngôn ngữ ứng dụng Discord của nạn nhân dẫm mìn (`getUserLocale({ locale: victim.user.locale, guildId })`).
3. **Mặc định Hệ Thống (Fallback):** Tiếng Việt (`vi`).

#### 4.2. Cấu Trúc Embed Thông Báo
* **Màu sắc Embed:** Cố định `EmbedColor.ERROR` (`0xED4245`) cho nổ thành công, `EmbedColor.WARNING` (`0xFEE75C`) cho kháng mìn.
* **Tiêu đề (Title):**
  * Module Default 1 (M1): `💥 Landmine Foundation`
  * Module Default 2 (M2): `🎲 Landmine Advanced`
  * Custom Module (M3 – M10): `💣 Landmine M{id}` (ví dụ: `Landmine M3`, `Landmine M4`).
* **Nội dung (Description):**
  * Hỗ trợ placeholder `{user}` (hoặc `@user`) tự động thay thế bằng tag Discord `<@userId>`.
  * **Thông điệp Mặc Định (Default Messages - Tuân thủ i18n):**
    * *Tiếng Việt (`vi`):*
      * Nổ thành công: `"{user} đã dẫm mìn rồi. Hết thời ăn may rồi cưng, mời bạn nhận một vé timeout thẳng tiến vào ô mất lượt."`
      * Kháng mìn: `"{user} đã dẫm mìn rồi nhưng có vẻ người đặt mìn chưa kiểm tra hạn sử dụng."`
    * *Tiếng Anh (`en`):*
      * Nổ thành công: `"{user} stepped on a landmine! Your luck just ran out, enjoy your express ticket to timeout."`
      * Kháng mìn: `"{user} stepped on a landmine, but it seems the mine installer forgot to check the expiration date."`
  * **Thông điệp Tùy Chỉnh (Custom Messages):**
    * Nếu Admin đã tự nhập `successMessage` hoặc `failedMessage`, bot sẽ hiển thị nguyên văn chuỗi tùy chỉnh đó (không áp dụng dịch đè).
* **Hình ảnh (GIF):**
  * Sử dụng GIF vụ nổ mặc định chất lượng cao tích hợp sẵn trong bot.
* **Chân trang (Footer):**
  * *Module tĩnh:* `Tỉ lệ / Rate: {rate}% • Hình phạt / Punishment: {duration}`
  * *Module động:* `Xổ số / Roll: RM x{rm} (Tier {tier}: {baseRate}%) • PM x{pm} • Phạt / Punishment: {duration}`
* **Thời gian tự hủy (Auto-delete):**
  * Nếu toggle `autoDeleteNotification: true`, bot tự động xóa tin nhắn Embed sau đúng **15 giây**.

---

### 5. CẤU TRÚC LỆNH SLASH COMMANDS (`/landmine`)

*(Toàn bộ các lệnh quản trị đều yêu cầu quyền `PermissionFlagsBits.Administrator` tuyệt đối)*

```text
/landmine
├── list                                      (Xem danh sách module mìn trong server, trạng thái, note, rate)
├── leaderboard                               (Xem bảng xếp hạng dẫm mìn)
│   ├── [module: server | foundation | advanced | M1..M10] (Mặc định: server)
│   └── [sort: count | duration]              (count: theo số lần; duration: theo thời gian)
│
├── toggle <module> <state: true/false>       (Admin: Bật hoặc tắt nhanh một module)
├── create <rate> <duration> [note]           (Admin: Tạo custom module mới, tự động cấp mã M3..M10 còn trống)
├── delete <module: M3..M10>                  (Admin: Xóa custom module - chỉ áp dụng cho M3..M10, cấm xóa M1 và M2)
│
├── edit <module>                             (Admin: Mở lệnh cấu hình chi tiết cho module)
│   ├── note [text]
│   ├── rate [percent]                        (Chỉ áp dụng cho custom module)
│   ├── duration [seconds/minutes]            (Chỉ áp dụng cho custom module)
│   ├── channel_scope [whitelist | blacklist]
│   ├── role_scope [whitelist | blacklist]
│   ├── leaderboard [true | false]            (Bật/tắt tính vào leaderboard chung)
│   ├── autodelete [true | false]             (Bật/tắt tự xóa thông báo sau 15s)
│   ├── success_msg [text]
│   └── failed_msg [text]
│
├── channels <module> <mode: ALL|WHITELIST|BLACKLIST> [channels] (Admin: Cấu hình phạm vi kênh áp dụng)
├── roles <module> <mode: ALL|WHITELIST|BLACKLIST> [roles]       (Admin: Cấu hình phạm vi vai trò áp dụng/miễn trừ)
├── set_locale <locale: vi | en | auto>       (Admin: Ép ngôn ngữ hiển thị Embed thông báo per-guild)
└── reset_stats <module: all | foundation | advanced | M1..M10> (Admin: Xóa dữ liệu BXH khi cần làm mới mùa giải)
```

---

### 6. MÔ HÌNH DỮ LIỆU PRISMA (DATABASE SCHEMA SPECIFICATION)

Cấu trúc bảng được đặt tại `src/shared/db/schema.prisma` trong Domain `LANDMINE CHAT ENGINE`:

```prisma
// ==========================================
// DOMAIN: LANDMINE CHAT ENGINE (FEAT-08)
// ==========================================

model LandmineGuildConfig {
  guildId        String   @id @map("guild_id")
  forcedLocale   String?  @map("forced_locale") // "vi" | "en" | null (null = auto theo victim)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("landmine_guild_configs")
}

model LandmineModule {
  id                         String   @id @default(cuid())
  guildId                    String   @map("guild_id")
  moduleKey                  String   @map("module_key") // "foundation" | "advanced" | "m3"..."m10"
  isDefault                  Boolean  @default(false) @map("is_default")
  isEnabled                  Boolean  @default(false) @map("is_enabled") // Mặc định tắt hết
  note                       String?  @map("note") // Tên gợi nhớ nội bộ

  // Thuật toán & Tỉ lệ
  algorithmType              String   @default("STATIC") @map("algorithm_type") // "STATIC" | "DYNAMIC_CHAOS"
  staticRate                 Float    @default(0.008) @map("static_rate") // 0.8% = 0.008
  punishmentDurationSeconds  Int      @default(60) @map("punishment_duration_seconds") // 1 phút = 60s

  // Phạm vi Kênh & Vai Trò
  channelScopeType           String   @default("WHITELIST") @map("channel_scope_type") // "WHITELIST" | "BLACKLIST"
  channelIds                 String   @default("[]") @map("channel_ids") // JSON array string of channel snowflakes
  roleScopeType              String   @default("BLACKLIST") @map("role_scope_type") // "WHITELIST" | "BLACKLIST"
  roleIds                    String   @default("[]") @map("role_ids") // JSON array string of role snowflakes

  // Tùy chọn Vận hành & Hiển thị
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
  id                    String   @id @default(cuid())
  guildId               String   @map("guild_id")
  moduleKey             String   @map("module_key") // "foundation" | "advanced" | "m3"..."m10"
  userId                String   @map("user_id")

  // Bộ đếm thống kê
  totalSteps            Int      @default(0) @map("total_steps") // Tổng số lần dẫm mìn
  successCount          Int      @default(0) @map("success_count") // Nổ thành công (bị mute)
  failedCount           Int      @default(0) @map("failed_count") // Kháng mìn (Aura cao)
  totalTimeoutSeconds   BigInt   @default(0) @map("total_timeout_seconds") // Tổng thời gian đã chịu phạt

  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@unique([guildId, moduleKey, userId])
  @@index([guildId, totalSteps])
  @@index([guildId, totalTimeoutSeconds])
  @@index([guildId, userId])
  @@map("landmine_records")
}
```

---

### 7. BẢNG XẾP HẠNG & TIÊU CHÍ TỔNG SẮP (LEADERBOARD SYSTEM)

* **Phân Cấp BXH:**
  1. **BXH Module (`/landmine leaderboard module:foundation` hoặc `advanced` / `M3`..`M10`):** Tra cứu bảng vàng của riêng module đó.
  2. **BXH Toàn Server (`/landmine leaderboard module:server`):** Tổng hợp dữ liệu từ tất cả các module có bật cờ `includeInServerLeaderboard: true`.
* **Tiêu Chuẩn Xếp Hạng & Sắp Xếp Đa Chiều:**
  * **Option `sort: count` (Mặc định):**
    * Ưu tiên 1 (Chính): Giảm dần theo **Tổng số lần dẫm mìn** (`totalSteps DESC`).
    * Ưu tiên 2 (Phụ - Khi trùng số lần): Giảm dần theo **Tổng thời gian cấm chat** (`totalTimeoutSeconds DESC`).
  * **Option `sort: duration`:**
    * Ưu tiên 1 (Chính): Giảm dần theo **Tổng thời gian cấm chat** (`totalTimeoutSeconds DESC`).
    * Ưu tiên 2 (Phụ - Khi trùng thời gian): Giảm dần theo **Tổng số lần dẫm mìn** (`totalSteps DESC`).
* **Trường Thông Tin Hiển Thị:**
  * Thứ hạng (`#1`, `#2`, `#3` kèm huy hiệu 🥇, 🥈, 🥉).
  * Tên thành viên `<@userId>`.
  * Tổng lần dẫm: `X lần` (Thành công: `Y` | Aura cao: `Z`).
  * Tổng thời gian tĩnh tâm: Chuyển đổi định dạng thân thiện (`ví dụ: 1 giờ 15 phút` / `1h 15m`).

---

### 8. HIỆU NĂNG, AN TOÀN BỘ NHỚ & GIỚI HẠN DISCORD API

1. **In-Memory Cache (Zero DB Query per Message):**
   * Lớp `LandmineService` duy trì một `Map<guildId, ActiveLandmineConfig[]>` trên RAM.
   * Khi khởi động bot (`init()`), bot nạp sẵn cấu hình các module đang bật (`isEnabled: true`) vào RAM.
   * Sự kiện `MessageCreate` chỉ đọc dữ liệu từ RAM để kiểm tra kênh, role và random.
   * Bất cứ khi nào Admin thay đổi cấu hình qua lệnh hoặc REST API, service sẽ đồng bộ vào DB đồng thời làm mới cache trên RAM tức thì.
2. **Discord API Resilience & Rate Limits:**
   * Việc thực thi `member.timeout()` được bọc trong khối Error Boundary an toàn.
   * Không gửi tin nhắn DM khi timeout.
   * Nếu bot bị thiếu quyền `ModerateMembers`, bot phát cảnh báo lên log qua `logger.warn` và không làm crash tiến trình.
3. **Graceful Deletion:**
   * Tác vụ tự động xóa tin nhắn sau 15 giây sử dụng `setTimeout` bọc trong `catch` an toàn, phòng trường hợp tin nhắn đã bị xóa thủ công trước đó.

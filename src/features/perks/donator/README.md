# FEAT-02: Perks Management - Donator (`src/features/perks/donator`)

Tài liệu đặc tả kiến trúc kỹ thuật, cẩm nang vận hành và nhật ký phát triển của hệ thống quản lý quyền lợi dành cho **Donator** (Người ủng hộ) thuộc bot **Lora**.

> 📖 *Tài liệu Đặc Tả Yêu Cầu Tính Năng (FRD), User Stories & Acceptance Criteria chi tiết:* [`FRD.md`](./FRD.md)

---

## 1. Tổng Quan & Phạm Vi Nghiệp Vụ

Lát cắt `donator/` nằm trong tính năng `src/features/perks/`, được thiết kế theo mô hình **Vertical Slice Architecture**, độc lập hoàn toàn với lát cắt `booster/`:

* **Cơ chế Quỹ Thời Gian (Time-Bank)**: Toàn bộ đóng góp được quy đổi thành đơn vị giây/giờ lưu trong Database.
* **Đòn bẩy Thưởng Kép (Hybrid Multipliers)**:
  * **Volume Bonus**: Đóng góp 1 lần càng lớn thì tỷ lệ cộng thêm càng cao ($10\% - 35\%$).
  * **Weekly Streak Bonus**: Duy trì ủng hộ tối thiểu $50.000\text{đ}$ mỗi tuần dương lịch để tích lũy chuỗi vinh danh (tối đa `MAX_STREAK = 100` tuần, trần thưởng kinh tế $+20\%$ tại mốc $\ge 4$ tuần).
* **Tự Chủ Trang Bị (Member Autonomy)**:
  * **Đang trang bị (`isEquipped: true`)**: Role Donator hiển thị trên server, tiêu hao ở tốc độ chuẩn **$1.0x$**.
  * **Cất vào kho (`isEquipped: false`)**: Role được gỡ khỏi profile, tốc độ tiêu hao chậm gấp 5 lần (**$0.2x$**).
* **Bảo Vệ Đóng Băng (State Freeze)**: Khi tính năng bị tắt bởi Administrator, toàn bộ quỹ credit dừng tiêu hao (**$0.0x$**).
* **Chuẩn Hóa Múi Giờ**: Toàn bộ chu kỳ tuần tính toán được neo cứng theo giờ Việt Nam (**UTC+7 / `Asia/Ho_Chi_Minh`**).

---

## 2. Yêu Cầu Tiên Quyết Phía Máy Chủ Discord (Prerequisites)

Để hệ thống Donator vận hành an toàn và chính xác, máy chủ cần đảm bảo 3 điều kiện:

### 1. Phân Quyền Quản Trị Tuyệt Đối (Administrator Only)
* **Quy tắc bắt buộc:** Mọi thao tác cấu hình (`config`, `toggle`) và can thiệp tài chính (`add`, `adjust`, `set_streak`) **chỉ cho phép thành viên có quyền `Administrator`**.
* Các quyền như `ManageGuild`, `ManageRoles` đều bị chặn hoàn toàn để phòng ngừa lạm quyền.

### 2. Vị Trí Phân Cấp Role Của Bot (Role Hierarchy Guard)
* Role cao nhất của Bot phải được đặt **nằm trên** Role Donator trong Discord `Server Settings` -> `Roles`.
* Khi Administrator gán Role qua lệnh cấu hình, Bot sẽ tự động kiểm tra vị trí role; nếu Bot nằm dưới, lệnh sẽ bị từ chối và cảnh báo kèm hướng dẫn.

### 3. Kênh Thông Báo Dự Phòng (Optional Notification Channel)
* Khuyến nghị cấu hình kênh thông báo qua `/perk donator config action:set_channel`. Khi Bot cần gửi thông báo cạn quỹ/hết hạn cho thành viên nhưng thành viên chặn tin nhắn riêng (DM), Bot sẽ gửi ping nhắc nhở tại kênh này.

---

## 3. Danh Mục Lệnh Tương Tác (Commands Reference)

Do giới hạn kiến trúc Discord API (Root Command $\rightarrow$ Subcommand Group $\rightarrow$ Subcommand), hệ thống Donator được tổ chức theo nhóm `/perk donator <subcommand>`:

### Nhóm Lệnh Chung (`src/features/perks/common/`)
* `/perk list`: Hiển thị danh mục tổng quan tất cả các gói quyền lợi của server (Booster, Donator).
* `/perk status`: Xem bảng trạng thái tổng hợp các quyền lợi mà bản thân đang sở hữu.

### Nhóm Lệnh Thành Viên (`/perk donator`)
* `/perk donator info`: Xem biểu phí quy đổi cơ sở, bảng thưởng Volume, bảng thưởng Streak và hướng dẫn sử dụng kho.
* `/perk donator status [member:<@User>]`:
  * *Thành viên*: Xem số dư thời gian quy đổi (ngày, giờ), trạng thái trang bị ($1.0x$ hay $0.2x$), chuỗi streak hiện tại và ngày dự kiến cạn quỹ.
  * *Administrator*: Có quyền truyền option `member` để tra cứu chi tiết thông số, tổng số tiền ủng hộ (`totalDonated`) và lịch sử giao dịch gần nhất của người khác.
* `/perk donator equip`: Lấy Role Donator ra đeo (kích hoạt tốc độ tiêu hao $1.0x$).
* `/perk donator unequip`: Cất Role Donator vào kho tiết kiệm (kích hoạt tốc độ $0.2x$).

### Nhóm Lệnh Quản Trị Viên (`/perk donator` - Yêu cầu quyền `Administrator` tuyệt đối)
* `/perk donator add user:<@User> amount:<number> [note:<string>]`: Ghi nhận khoản ủng hộ (VNĐ $\ge 1$), áp dụng công thức thưởng kép, cộng credit và tự động cấp role trang bị ($1.0x$).
* `/perk donator adjust user:<@User> seconds:<number> [reason:<string>]`: Điều chỉnh tăng/giảm thời gian credit khi có sự cố phát sinh hoặc hoàn tiền (+ để cộng, - để trừ credit).
* `/perk donator set_streak user:<@User> streak:<0-100>`: Điều chỉnh thủ công bậc chuỗi tuần (Streak) cho thành viên (tối thiểu 0, tối đa 100 theo `WeeklyStreakRule.MAX_STREAK`).
* `/perk donator config action:<view | set_role | set_channel> [role:<@Role>] [channel:<#Channel>]`: Cấu hình hệ thống Donator Perk máy chủ:
  * `action: view`: Hiển thị toàn bộ thông số cấu hình hiện tại của máy chủ.
  * `action: set_role role:<@Role>`: Thiết lập role trao quyền lợi Donator (kèm kiểm tra Bot Role Hierarchy).
  * `action: set_channel [channel:<#Channel>]`: Thiết lập hoặc xóa kênh thông báo công khai (chấp nhận GuildText & GuildAnnouncement; bỏ trống option `channel` để xóa cấu hình kênh).
* `/perk donator toggle state:<true | false>`: Bật hoặc tắt tính năng Donator Perk (kèm đóng băng thời gian $0.0x$ và thu hồi role tạm thời khi tắt).

---

## 4. Các Quy Trình Nghiệp Vụ Cốt Lõi

### 1. Cơ Chế Tính Toán Lười (Lazy Evaluation Engine) & An Toàn Bộ Nhớ (Read-Only Safety)
Thay vì sử dụng Cron Job quét liên tục từng giây (gây nghẽn tài nguyên CPU và khóa SQLite), hệ thống áp dụng cơ chế đánh giá lười:
* Mỗi khi có tương tác, hệ thống tính toán:
  $$\Delta t = \text{now} - \text{lastDeductedAt}$$
  $$\text{Consumed} = \Delta t \times \text{CurrentBurnRate} \quad (\text{với } 1.0x, 0.2x \text{ hoặc } 0.0x)$$
  $$\text{creditSeconds} = \max(0, \text{creditSeconds} - \text{Consumed})$$
* **Quy tắc an toàn bộ nhớ (In-Memory Safe Read-Only):**
  * Hàm `getAccountStatus(guildId, userId)` được thiết kế **thuần túy in-memory** (`evaluateAccountCredit` với `commit = false`). Khi người dùng hoặc Admin kiểm tra trạng thái qua `/perk status` hoặc `/perk donator status`, hệ thống **TUYỆT ĐỐI KHÔNG ghi hoặc update Database**, bảo đảm tốc độ phản hồi cực nhanh và triệt tiêu nguy cơ tranh chấp khóa ghi SQLite.
  * Thao tác chốt nợ và cập nhật Database (`commit = true`) chỉ diễn ra khi có sự kiện thay đổi trạng thái thực sự: đeo role (`equip`), cất kho (`unequip`), nạp tiền (`add`), điều chỉnh (`adjust`), bật/tắt (`toggle`), thành viên rời server (`guildMemberRemove`), hoặc khi cron job dọn dẹp quét qua.

### 2. Thuật Toán Thưởng Kép & Tự Động Kích Hoạt
* Khi Admin thực hiện `/perk donator add`:
  * Tính toán tỷ lệ thưởng theo số tiền nạp đơn lẻ (Volume Bonus: $10\% - 35\%$).
  * Xác định bậc chuỗi tuần hiện tại để áp dụng Streak Bonus: $+0\%$ (1 tuần), $+5\%$ (2 tuần), $+10\%$ (3 tuần), $+20\%$ ($\ge 4$ tuần).
  * Quy đổi thành số giây credit nạp vào tài khoản.
  * Tự động gán Role trên Discord và kích hoạt `isEquipped = true` ($1.0x$) ngay lập tức để mang lại trải nghiệm tức thì.
  * Tự động gửi DM chúc mừng, cảm ơn và bảng chi tiết quyền lợi cho người dùng.

### 3. Vòng Đời Chuỗi Tuần Dương Lịch (UTC+7) & Suy Giảm Mềm (Soft Decay)
* Toàn bộ phép tính chu kỳ tuần được neo cứng theo **UTC+7 / `Asia/Ho_Chi_Minh`** (bắt đầu từ 00:00 Thứ Hai đến 23:59 Chủ Nhật).
* Nếu tích lũy trong tuần đạt $\ge 50.000\text{đ}$: Tăng 1 bậc streak (`Math.min(effectiveStreak + 1, WeeklyStreakRule.MAX_STREAK)`).
  * **Bộ đếm vinh danh:** Tiếp tục tăng lũy tiến lên đến tối đa **`MAX_STREAK = 100`** tuần nhằm ghi nhận lòng trung thành lâu dài của Donator.
  * **Trần thưởng kinh tế:** Được neo cố định tại mốc $\ge 4$ tuần (`MAX_BONUS_STREAK_TIER = 4`) với mức thưởng tối đa $+20\%$ credit (các tuần từ 4 đến 100 đều hưởng trọn vẹn $+20\%$).
* **Cơ chế suy giảm mềm (Soft Decay):**
  * Cron Job chạy lúc `00:00 Thứ Hai` UTC+7: Quét các tài khoản không đạt đủ mốc $50.000\text{đ}$ trong tuần vừa kết thúc $\rightarrow$ Chỉ giảm 1 bậc streak (`streak = max(0, streak - 1)`), tuyệt đối không reset về 0, giúp giảm thiểu tâm lý tiếc nuối và khuyến khích thành viên quay lại ủng hộ.

### 4. Thu Hồi Tự Động & Xử Lý Chặn DM
* Cron Job `donator-cleanup.job.ts` quét định kỳ mỗi 10 phút:
  * Phát hiện các tài khoản có `creditSeconds <= 0` và đang trang bị (`isEquipped: true`).
  * Tự động gỡ Role Donator khỏi thành viên trên Discord.
  * Chuyển trạng thái `isEquipped = false` và chốt `creditSeconds = 0`.
  * Ghi nhận transaction log với action `AUTO_REVOKE`.
  * Gửi tin nhắn DM cảm ơn và hướng dẫn nạp duy trì chuỗi streak. Nếu gặp mã lỗi Discord `50007 (Cannot send messages to this user)`, bot ghi nhận warning log an toàn và gửi thông báo thay thế tại kênh thông báo công khai (`notificationChannelId`) nếu đã được cấu hình.

### 5. Sự Kiện Gateway & Tự Động Cất Kho Khi Rời Server
* **Tệp tin:** `src/features/perks/donator/events/donator-leave.event.ts`
* **Sự kiện:** Lắng nghe Discord Gateway `Events.GuildMemberRemove`.
* **Cơ chế bảo lưu:** Khi một Donator rời khỏi server trong khi vẫn còn credit:
  * Hệ thống tự động tính toán thời gian đã trôi qua và chốt nợ ở tốc độ $1.0x$.
  * Tự động chuyển trạng thái `isEquipped = false` để kích hoạt tốc độ cất kho **$0.2x$** (tiêu hao chậm gấp 5 lần).
  * Giúp bảo lưu tối đa quỹ thời gian cho thành viên nếu họ quay lại server trong tương lai.

### 6. Danh Sách Scheduled Jobs Chạy Ngầm (Cron Jobs)
* **`donator-cleanup.job.ts` (`*/10 * * * *`)**: Quét dọn role Donator cạn quỹ mỗi 10 phút một lần, hỗ trợ xử lý lỗi DM 50007 an toàn.
* **`donator-decay.job.ts` (`0 0 * * 1`)**: Chạy lúc 00:00 Thứ Hai hàng tuần (UTC+7) để thực thi quy tắc suy giảm mềm chuỗi tuần (-1 streak) và đặt lại `currentWeekTotalVnd = 0`.

---

## 5. Bản Vẽ Cơ Sở Dữ Liệu (Prisma Schema)

```prisma
// ==========================================
// DOMAIN: PERKS MANAGEMENT - DONATOR
// ==========================================

model DonatorPerkConfig {
  guildId               String   @id
  isEnabled             Boolean  @default(false)
  donatorRoleId         String?
  notificationChannelId String?
  baseBenchmarkVnd      Int      @default(200000)
  baseBenchmarkDays     Int      @default(30)
  weeklyMinVnd          Int      @default(50000)
  idleBurnRate          Float    @default(0.2)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("donator_perk_configs")
}

model DonatorAccount {
  id                  String    @id @default(cuid())
  guildId             String
  userId              String
  creditSeconds       Float     @default(0)
  isEquipped          Boolean   @default(true)
  streak              Int       @default(0)
  currentWeekTotalVnd Int       @default(0)
  totalDonated        BigInt    @default(0)
  lastDeductedAt      DateTime  @default(now())
  lastActiveWeekStart DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@unique([guildId, userId])
  @@index([guildId, isEquipped])
  @@map("donator_accounts")
}

model DonatorTransaction {
  id                 String   @id @default(cuid())
  guildId            String
  userId             String
  amountVnd          Int
  bonusVolumePercent Float    @default(0)
  bonusStreakPercent Float    @default(0)
  creditSecondsAdded Float
  actionType         String
  note               String?
  createdBy          String
  createdAt          DateTime @default(now())

  @@index([guildId, userId])
  @@map("donator_transactions")
}
```

---

## 6. Lịch Sử Phát Triển & Nhật Ký Phiên Bản (Changelog)

| Phiên bản | Nội dung triển khai chính |
| :--- | :--- |
| **`v0.3.0`** *(Hoàn thành)* | • Hoàn thiện tài liệu Đặc tả Yêu cầu Tính năng ([`FRD.md`](./FRD.md)) và Kiến trúc Kỹ thuật.<br>• Xác định mô hình Quỹ Thời Gian (Time-Bank), Tỷ lệ $0.2x$ khi cất kho, và Đóng băng $0.0x$ khi tắt tính năng.<br>• Thiết lập công thức Đòn bẩy Thưởng Kép (Volume Bonus + Weekly Streak Bonus) neo múi giờ UTC+7.<br>• Thiết kế cấu trúc lệnh `/perk donator` chuẩn phân quyền tuyệt đối `Administrator`.<br>• Triển khai bộ tiện ích múi giờ UTC+7 & định dạng (`donator.utils.ts`).<br>• Xây dựng tầng Service nghiệp vụ trung tâm (`donator-perk.service.ts`) hỗ trợ Lazy Evaluation in-memory, chốt nợ credit, quản trị chu kỳ tuần và xử lý an toàn lỗi Discord API (50007, 50013).<br>• Khởi tạo 2 Cron Jobs tự động: `donator-cleanup.job.ts` (quét dọn role cạn quỹ mỗi 10 phút) và `donator-decay.job.ts` (suy giảm mềm chuỗi streak lúc 00:00 Thứ Hai UTC+7).<br>• Lắng nghe sự kiện rời máy chủ Gateway (`donator-leave.event.ts`) để tự động chuyển trạng thái cất kho 0.2x bảo lưu quyền lợi.<br>• Xây dựng từ điển bản địa hóa song ngữ `vi`/`en` (`donator.locale.ts`).<br>• Triển khai 9 subcommands độc lập (`donator-info`, `donator-status`, `donator-equip`, `donator-unequip`, `donator-add`, `donator-adjust`, `donator-setstreak`, `donator-config`, `donator-toggle`).<br>• Tích hợp Subcommand Group `donator` vào Root Command `/perk` (`perks.command.ts`).<br>• Cập nhật lệnh chung `/perk list` và `/perk status` đồng bộ hài hòa cả Booster và Donator. |

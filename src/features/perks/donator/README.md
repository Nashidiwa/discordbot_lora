# FEAT-02: Perks Management - Donator (`src/features/perks/donator`)

Tài liệu đặc tả kiến trúc kỹ thuật, cẩm nang vận hành và nhật ký phát triển của hệ thống quản lý quyền lợi dành cho **Donator** (Người ủng hộ) thuộc bot **Lora**.

> 📖 *Tài liệu Đặc Tả Yêu Cầu Tính Năng (FRD), User Stories & Acceptance Criteria chi tiết:* [`FRD.md`](./FRD.md)

---

## 1. Tổng Quan & Phạm Vi Nghiệp Vụ

Lát cắt `donator/` nằm trong tính năng `src/features/perks/`, được thiết kế theo mô hình **Vertical Slice Architecture**, độc lập hoàn toàn với lát cắt `booster/`:

* **Cơ chế Quỹ Thời Gian (Time-Bank)**: Toàn bộ đóng góp được quy đổi thành đơn vị giây/giờ lưu trong Database.
* **Đòn bẩy Thưởng Kép (Hybrid Multipliers)**:
  * **Volume Bonus**: Đóng góp 1 lần càng lớn thì tỷ lệ cộng thêm càng cao ($10\% - 35\%$).
  * **Weekly Streak Bonus**: Duy trì ủng hộ tối thiểu $50.000\text{đ}$ mỗi tuần dương lịch để tích lũy chuỗi ($+5\% - +20\%$).
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
* Khuyến nghị cấu hình kênh thông báo qua `/perk donator config set_channel`. Khi Bot cần gửi thông báo cạn quỹ/hết hạn cho thành viên nhưng thành viên chặn tin nhắn riêng (DM), Bot sẽ gửi ping nhắc nhở tại kênh này.

---

## 3. Danh Mục Lệnh Tương Tác (Commands Reference)

### Nhóm Lệnh Chung (`src/features/perks/common/`)
* `/perk list`: Hiển thị danh mục tổng quan tất cả các gói quyền lợi của server (Booster, Donator).
* `/perk status`: Xem bảng trạng thái tổng hợp các quyền lợi mà bản thân đang sở hữu.

### Nhóm Lệnh Thành Viên (`/perk donator`)
* `/perk donator info`: Xem biểu phí quy đổi cơ sở, bảng thưởng Volume, bảng thưởng Streak và hướng dẫn sử dụng kho.
* `/perk donator status [member]`:
  * *Thành viên*: Xem số dư thời gian quy đổi, trạng thái trang bị ($1.0x$ hay $0.2x$), chuỗi streak hiện tại và dự kiến thời điểm hết hạn.
  * *Administrator*: Tra cứu chi tiết thông số và lịch sử đóng góp của thành viên được chỉ định (`member`).
* `/perk donator equip`: Lấy Role Donator ra đeo (kích hoạt tốc độ $1.0x$).
* `/perk donator unequip`: Cất Role Donator vào kho tiết kiệm (kích hoạt tốc độ $0.2x$).

### Nhóm Lệnh Quản Trị Viên (`/perk donator` - Yêu cầu `Administrator`)
* `/perk donator add user:<@User> amount:<number> [note]`: Ghi nhận khoản ủng hộ, áp dụng công thức thưởng kép, cộng credit và tự động cấp role.
* `/perk donator adjust user:<@User> seconds:<number> [reason]`: Điều chỉnh tăng/giảm thời gian credit khi có sự cố phát sinh hoặc hoàn tiền.
* `/perk donator set_streak user:<@User> streak:<number>`: Điều chỉnh thủ công bậc streak cho thành viên.
* `/perk donator config view`: Hiển thị toàn bộ thông số cấu hình của máy chủ.
* `/perk donator config set_role role:<@Role>`: Thiết lập role trao quyền lợi Donator (kèm kiểm tra Role Hierarchy).
* `/perk donator config set_channel [channel]`: Thiết lập hoặc xóa kênh thông báo công khai.
* `/perk donator toggle state:<on/off>`: Bật hoặc tắt tính năng Donator Perk (kèm đóng băng thời gian $0.0x$ khi tắt).

---

## 4. Các Quy Trình Nghiệp Vụ Cốt Lõi

### 1. Cơ Chế Tính Toán Lười (Lazy Evaluation Engine)
Thay vì sử dụng Cron Job quét liên tục từng giây (gây nghẽn tài nguyên), hệ thống áp dụng cơ chế đánh giá lười:
* Mỗi khi có tương tác (User gõ lệnh, Admin nạp tiền, hoặc Cron Job dọn dẹp quét qua), hệ thống tính toán:
  $$\Delta t = \text{now} - \text{lastDeductedAt}$$
  $$\text{Consumed} = \Delta t \times \text{CurrentBurnRate} \quad (\text{với } 1.0x \text{ hoặc } 0.2x)$$
  $$\text{creditSeconds} = \max(0, \text{creditSeconds} - \text{Consumed})$$
  $$\text{lastDeductedAt} = \text{now}$$

### 2. Thuật Toán Thưởng Kép & Tự Động Kích Hoạt
* Khi Admin thực hiện `/perk donator add`:
  * Tính toán tỷ lệ thưởng theo số tiền (Volume Bonus) và bậc chuỗi tuần hiện tại (Streak Bonus).
  * Quy đổi thành số giây credit nạp vào tài khoản.
  * Tự động gán Role trên Discord và kích hoạt `isEquipped = true` ($1.0x$) ngay lập tức để mang lại trải nghiệm tức thì.
  * Tự động gửi DM chúc mừng, cảm ơn và bảng chi tiết quyền lợi cho người dùng.

### 3. Vòng Đời Chuỗi Tuần Dương Lịch & Suy Giảm Mềm (Soft Decay)
* Chu kỳ tuần được tính theo **UTC+7** (00:00 Thứ Hai đến 23:59 Chủ Nhật).
* Nếu tích lũy trong tuần đạt $\ge 50.000\text{đ}$: Tăng 1 bậc streak (tối đa 4 tuần).
* Cron Job chạy lúc `00:00 Thứ Hai`: Quét các user không đạt đủ mốc $50.000\text{đ}$ trong tuần vừa kết thúc $\rightarrow$ Giảm 1 bậc streak (`streak = max(0, streak - 1)`).

### 4. Thu Hồi Tự Động & Xử Lý Chặn DM
* Cron Job quét định kỳ các tài khoản có `creditSeconds <= 0` và `isEquipped: true`:
  * Tự động gỡ Role Donator khỏi thành viên.
  * Chuyển trạng thái `isEquipped = false`.
  * Gửi tin nhắn DM cảm ơn và hướng dẫn nạp duy trì. Nếu gặp mã lỗi Discord `50007 (Cannot send messages to this user)`, bot ghi nhận warning log và phát tín hiệu đến kênh thông báo đã cấu hình.

---

## 5. Bản Vẽ Cơ Sở Dữ Liệu (Prisma Schema Preview)

```prisma
// ==========================================
// DOMAIN: PERKS MANAGEMENT - DONATOR
// ==========================================

model DonatorPerkConfig {
  guildId               String   @id
  isEnabled             Boolean  @default(false)
  roleId                String?
  benchmarkAmount       Int      @default(200000)
  benchmarkDays         Int      @default(30)
  weeklyMinAmount       Int      @default(50000)
  idleBurnRate          Float    @default(0.2)
  notificationChannelId String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("donator_perk_configs")
}

model DonatorPerk {
  id                   String    @id @default(cuid())
  guildId              String
  userId               String
  creditSeconds        Float     @default(0)
  isEquipped           Boolean   @default(true)
  currentStreak        Int       @default(0)
  weeklyDonatedAmount  Int       @default(0)
  currentWeekStart     DateTime?
  lastDeductedAt       DateTime  @default(now())
  totalDonated         BigInt    @default(0)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@unique([guildId, userId])
  @@index([guildId, isEquipped])
  @@map("donator_perks")
}

model DonatorTransaction {
  id                 String   @id @default(cuid())
  guildId            String
  userId             String
  adminId            String
  amount             Int
  bonusVolumePercent Float    @default(0)
  bonusStreakPercent Float    @default(0)
  creditAddedSeconds Float
  note               String?
  createdAt          DateTime @default(now())

  @@index([guildId, userId])
  @@map("donator_transactions")
}
```

---

## 6. Lịch Sử Phát Triển & Nhật Ký Phiên Bản (Changelog)

| Phiên bản | Nội dung triển khai chính |
| :--- | :--- |
| **`v0.3.0`** *(Khởi tạo)* | • Hoàn thiện tài liệu Đặc tả Yêu cầu Tính năng ([`FRD.md`](./FRD.md)) và Kiến trúc Kỹ thuật.<br>• Xác định mô hình Quỹ Thời Gian (Time-Bank), Tỷ lệ $0.2x$ khi cất kho, và Đóng băng $0.0x$ khi tắt tính năng.<br>• Thiết lập công thức Đòn bẩy Thưởng Kép (Volume Bonus + Weekly Streak Bonus) neo múi giờ UTC+7.<br>• Thiết kế cấu trúc lệnh `/perk donator` chuẩn phân quyền tuyệt đối `Administrator`. |

# ĐẶC TẢ YÊU CẦU TÍNH NĂNG (FEATURE REQUIREMENTS DOCUMENT - FRD)
## FEAT-02: PERKS MANAGEMENT - DONATOR (TIME-BANK & HYBRID RETENTION SYSTEM)

---

### 1. MỤC TIÊU & BỐI CẢNH SỬ DỤNG THỰC TẾ

* **Bối cảnh**: Server cần cơ chế vinh danh và trao quyền lợi tương xứng cho thành viên đóng góp tài chính (Donator). Thay vì áp dụng thời hạn tuyến tính cứng nhắc (dễ gây tâm lý tiếc nuối khi bận việc và làm giảm tần suất quay lại), hệ thống áp dụng mô hình **Quỹ Thời Gian Tự Chủ (Time-Bank)** kết hợp **Đòn bẩy Thưởng Kép (Volume Bonus + Weekly Streak Bonus)**.
* **Mục tiêu sản phẩm**:
  * **Tăng tỷ lệ ủng hộ định kỳ (Retention)**: Thúc đẩy thói quen ủng hộ hàng tuần thông qua cơ chế Chuỗi Tuần (Weekly Streak) có tính năng suy giảm mềm (Soft Decay).
  * **Tối đa hóa giá trị đóng góp (Volume)**: Khuyến khích các gói đóng góp lớn với tỷ lệ thưởng bậc thang (Volume Bonus).
  * **Trao quyền làm chủ cho thành viên (Member Autonomy)**: Thành viên tự do trang bị hoặc cất role vào kho tùy nhu cầu với tốc độ tiêu hao thông minh ($1.0x$ khi đeo, $0.2x$ khi cất kho).
  * **Bảo vệ quyền lợi tuyệt đối (State Freeze)**: Khi tính năng tắt/bảo trì, toàn bộ thời gian của người dùng được đóng băng hoàn toàn ($0.0x$).
  * **Sẵn sàng tích hợp Dashboard (Track W)**: Toàn bộ công thức và tham số đều được lưu trữ động trong Database với các giá trị mặc định chuẩn xác.

---

### 2. DANH SÁCH USER ROLES & QUYỀN HẠN

| Vai trò | Điều kiện & Phân quyền Discord | Quyền hạn trong tính năng |
| :--- | :--- | :--- |
| **Server Owner / Administrator** | **BẮT BUỘC có cờ quyền `Administrator`** *(Lưu ý: `ManageGuild` hoặc các quyền quản trị khác đều KHÔNG được phép)* | • Bật / Tắt toàn bộ tính năng Donator Perk (`toggle`).<br>• Cấu hình Role Donator, Kênh thông báo (`config`).<br>• Ghi nhận lượt ủng hộ (`add`), điều chỉnh số dư credit (`adjust`), sửa bậc streak (`set_streak`).<br>• Tra cứu trạng thái chi tiết của bất kỳ thành viên nào (`status [member]`). |
| **Donator (Người ủng hộ)** | Mọi thành viên có số dư credit $> 0$ | • Tra cứu trạng thái cá nhân (`/perk status` và `/perk donator status`).<br>• Tự chủ động trang bị role (`equip`) hoặc cất vào kho (`unequip`).<br>• Xem chi tiết chính sách, biểu phí và công thức tính (`/perk donator info`).<br>• Nhận thông báo DM khi nạp tiền, khi cạn quỹ hoặc khi sắp giảm chuỗi streak. |
| **Member Thường** | Quyền cơ bản (`@everyone`) | • Xem danh sách giới thiệu quyền lợi (`/perk list`).<br>• Xem chính sách công thức ủng hộ (`/perk donator info`). |

---

### 3. THUẬT TOÁN KINH TẾ & QUY TẮC TÍNH TOÁN (CORE FORMULA)

#### 3.1. Mốc Quy Đổi Chuẩn (Benchmark Rate)
* **Quy ước chuẩn**: $200.000\text{ VNĐ} = 30\text{ ngày}$ sử dụng liên tục ở tốc độ $1.0x$.
* **Tỷ lệ cơ sở ($R_{base}$)**:
  $$R_{base} = \frac{30 \times 24 \times 3600 \text{ giây}}{200.000 \text{ VNĐ}} = 12,96 \text{ giây / VNĐ}$$

#### 3.2. Đòn Bẩy Thưởng Kép (Hybrid Multiplier)
Tổng số giây credit nạp vào bình được tính theo công thức:
$$\text{Credit (giây)} = (\text{Số tiền} \times R_{base}) \times (1 + \text{Bonus}_{Volume} + \text{Bonus}_{Streak})$$

* **Bảng Thưởng Số Tiền (Volume Bonus - Áp dụng cho từng lần nạp)**:
  * Dưới $50.000\text{đ}$: $+0\%$
  * $50.000\text{đ} - 199.999\text{đ}$: $+10\%$
  * $200.000\text{đ} - 499.999\text{đ}$: $+20\%$
  * Từ $500.000\text{đ}$ trở lên: $+35\%$
* **Bảng Thưởng Chuỗi Tuần (Weekly Streak Bonus - Áp dụng theo chuỗi hiện tại của user)**:
  * Chuỗi 1 tuần: $+0\%$
  * Chuỗi 2 tuần: $+5\%$
  * Chuỗi 3 tuần: $+10\%$
  * Chuỗi $\ge 4$ tuần: $+20\%$ *(Mức trần thưởng kinh tế `MAX_BONUS_STREAK_TIER = 4`)*
  *(Lưu ý: Bộ đếm vinh danh tích lũy tối đa `WeeklyStreakRule.MAX_STREAK = 100` tuần, trong khi trần thưởng kinh tế neo cố định tại mốc $+20\%$ cho các tuần từ 4 đến 100).*

#### 3.3. Chu Kỳ Tuần & Quy Tắc Streak (Theo Giờ Việt Nam UTC+7)
* **Múi giờ chuẩn**: Ép cố định theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7), bảo đảm hoạt động chuẩn xác kể cả khi host bot trên VPS Singapore, Châu Âu hay Mỹ.
* **Chu kỳ tuần dương lịch**: Bắt đầu từ `00:00:00 Thứ Hai` đến `23:59:59 Chủ Nhật` (UTC+7).
* **Điều kiện tăng/duy trì chuỗi**: Tổng số tiền ủng hộ tích lũy trong tuần dương lịch đó phải đạt tối thiểu **$\ge 50.000\text{ VNĐ}$**.
  * Lần donate đầu tiên trong tuần đạt mốc $\ge 50k$: $\text{Streak} = \min(\text{Streak} + 1, \text{MAX\_STREAK})$ (tối đa 100 tuần).
  * Các lần donate tiếp theo trong cùng tuần: Không tăng thêm bậc streak, nhưng vẫn được hưởng tỷ lệ thưởng của bậc streak hiện tại và thưởng số tiền của từng lần nạp.
* **Quy tắc Suy Giảm Mềm (Soft Decay)**:
  * Vào `00:00:00 Thứ Hai` hàng tuần (Cron Job), nếu trong tuần liền trước user không đạt mốc đóng góp $50.000\text{đ}$:
    * $\text{Streak} = \max(0, \text{Streak} - 1)$ (Chỉ giảm 1 bậc, không bị reset về 0).

#### 3.4. Cơ Chế Tiêu Hao Thời Gian & Đóng Băng (Time-Bank Burn Rates)
* **Khi trang bị Role (`isEquipped: true`)**: Tốc độ tiêu hao là **$1.0x$** (1 giây thực tế trôi qua trừ 1 giây credit).
* **Khi cất Role vào kho (`isEquipped: false`)**: Tốc độ tiêu hao là **$0.2x$** (5 giây thực tế trôi qua mới trừ 1 giây credit).
* **Khi Feature bị Tắt (`isEnabled: false`)**: Tốc độ tiêu hao là **$0.0x$** (Toàn bộ thời gian được đóng băng nguyên vẹn).
* **Cơ chế tính toán lười (Lazy Evaluation)**:
  $$\Delta t = \text{now} - \text{lastDeductedAt}$$
  $$\text{ConsumedSeconds} = \Delta t \times \text{CurrentBurnRate}$$
  $$\text{RemainingCredit} = \max(0, \text{RemainingCredit} - \text{ConsumedSeconds})$$
  $$\text{lastDeductedAt} = \text{now}$$
  *(Loại bỏ nhu cầu chạy cron job trừ credit theo từng giây, tiết kiệm tài nguyên CPU/DB và bảo đảm độ chính xác tuyệt đối).*
* **An toàn bộ nhớ (In-Memory Safe Read-Only)**: Hàm tra cứu trạng thái `getAccountStatus()` thực hiện đánh giá lười hoàn toàn trong bộ nhớ với `commit = false`, không ghi/cập nhật Database nhằm tránh nghẽn I/O và tranh chấp khóa SQLite. Việc chốt nợ và cập nhật Database (`commit = true`) chỉ diễn ra khi có hành vi thay đổi trạng thái thực sự.

---

### 4. CẤU TRÚC LỆNH SLASH COMMANDS (`/perk`)

```text
/perk
├── list                            (Chung: Xem danh sách tổng quan các gói quyền lợi của máy chủ)
├── status                          (Chung: Xem tóm tắt Booster & Donator của bản thân)
│
└── donator
    ├── info                        (Thành viên: Xem biểu phí, chính sách streak & công thức tính)
    ├── status [member]             (Thành viên/Admin: Xem chi tiết số dư, tốc độ tiêu thụ, streak)
    ├── equip                       (Thành viên: Lấy role ra đeo - kích hoạt tốc độ 1.0x)
    ├── unequip                     (Thành viên: Cất role vào kho - kích hoạt tốc độ 0.2x)
    │
    ├── add <user> <amount> [note]  (Admin: Ghi nhận ủng hộ, cộng credit & auto-equip)
    ├── adjust <user> <seconds> [reason] (Admin: Điều chỉnh tăng/giảm thời gian credit)
    ├── set_streak <user> <streak:0-100> (Admin: Điều chỉnh bậc streak vinh danh của thành viên)
    │
    ├── config action:<view|set_role|set_channel> [role] [channel] (Admin: Cấu hình Donator Perk)
    └── toggle <state:true/false>   (Admin: Bật hoặc tắt tính năng Donator Perk)
```

---

### 5. CHI TIẾT USER STORIES & TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

#### 🔹 US-01: Admin ghi nhận ủng hộ (Add Donation)
* **As an** Administrator,
* **I want to** nhập lệnh `/perk donator add user:@Member amount:200000 note:"VCB 123"`
* **So that** hệ thống tự động tính toán credit, cấp role và cập nhật chuỗi cho thành viên.
* **Acceptance Criteria**:
  * **Given** Tính năng Donator đang BẬT (`isEnabled = true`) và đã cấu hình Role hợp lệ.
  * **When** Administrator chạy lệnh `/perk donator add` với số tiền hợp lệ ($> 0$).
  * **Then**:
    * Hệ thống áp dụng công thức tính thưởng Volume và Streak tuần hiện tại.
    * Tự động gán Role Donator trên Discord cho user (nếu chưa có).
    * Thiết lập `isEquipped = true` và bắt đầu chu kỳ tiêu thụ $1.0x$.
    * Kiểm tra nếu số tiền tích lũy trong tuần $\ge 50.000\text{đ}$ thì tăng/duy trì Streak tuần (tối đa 100).
    * Lưu 1 bản ghi giao dịch vào bảng `DonatorTransaction`.
    * Phản hồi Embed cho Admin: Số tiền, % Thưởng, Số ngày/giờ được cộng thêm, Trạng thái role.
    * Gửi 1 tin nhắn DM cảm ơn thành viên kèm thông tin chi tiết quyền lợi vừa nhận.

#### 🔹 US-02: Donator chủ động cất / đeo role (Self-Service Vault)
* **As a** Donator,
* **I want to** sử dụng lệnh `/perk donator unequip` và `/perk donator equip`
* **So that** tôi có thể chủ động tiết kiệm thời gian khi không online server.
* **Acceptance Criteria**:
  * **Given** User có số dư credit $> 0$.
  * **When** User thực hiện `/perk donator unequip`:
    * Hệ thống trừ dứt điểm lượng credit đã tiêu thụ từ lần cập nhật trước đến hiện tại ở mức $1.0x$.
    * Thu hồi Role Donator trên server Discord.
    * Chuyển trạng thái `isEquipped = false`, chuyển tốc độ tiêu hao về $0.2x$.
    * Phản hồi Embed Ephemeral: Xác nhận role đã cất vào kho, thông báo tốc độ tiêu hao giảm 5 lần.
  * **When** User thực hiện `/perk donator equip`:
    * Hệ thống trừ lượng credit tiêu thụ trong kho ở mức $0.2x$.
    * Cấp lại Role Donator trên server Discord.
    * Chuyển trạng thái `isEquipped = true`, chuyển tốc độ tiêu hao về $1.0x$.

#### 🔹 US-03: Tự động thu hồi khi cạn quỹ (Drain & Auto-Revoke)
* **As the** System,
* **I want to** tự động thu hồi role khi số dư credit của user chạm mốc $0$
* **So that** đảm bảo tính công bằng của các đặc quyền trong server.
* **Acceptance Criteria**:
  * **Given** User đang có role (`isEquipped = true`) nhưng số dư credit đã bị trừ hết về $0$.
  * **When** Cron Job định kỳ (hoặc sự kiện quét) phát hiện `creditSeconds <= 0`:
    * Thu hồi Role Donator khỏi thành viên.
    * Cập nhật `isEquipped = false` và `creditSeconds = 0`.
    * Gửi DM thông báo: Cảm ơn sự đồng hành của bạn trong thời gian qua, thông báo quỹ đã hết và nhắc nhở mốc thời gian để ủng hộ tiếp nhằm bảo lưu chuỗi Streak.
    * Nếu user khóa DM: Ghi warning log và (nếu server có cài đặt `notificationChannelId`) gửi 1 tin nhắn thông báo nhẹ trong kênh chung.

#### 🔹 US-04: Bật / Tắt tính năng và Đóng băng thời gian (Master Switch)
* **As an** Administrator,
* **I want to** bật hoặc tắt toàn bộ tính năng Donator Perk
* **So that** quản lý vòng đời hệ thống linh hoạt khi cần bảo trì.
* **Acceptance Criteria**:
  * **When** Administrator chọn `/perk donator toggle state:true`:
    * Nếu server chưa cấu hình Role Donator: Chặn lệnh và hiển thị lỗi: *"Vui lòng cấu hình Role Donator bằng lệnh `/perk donator config action:set_role` trước khi bật tính năng."*
    * Nếu đã có role: Kích hoạt `isEnabled = true`. Phục hồi role cho các user có `isEquipped = true` và bắt đầu tính thời gian từ mốc hiện tại (`lastDeductedAt = now`).
  * **When** Administrator chọn `/perk donator toggle state:false`:
    * Chuyển `isEnabled = false`.
    * Trừ dứt điểm toàn bộ thời gian đã tiêu thụ đến thời điểm hiện tại.
    * Thu hồi tạm thời Role Donator của tất cả thành viên đang đeo.
    * **Đóng băng hoàn toàn (0.0x)**: Không trừ bất kỳ giây credit nào của bất kỳ ai trong suốt thời gian tính năng bị tắt.

#### 🔹 US-05: Tra cứu trạng thái chi tiết (Perk Status & Inspection)
* **As a** Donator hoặc Administrator,
* **I want to** sử dụng lệnh `/perk donator status [member]`
* **So that** tôi có thể xem thông tin chi tiết về số dư, tốc độ và dự kiến cạn quỹ.
* **Acceptance Criteria**:
  * **Given** Thành viên thường gọi `/perk donator status` (không truyền option `member`):
    * Hệ thống hiển thị số dư thời gian quy đổi (ngày, giờ), trạng thái Đang trang bị ($1.0x$) hay Cất kho ($0.2x$), chuỗi Streak hiện tại và dự kiến thời điểm hết hạn nếu giữ nguyên trạng thái.
  * **Given** Thành viên thường cố tình truyền option `member` trỏ vào người khác:
    * Hệ thống từ chối và báo lỗi phân quyền (Chỉ `Administrator` mới được tra cứu người khác).
  * **Given** Administrator gọi lệnh với option `member`:
    * Hệ thống hiển thị đầy đủ thông tin chi tiết của người đó kèm tổng số tiền đã ủng hộ (`totalDonated`) và lịch sử nạp gần nhất.

---

### 6. CÁC TRƯỜNG HỢP BIÊN (EDGE CASES) & GIẢI PHÁP ĐÃ THỐNG NHẤT

1. **Lệch Múi Giờ Hosting (Server Timezone Drift)**:
   * *Giải pháp*: Toàn bộ thuật toán xác định tuần dương lịch (Start of Week / End of Week) được ép cố định theo IANA timezone `Asia/Ho_Chi_Minh` (UTC+7). Bất kể VPS đặt tại Singapore hay US, mốc reset tuần luôn là 00:00 Thứ Hai giờ VN.
2. **Kẹt Quyền Phân Cấp Discord (Role Hierarchy Error 50013)**:
   * *Giải pháp*: Lệnh `/perk donator config action:set_role` tự động so sánh `highestRole.position` của bot với role được chọn. Nếu bot thấp hơn, bot từ chối lưu cấu hình và yêu cầu Admin kéo role của Bot lên cao hơn trong Server Settings.
3. **Thành viên khóa DM hoặc chặn Bot**:
   * *Giải pháp*: Mọi hàm gửi DM đều được bọc trong khối `try/catch`. Khi gặp lỗi `50007 (Cannot send messages to this user)`, bot ghi warning log và gửi thông báo thay thế vào `notificationChannelId` (nếu đã cấu hình).
4. **Thành viên rời server khi vẫn còn hạn Donator**:
   * *Giải pháp*: Lắng nghe sự kiện Gateway `Events.GuildMemberRemove` qua `donator-leave.event.ts`. Nếu Donator rời server, hệ thống chốt nợ credit ở tốc độ $1.0x$ và tự động chuyển `isEquipped = false` để kích hoạt chế độ cất kho ($0.2x$) nhằm bảo lưu tối đa thời gian cho họ nếu họ quay lại sau này.
5. **Nạp tiền nhiều lần trong cùng một tuần**:
   * *Giải pháp*: Lần nạp đầu tiên đạt $\ge 50k$ sẽ kích hoạt tăng chuỗi tuần ($+1$ streak, tối đa 100). Các lần nạp tiếp theo trong cùng tuần vẫn được hưởng trọn vẹn Bonus của mức Streak đó và Volume Bonus của từng lần nạp, nhưng `streakCount` không bị cộng dồn nhiều lần trong 1 tuần.

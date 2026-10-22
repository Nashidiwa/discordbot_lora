# FEAT-04: Voice Keeper 24/7 (`src/features/voice-keeper`)

Tài liệu đặc tả kiến trúc kỹ thuật, cẩm nang vận hành và hướng dẫn triển khai của phân hệ **Voice Keeper 24/7 (Treo Kênh Thoại & Tự Phục Hồi)** thuộc bot **Lora**.

> 📖 *Tài liệu Đặc Tả Yêu Cầu Tính Năng (FRD) & Acceptance Criteria chi tiết:* [`FRD.md`](./FRD.md)

---

## 1. Tổng Quan & Triết Lý Kiến Trúc

Tính năng `voice-keeper/` được xây dựng theo mô hình **Vertical Slice Architecture**, độc lập hoàn toàn với các lát cắt nghiệp vụ khác:

* **Treo Kênh Thoại 24/7 (Always-On Voice Presence):** Duy trì sự hiện diện liên tục của bot trong một kênh thoại cố định của server.
* **Cơ Chế Tự Phục Hồi 3 Tầng (Three-Tier Self-Healing):**
  1. **Tầng Khởi Động (`voice-ready.event.ts`):** Quét toàn bộ cấu hình `isEnabled = true` trong cơ sở dữ liệu khi bot khởi động và tự động kết nối lại.
  2. **Tầng Gateway Reactive (`voice-state-update.event.ts`):** Bắt sự kiện bot bị disconnect/kick ngoài ý muốn hoặc bị move kênh để tự động trở lại kênh đã cấu hình.
  3. **Tầng Watchdog Chủ Động (`voice-health.job.ts`):** Chạy ngầm định kỳ mỗi 10 phút để phát hiện và khôi phục các kết nối bị rớt ngầm mà Discord Gateway không kịp phát sự kiện.
* **Bảo Vệ Hạ Tầng & Chống Spam Gateway:**
  * **Exponential Backoff:** Giãn cách các lần thử lại (5s, 15s, 45s, 90s, 180s) khi xảy ra lỗi kết nối.
  * **Circuit Breaker:** Sau 5 lần retry thất bại liên tiếp, tự động chuyển sang trạng thái `SUSPENDED` để tránh dính Discord Gateway Rate Limit.
* **Tối Ưu Băng Thông:** Mặc định bật `selfDeaf: true` và `selfMute: true`, tiết kiệm tối đa CPU/Network và bảo vệ sự riêng tư của người dùng trong kênh.

---

## 2. Danh Mục Lệnh Tương Tác (`/voice_keeper`)

| Lệnh | Phân Quyền | Chức năng |
| :--- | :--- | :--- |
| `/voice_keeper set <channel> [self_deaf] [self_mute] [auto_reconnect]` | **Manage Channels / Admin** | Thiết lập và kích hoạt giữ kênh thoại 24/7 cho server. |
| `/voice_keeper status` | **Mọi người** | Xem trạng thái kết nối, độ trễ WebSocket, uptime và số lần retry. |
| `/voice_keeper reconnect` | **Manage Channels / Admin** | Ép kết nối lại tức thì (reset bộ đếm retry). |
| `/voice_keeper stop` | **Manage Channels / Admin** | Ngắt kết nối và tắt chế độ treo kênh 24/7 trên server. |

---

## 3. Cấu Trúc Bảng Dữ Liệu Prisma

Mô hình dữ liệu được khai báo tại `src/shared/db/schema.prisma`:

```prisma
model VoiceKeeperConfig {
  guildId         String    @id @map("guild_id")
  channelId       String    @map("channel_id")
  isEnabled       Boolean   @default(true) @map("is_enabled")
  selfDeaf        Boolean   @default(true) @map("self_deaf")
  selfMute        Boolean   @default(true) @map("self_mute")
  autoReconnect   Boolean   @default(true) @map("auto_reconnect")
  lastConnectedAt DateTime? @map("last_connected_at")
  updatedBy       String?   @map("updated_by")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("voice_keeper_configs")
}
```

---

## 4. Quản Lý Vòng Đời Kết Nối (Connection Lifecycle)

```
[Khởi động /set] ────► [joinVoiceChannel] ────► [READY (24/7)]
                              │                        │
                       Lỗi kết nối             Bị kick/disconnect
                              │                        │
                              ▼                        ▼
                      [scheduleReconnect] ◄────────────┘
                              │
                    (Exponential Backoff)
                              │
                    ┌─────────┴─────────┐
             (Thử lại < 5)         (Thử lại >= 5)
                    │                   │
                    ▼                   ▼
           [joinVoiceChannel]      [SUSPENDED]
                                (Chờ Admin /reconnect)
```

# Changelog

Tất cả các thay đổi đáng chú ý của dự án **Lora** (`discordbot_lora`) sẽ được ghi nhận chi tiết tại tệp tin này.

Định dạng tài liệu tuân thủ chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) và quy chuẩn phiên bản [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`v<MAJOR>.<MINOR>.<PATCH> [CODENAME]`).

---

## [0.8.5] - 2026-10-30 [TRACK-SECURITY/CONCURRENCY: Full Codebase Security Audit & Race-Condition Hardening]

### Đã sửa & Vá bảo mật (Fixed & Hardened)
- **Hạ Tầng Core Platform & Vòng Đời Tắt An Toàn (`src/core/`):**
  - **`config.ts`:** Mở rộng Zod Schema xác thực toàn diện các biến môi trường cấu hình Web Dashboard và OAuth2 (`DISCORD_CLIENT_SECRET`, `BOT_OWNER_ID`, `MASTER_API_KEY`, `COOKIE_SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_DASHBOARD_REDIRECT_URI`, `CORS_ORIGIN`, `ALLOWED_ORIGINS`). Loại bỏ hoàn toàn việc truy cập trực tiếp `process.env` rời rạc ở các guards và routes.
  - **`lifecycle.ts` & `index.ts`:** Thiết lập cơ chế đăng ký Hook dọn dẹp phân hệ (`registerCleanupHook`) và hàm kích hoạt shutdown tập trung (`triggerGracefulShutdown`). Bổ sung `await` khi hủy client (`await registeredClient.destroy()`) đảm bảo WebSocket Gateway Connection được ngắt bằng Close Frame 1000 chuẩn mực trước khi thoát tiến trình. Bắt sự kiện `uncaughtException` và `bootstrap().catch` kích hoạt shutdown đầy đủ 5 bước, dọn sạch voice connection, đóng Fastify và ngắt Prisma WAL thay vì exit process đột ngột.
  - **`job.loader.ts`:** Khắc phục lỗi `runOnInit: true` thực thi khi client chưa login (Discord cache rỗng): Tự động chờ sự kiện `ready` của Discord Client trước khi chạy tác vụ nền lúc khởi tạo.
  - **`bus.ts`:** Override phương thức `emit()` của `AsyncEventBus` để tự động định tuyến sang `emitAsync()` và `Promise.allSettled`, bảo đảm cách ly triệt để unhandled rejections cho toàn bộ các listener bất đồng bộ. Bổ sung `EventBusMap` định kiểu dữ liệu sự kiện hệ thống.
  - **`command.loader.ts`:** Bổ sung cảnh báo trùng tên Slash Command khi nạp từ các feature slices.
  - **`cors.plugin.ts`:** Hợp nhất mảng whitelist cấu hình giữa `CORS_ORIGIN` và `ALLOWED_ORIGINS`, đồng thời thay thế `callback(new Error(...))` bằng `callback(null, false)`, ngăn Fastify crash mã lỗi 500 khi gặp Origin ngoài whitelist, tuân thủ đúng chuẩn từ chối CORS.
  - **`auth.route.ts`:** Song song hóa quá trình đối soát quyền hạn của từng máy chủ (`/api/guilds`) bằng `Promise.all`, loại bỏ hiện tượng nghẽn N+1 tuần tự khi bot ở nhiều máy chủ.
  - **`session.util.ts`:** Ghi log lỗi nghiêm trọng khi môi trường production thiếu khóa bí mật cố định (`COOKIE_SECRET` / `DISCORD_CLIENT_SECRET`), cảnh báo nguy cơ hủy phiên người dùng khi restart server.
  - **`interactionCreate.ts`:** Nâng cấp cờ phản hồi Interaction sang chuẩn Discord.js mới nhất: thay thế `ephemeral: true` đã bị deprecate bằng `flags: MessageFlags.Ephemeral`.
- **Hệ Thống Phân Quyền Custom Permit (Privilege Escalation Guard):**
  - Khắc phục lỗ hổng leo thang đặc quyền trong `permit.service.ts`: Đảm bảo `TRUSTED_ADMIN` thừa hưởng cờ quyền năng động từ `trustedAdminFlags` mà không bị ghi đè bởi cờ quyền cũ trong DB.
  - Chặn triệt để Admin server cấp phát các quyền cờ (Permit Flags) mà chính họ không nắm giữ (`permit.route.ts` & `grant.sub.ts`).
  - Chặn Admin cấp dưới cố tình thu hồi quyền của nhóm `TRUSTED_ADMIN` (`revoke.sub.ts`).
  - Thẩm tra xác thực sự tồn tại của vai trò trong máy chủ (`guild.roles.cache.has`) khi gán quyền theo vai trò (`targetType === ROLE`).
- **Bảo Vệ Tính Toàn Vẹn Wordchain:**
  - Bổ sung xác thực kiểm tra kênh và vai trò (`normalModeChannelId`, `hardModeChannelId`, `reliableRoleId`, `failedRoleId`) phải thực sự thuộc về `:guildId` đang cấu hình (Cross-Guild Injection Guard).
  - Loại bỏ trường `isBanned` khỏi DTO cập nhật cấu hình của Server Admin trên Dashboard API (`wordchain.route.ts`), ngăn Admin máy chủ bị phạt tự gỡ cấm.
  - Sửa lỗi Promise Rejection Unhandled trong hàng đợi Mutex (`withLock` trong `wordchain-game.service.ts`): Xử lý lỗi lượt chơi bằng `.catch(() => {})` giúp lượt chơi sau không bị treo vĩnh viễn khi lượt chơi trước gặp ngoại lệ.
  - Bổ sung cơ chế dọn dẹp bộ nhớ đệm từ ngữ không hợp lệ (Negative Word Cache cleanup) quá hạn trong `wordchain-cleanup.job.ts`.
- **Khắc Phục Lỗ Hổng Swarm OAuth2 & CSRF:**
  - Khắc phục nguy cơ Reflected XSS / HTML Injection trong `swarm.route.ts` bằng việc encode an toàn `${safeUsername}` khi xuất HTML phản hồi liên kết vai trò.
  - Loại bỏ chuỗi bí mật tĩnh dự phòng không an toàn (`swarm-default-secret-salt`) trong `swarm-auth.service.ts`; bắt buộc ném lỗi nếu thiếu biến môi trường `DISCORD_TOKEN`.
- **Bảo Mật Giao Thoa Kênh & Vai Trò (Cross-Guild Injection Prevention):**
  - Bổ sung bước thẩm tra xác thực kênh thông báo và vai trò (`notificationChannelId`, `auditLogChannelId`, `anchorRoleId`, `donatorRoleId`) trên các route `perks.route.ts` và `swarm-guild.route.ts`, đảm bảo các ID này phải thực sự thuộc về `guildId` được cấp phép.
- **Tính Toán Toàn Vẹn Dữ Liệu Tài Chính Donator:**
  - Đóng gói toàn bộ thao tác ghi nhận nạp tiền (`addDonation`), điều chỉnh số dư (`adjustCredit`) và thiết lập chuỗi streak (`setStreak`) vào `db.$transaction` nguyên tử (Atomic ACID Transaction), chống thất thoát điểm hoặc mất dấu giao dịch khi có lỗi runtime giữa chừng.
  - Tái cấu trúc Dashboard API `/donator/topup` ủy quyền trực tiếp cho `donatorPerkService.addDonation(...)`, đảm bảo thành viên nạp qua Dashboard vẫn được hưởng đủ Volume Bonus, Weekly Streak Bonus (UTC+7), thông báo DM tự động và gán role tức thì.
  - Thêm tham số `limit` (tối đa 500 bản ghi) cho API `/donator/transactions`, giải quyết giới hạn 50 giao dịch khi xuất file báo cáo CSV.
- **Tối Ưu Hóa & Nâng Cấp Trực Quan Frontend Dashboard (`dashboard/`):**
  - **Triệt tiêu re-render 60-120fps (`AmbientBackground.tsx`):** Thay thế React state `pointerPos` bằng direct DOM refs và GPU transform `translate3d`, loại bỏ hoàn toàn hiện tượng tụt FPS khi di chuyển chuột.
  - **Khắc phục lỗi React Render Phase (`WordchainPage.tsx` & `SwarmPage.tsx`):** Chuyển toàn bộ các lệnh cập nhật state sang `useEffect`, ngăn chặn vi phạm tính bất biến của render phase trong React 18.
  - **Giao diện Di động Hoàn Chỉnh (Mobile View):** Bổ sung Mobile Card Stack cho bảng Quỹ Thời Gian Donator (`PerksPage.tsx`), kẹp toạ độ an toàn cho `ChannelSelect` và `RoleSelect` để không bị tràn mép màn hình, và làm khung Toast co giãn linh hoạt trên mobile.
  - **Hỗ trợ Tiếp Cận Bàn Phím (Keyboard a11y & Focus Visible):** Bổ sung `role="combobox"`, `tabIndex={0}` và xử lý phím `Enter`/`Space`/`Escape` cho các Custom Selects; quy định viền xanh focus rõ ràng (`:focus-visible`).
  - **Tinh Chỉnh Typography & Chống Giật Layout:** Chuyển đổi nhãn nhập liệu sang Sentence case; bổ sung Dark Theme cho date picker; thêm Skeleton state cho `UserDisplay` loại bỏ hiện tượng giật nhảy layout khi tải avatar; đồng bộ badge phiên bản `v0.8.5` trên Navbar.
- **Xóa Bỏ Race Condition trong Voice Keeper 24/7:**
  - Trong `voice-keeper.service.ts`, cập nhật DB `isEnabled: false` và giải phóng trạng thái phiên nội bộ *trước khi* ngắt kết nối voice, loại bỏ race condition khi sự kiện `VoiceConnectionStatus.Destroyed` bị kích hoạt ngược lại.
  - Bổ sung cờ bảo vệ `session.isConnecting` và chuyển việc giải phóng `session.reconnectTimer = null` vào khối `finally` sau khi kết nối hoàn tất. Triệt tiêu hoàn toàn khả năng watchdog `checkHealth` hoặc listener timeout kích hoạt reconnect song song đè lên nhau.
  - Bổ sung sự kiện `voice-guild-delete.event.ts` lắng nghe `Events.GuildDelete` để ngắt kết nối voice, hủy timer reconnect và cập nhật cơ sở dữ liệu ngay khi bot rời khỏi máy chủ.
  - Thêm guard `if (this.isShuttingDown) return;` ở đầu phương thức `connect()` ngăn chặn kết nối mới khi hệ thống đang tiến hành tắt máy.
- **Watchdog Timeout Cho Graceful Shutdown (`src/core/lifecycle.ts`):**
  - Bổ sung unref'd watchdog timer 10 giây kích hoạt `process.exit(exitCode || 1)` cưỡng chế ngay đầu hàm `triggerGracefulShutdown`, bảo đảm tiến trình không bao giờ bị treo vĩnh viễn (zombie process) nếu các hook dọn dẹp, ngắt kết nối DB hoặc hủy Discord gateway bị deadlock.
- **Thắt Chặt Xác Thực Đầu Vào (Input Validation Hardening):**
  - **`guild-meta.route.ts`:** Lọc và kiểm tra định dạng Snowflake Regex `/^\d{17,20}$/` trên endpoint `/api/users/lookup`, ngăn chặn các ID không hợp lệ gọi vào Discord client cache.
  - **`wordchain.route.ts`:** Thẩm tra định dạng mã ngôn ngữ hợp lệ dạng chuỗi 2 ký tự (`/^[a-z]{2}(,[a-z]{2})*$/`) trên endpoint `PUT /config` trước khi cập nhật vào cơ sở dữ liệu.
- **Đồng Bộ Nhận Diện Thương Hiệu & Trải Nghiệm Người Dùng (Brand Identity & UI Polish):**
  - Di chuyển và chuẩn hóa biểu tượng nhận diện `lora_icon_badge.png` (App Engine Icon) vào `dashboard/public/` và `dashboard/src/assets/`, cập nhật favicon, Navbar header và màn hình đăng nhập `LoginPage`.
  - Tái cấu trúc lưới 5 thẻ tính năng cốt lõi trên trang Tổng quan Máy chủ (`OverviewPage.tsx`) sắp xếp từ trái sang phải, từ trên xuống dưới đồng bộ hoàn toàn với thứ tự Sidebar: Phân quyền (Permit) $\rightarrow$ Quản lý Đặc quyền (Perks) $\rightarrow$ Voice Keeper 24/7 $\rightarrow$ Wordchain Engine $\rightarrow$ The Swarm Linked.
  - Đồng bộ hóa 2 nút thao tác nhanh (Quick Actions) trên Spotlight Card trỏ trực tiếp tới 2 phân hệ thiết yếu nhất: Phân quyền Permit & Quản lý Perks.
  - Cập nhật điều kiện reactive URL sync trong `DashboardLayout.tsx` tách biệt kiểm tra danh sách máy chủ, hỗ trợ Bot Owner chưa tham gia máy chủ nào vẫn truy cập và đồng bộ mượt mà phạm vi Global Scope.
  - Chuẩn hóa kích thước dropdown `GuildSwitcher.tsx` sang Tailwind tiêu chuẩn `sm:w-80 max-w-[calc(100vw-2rem)]` chống tràn viền trên màn hình di động.
  - Bọc giá trị Context trong `useMemo` tại `Toast.tsx`, triệt tiêu toàn bộ re-render thừa của các components con khi có thông báo hiển thị hoặc đóng lại.
- **Chuẩn Hóa Xử Lý Lỗi Discord Interactions:**
  - Thay thế khối `catch` rỗng nuốt lỗi trong các sự kiện Wordchain (`wordchain-delete.event.ts`, `wordchain-message.event.ts`, `wordchain-edit.event.ts`) bằng log cấu trúc Pino `logger.warn` / `logger.debug`.
  - Thay thế ép kiểu không an toàn `interaction.member as GuildMember` trong `booster-setboost-button.event.ts` bằng `interaction.memberPermissions?.has(...)`.

---

## [0.8.4] - 2026-10-30 [TRACK-W: Scoped Router URLs (:guildId), Deep Linking & State Sync]

### Đã thêm (Added)
- **Hệ Thống Scoped Router URLs Phân Cấp Theo Máy Chủ (`/dashboard/guilds/:guildId/*`):**
  - Tái cấu trúc toàn diện cây định tuyến của React Router v6, gắn mã định danh `:guildId` trực tiếp vào thanh địa chỉ cho toàn bộ các phân hệ máy chủ:
    - `/dashboard/guilds/:guildId` (Tổng quan Máy chủ)
    - `/dashboard/guilds/:guildId/permits` (Phân quyền Custom Permit)
    - `/dashboard/guilds/:guildId/perks` (Quản lý Đặc quyền Booster & Donator)
    - `/dashboard/guilds/:guildId/voice-keeper` (Voice Keeper 24/7)
    - `/dashboard/guilds/:guildId/wordchain` (Wordchain Engine)
    - `/dashboard/guilds/:guildId/swarm` (The Swarm Linked Roles)
  - Giải quyết triệt để 3 hạn chế tiền nhiệm:
    1. Cho phép mở song song nhiều tab trên các server khác nhau mà không bao giờ bị ghi đè state.
    2. Hỗ trợ Deep Linking và Bookmark trình duyệt trực tiếp tới một máy chủ và một phân hệ tính năng cụ thể.
    3. Tránh hiện tượng nhảy server ngẫu nhiên khi F5 hoặc khi gửi link chia sẻ cho ban quản trị khác.
- **Bộ Điều Hướng Dự Phòng Thông Minh (`DashboardRedirect.tsx`):**
  - Tự động bắt và chuyển hướng an toàn cho các URL gốc (`/dashboard`, `/dashboard/guilds`, `/dashboard/servers`) và các URL cũ không gắn ID (`/dashboard/perks`, `/dashboard/voice-keeper`...).
  - Ưu tiên điều hướng tới máy chủ hoạt động gần nhất (`lora_last_active_guild` trong `localStorage`) hoặc máy chủ đầu tiên khả dụng trong session.
  - Tự động chuyển hướng tới `/dashboard/global` nếu tài khoản không quản trị máy chủ nào nhưng có quyền Bot Owner / Delegated Operator.
- **Bảo Toàn Tab Khi Đổi Máy Chủ (`GuildSwitcher.tsx`):**
  - Cơ chế tự động trích xuất subpath hiện tại: Người dùng đang thao tác ở tab nào (ví dụ `/dashboard/guilds/A/perks`), khi chuyển sang máy chủ B sẽ được đưa thẳng tới `/dashboard/guilds/B/perks`.
- **Cơ Chế Đồng Bộ State Tự Động & Chống Truy Cập Trái Phép (`DashboardLayout.tsx` & `AuthContext.tsx`):**
  - Tự động đồng bộ hóa `selectedGuild` trong Context khớp với `:guildId` trên URL (hỗ trợ thao tác Back/Forward trên lịch sử trình duyệt).
  - Tự động phát hiện khi người dùng truy cập ID máy chủ không tồn tại hoặc không có thẩm quyền, hiển thị Toast cảnh báo lỗi và chuyển hướng an toàn về máy chủ hợp lệ.
  - Toàn bộ các trang và Sidebar đọc `guildId` trực tiếp từ `useParams<{ guildId: string }>()`.

---

## [0.8.3] - 2026-10-30 [TRACK-W: Global Management Scope & Swarm Strict RBAC Partitioning]

### Đã thêm (Added)
- **Kiến Trúc Hai Không Gian Quản Trị Độc Lập (Server Scope vs Global Scope):**
  - **Hộp Chuyển Đổi Không Gian (Workspace Switcher) Trên Navbar:**
    - Người dùng có thẩm quyền cấp cao (**Bot Owner** hoặc **Delegated Operator**) có thêm tùy chọn ghim đặc biệt trên đầu: `🌐 Toàn Hệ Thống (Global Management)` với huy hiệu `Super Admin` / `Operator`.
    - Cho phép chuyển đổi tức thì giữa chế độ quản trị từng máy chủ cụ thể và chế độ điều khiển toàn mạng lưới cấp Ứng Dụng (Application Scope).
  - **Bảng Điều Hướng Động (Dynamic Sidebar Navigation):**
    - Khi ở chế độ `Global Scope`: Tự động chuyển sang menu cài đặt toàn cầu gồm **Tổng quan Hệ thống (Global)** và **The Swarm Toàn Cầu**. Sẵn sàng làm nền tảng cắm các tính năng quản trị cấp bot trong tương lai.
    - Khi ở chế độ `Server Scope`: Giữ nguyên danh mục quản trị riêng của máy chủ (Voice Keeper, Perks, Permit, Swarm Server, Wordchain).
  - **Phân Định Triệt Để Nội Dung Tổng Quan (Server Overview vs Global Overview):**
    - *Ở từng Máy Chủ (`OverviewPage.tsx`):* Loại bỏ hoàn toàn bảng chỉ số hạ tầng runtime (Bento telemetry, live ping sparkline, memory gauge, SSE stream bot) để không gây xao nhãng; tập trung 100% vào danh tính máy chủ đang chọn và 5 phân hệ dịch vụ của server (Voice Keeper, Perks, Permit, The Swarm Server, Wordchain).
    - *Ở cấp Toàn Cầu (`GlobalOverviewPage.tsx`):* Tích hợp toàn bộ bảng Bento Grid telemetry hạ tầng thời gian thực; loại bỏ hoàn toàn khối thông tin server đơn lẻ và thay thế bằng **Mạng Lưới Máy Chủ Discord (Servers Grid)** kèm thanh tìm kiếm tức thì và nút điều hướng **"Cài đặt máy chủ này →"** giúp chuyển đổi ngữ cảnh quản trị mượt mà.
  - **Trang Quản Trị The Swarm Cấp Ứng Dụng (`GlobalSwarmPage.tsx`):**
    - Bảng điều khiển dành riêng cho Bot Owner và Delegated Operator.
    - KPI toàn mạng lưới: Tổng thành viên đã liên kết toàn bot, tổng Operators, số lượng máy chủ đã bật thông báo.
    - Quản lý Delegated Operators: Độc quyền Bot Owner ủy quyền thêm hoặc thu hồi Operator qua Discord User ID.
    - Gán/thu hồi cấp bậc danh hiệu toàn cầu với modal xác thực người dùng qua Discord API.
    - Bảng danh sách toàn bộ thành viên mạng lưới sắp xếp từ **The Swarm 8 về 0** kèm tên người cập nhật (`updatedBy`), ngày giờ và nút điều chỉnh.
  - **Backend Endpoints Cấp Global Mới (`swarm-global.route.ts`):**
    - `GET /api/swarm/auth-status`: Phân giải trạng thái Operator & Bot Owner.
    - `GET /api/swarm/global`: Thống kê The Swarm toàn hệ thống.
    - `POST /api/swarm/global/members/:userId`: Gán/thu hồi level cấp ứng dụng.
    - `POST /api/swarm/global/operators` & `DELETE /api/swarm/global/operators/:userId`: Quản lý Operator.

### Đã sửa (Fixed) & Bảo mật (Security)
- **Thắt Chặt Phân Quyền The Swarm Trong Phạm Vi Server (`swarm-guild.route.ts` & `SwarmPage.tsx`):**
  - Quản trị viên server thông thường (không phải Operator) chỉ được xem số lượng thành viên liên kết trong server, phân bổ 8 bậc trong server và tên kênh thông báo ở chế độ **Chỉ Đọc (Read-only)**; **bị khóa hoàn toàn quyền thay đổi kênh thông báo**.
  - **Bảo Mật Danh Tính:** Ẩn hoàn toàn thông tin người cập nhật (`updatedBy`), ẩn số lượng và danh sách Operators, ẩn nút điều chỉnh cấp bậc đối với Server Admin thường.
  - Danh sách thành viên The Swarm trong server được lọc chính xác qua RAM cache và **sắp xếp nghiêm ngặt từ The Swarm 8 giảm dần về 0**.
  - Operator và Bot Owner được cấp toàn quyền truy cập phân hệ The Swarm trên mọi server mà không bị chặn bởi permit server cục bộ, đồng thời có nút lối tắt chuyển nhanh sang Bảng Quản Trị Swarm Toàn Cầu.
- **Bảo Vệ Vùng Cấm `src/core/` Tuyệt Đối:**
  - Toàn bộ cơ chế phân quyền, routes mới và giao diện được triển khai 100% trong `src/features/swarm-linked-roles/` và `dashboard/`, giữ nguyên 100% mã nguồn `src/core/`.

### Đã sửa (Fixed) & Trải nghiệm (UX Polish)
- **Chuẩn Hóa Màu Sắc Tại Simulator Server Booster Custom Role (`DiscordChatSimulator.tsx` & `PerksPage.tsx`):**
  - Xây dựng tiện ích `normalizeHexColor()` hỗ trợ toàn diện các định dạng: chuỗi hex không dấu `#` (ví dụ `ff007f`), hex 3 ký tự (`#f07`), số nguyên hệ thập phân (raw color integer từ Discord API), và hex chuẩn `#rrggbb`.
  - Áp dụng trực tiếp inline style `-webkit-background-clip: text` và `-webkit-text-fill-color: transparent` trên DOM node hiển thị tên vai trò, triệt tiêu xung đột với CSS mặc định của Tailwind giúp gradient 2 màu hiển thị sắc nét 100%.
  - Đồng bộ hóa màu avatar nền, badge role pill và color swatch chips theo đúng mã màu thực tế của role.
- **Điều Chỉnh Thứ Tự Điều Hướng Sidebar (`Sidebar.tsx`):**
  - Chuẩn hóa thứ tự menu máy chủ từ trên xuống dưới: `Tổng quan Máy chủ` $\rightarrow$ `Phân quyền (Permit)` $\rightarrow$ `Quản lý Đặc quyền` $\rightarrow$ `Voice Keeper 24/7` $\rightarrow$ `Wordchain Engine` $\rightarrow$ `The Swarm Linked`.
- **Tối Ưu Hóa Điều Hướng Chuyển Vùng Global Scope (`GuildSwitcher.tsx`):**
  - Khi người dùng chuyển sang *"Quản trị Toàn hệ thống (Application Scope)"*, hệ thống mặc định điều hướng tới trang **Tổng quan Toàn cầu** (`/dashboard/global`) thay vì nhảy thẳng vào `/dashboard/global/swarm`.
- **Triệt Tiêu Hiện Tượng Nháy Viền & Lệch Vị Trí Dropdown:**
  - Thiết lập thuộc tính `outline: none;` toàn cục cho tất cả thẻ input/select/button để loại bỏ viền mặc định đột ngột của trình duyệt (browser default outline spike).
  - Thay thế `transition-all duration-150` bằng `transition-[border-color,box-shadow] duration-200 ease-out` để loại trừ giật khung hình subpixel rasterization khi chuyển đổi trạng thái hover/focus.
  - Tối ưu hóa tính toán tọa độ Floating Dropdown của `ChannelSelect` và `RoleSelect`, loại bỏ hiện tượng lệch vị trí khi mount lần đầu.

### Đã thêm (Added)
- **Bộ Thành Phần Bộ Chọn Kênh & Vai Trò Thông Minh (Smart Resource Selectors):**
  - **`ChannelSelect.tsx`:** Cho phép chọn kênh trực tiếp theo đúng danh mục Category và thứ tự Discord thay vì phải nhập ID thủ công. Tích hợp icon trực quan cho từng loại kênh (`#` cho Text/Announcement, loa cho Voice, micro cho Stage), hỗ trợ lọc tìm kiếm nhanh và nút xóa lựa chọn.
  - **`RoleSelect.tsx`:** Danh sách vai trò được sắp xếp chính xác theo **Discord Role Hierarchy** (vị trí cao nhất xếp trên cùng). Hiển thị chấm màu sắc nguyên bản của vai trò (`role.color`), nhãn nhận diện Managed Role (Bot Integrations) và ô tìm kiếm tức thì.
  - Áp dụng trên toàn bộ các trang: `PerksPage` (Anchor Role, Booster Channel, Audit Log Channel), `SwarmPage` (Swarm Notification Channel), `WordchainPage` (Normal/Hard Mode Channels, Reliable/Failed Roles), `PermitPage` (Trusted Role, Custom Grant Role), và `VoiceKeeperPage`.
- **Xác Thực Tài Khoản Người Dùng Tức Thì (Discord Identity Verification & Preview):**
  - **`UserInput.tsx`:** Tự động tra cứu User ID qua Discord Gateway (debounce 400ms). Hiển thị thẻ xem trước danh tính với Avatar người dùng, `@username`, Tên hiển thị (Global Name), ID và chỉ thị trạng thái hợp lệ (`✓`) hoặc báo lỗi (`✕`). Ngăn chặn hoàn toàn việc lưu dữ liệu với User ID không tồn tại.
  - **`UserDisplay.tsx`:** Định dạng hiển thị nhất quán `username (userID)` kèm avatar thu nhỏ trên toàn bộ các bảng danh sách: Donator Accounts, Lịch sử nạp tiền, Custom Booster Roles, The Swarm Members, Delegated Operators, Wordchain Leaderboard & Live HUD, và Danh sách Permit.
  - Endpoint backend mới `GET /api/users/:userId` và `POST /api/users/lookup` phục vụ việc xác thực và batch fetch danh tính người dùng.

---

## [0.8.1] - 2026-10-29 [TRACK-W: Feature Expansion & Financial Reporting Overhaul]

### Đã thêm (Added)
- **Mở Rộng Phân Hệ The Swarm Linked Roles Trên Dashboard (FEAT-03 & WEB-04):**
  - Phân định ranh giới kiến trúc nghiêm ngặt giữa **Phạm vi Cấp Máy Chủ (Server Scope)** và **Phạm vi Toàn Cục Cấp Ứng Dụng (Application Scope)**:
    - *Cấp Máy Chủ:* Quản trị viên chỉ có quyền cấu hình kênh thông báo thăng cấp/thu hồi (`notificationChannelId`) của server đó và xem bảng tham chiếu vai trò.
    - *Cấp Ứng Dụng:* Khóa siêu dữ liệu `swarm_level = [1..8]` có hiệu lực toàn cầu trên mọi server có bot. Thao tác gán hoặc thu hồi vai trò thành viên bị chặn tuyệt đối đối với Server Admin thông thường và **bắt buộc phải là Delegated Operator hoặc Bot Owner** (`SwarmOperatorService.isOperator`).
    - *Thẩm Quyền Bot Owner:* Bổ sung bảng quản trị và endpoint ủy quyền/thu hồi Delegated Operator (`POST`/`DELETE /api/guilds/:guildId/swarm/operators`) độc quyền cho Bot Owner.
  - Tạo trang giao diện `SwarmPage.tsx` độc lập với cảnh báo an ninh thẩm quyền tự động, phân cấp 8 bậc vai trò (`The Swarm I` $\rightarrow$ `VIII`), nút sao chép URL xác thực OAuth2 và chế độ Chỉ Xem (Read-only) đối với Server Admin.
- **Mở Rộng Phân Hệ Wordchain Game & Karma Engine Trên Dashboard (FEAT-05 & WEB-04):**
  - Tạo trang giao diện `WordchainPage.tsx` với Live HUD thời gian thực cho 2 chế độ chơi: Chế độ Thường (Normal Mode - 1 ký tự) và Chế độ Khó (Hard Mode - 2 ký tự).
  - Hiển thị từ đang chờ nối tiếp, độ dài chuỗi, người vừa nối, kỷ lục cao nhất và tổng số từ đã dùng.
  - Thiết lập phòng chơi chuyên biệt (Normal Channel ID, Hard Channel ID) và cơ chế tự động trao vai trò thành viên uy tín (Reliable Role) hoặc cảnh báo phá chuỗi (Failed Role).
  - Bảng xếp hạng thành viên 2 chiều: **Bảng Vàng Karma** (Độ uy tín & tinh thần đồng đội) và **Bảng Tổng Điểm Score** cá nhân, hiển thị tỷ lệ chính xác dạng progress bar.
  - Công cụ Reset ván chơi kẹt khẩn cấp với Modal xác nhận an toàn, hỗ trợ reset theo từng mode hoặc toàn bộ.
  - Endpoint quản trị backend mới `src/features/wordchain/wordchain.route.ts` với cờ quyền `PermitFlag.VIEW_DASHBOARD` và `PermitFlag.MANAGE_WORDCHAIN`.
- **Bộ Lọc Nâng Cao & Xuất Báo Cáo Tài Chính Donator (PerksPage.tsx):**
  - Thanh công cụ lọc lịch sử giao dịch: Tìm kiếm theo User ID, loại tác vụ hoặc ghi chú; bộ lọc ngày từ (Từ ngày) đến (Đến ngày); nút reset bộ lọc tức thì.
  - Hàm xuất báo cáo CSV chuẩn hóa UTF-8 BOM (`\uFEFF`), hỗ trợ hiển thị tiếng Việt hoàn hảo trên Microsoft Excel và các ứng dụng bảng tính, tự động đặt tên file `donator_report_<guildId>_<date>.csv`.

---

## [0.8.0] - 2026-10-29 [TRACK-W: Web Management Dashboard Visual Elevation & Core Experience Overhaul]

### Đã thêm (Added)
- **Hệ Thống UI Primitives Nội Bộ (Bespoke Design Tokens):**
  - Xây dựng thư mục `src/components/ui/` (`Button`, `Input`, `Switch`, `Badge`, `Card`, `Modal`, `Skeleton`, `Toast`).
  - Hệ thống thông báo nổi góc màn hình (`ToastProvider`, `useToast()`) với 4 cấp độ: success, error, warning, info.
  - Hàm tiện ích `src/lib/utils.ts` (`cn`, `formatVnd`, `formatDurationSeconds`, `formatDateTime`).
- **Bộ Chuyển Đổi Máy Chủ Tùy Biến (Custom Rich Guild Switcher):**
  - `GuildSwitcher.tsx` với Avatar máy chủ sắc nét, ô tìm kiếm thời gian thực, số lượng thành viên và huy hiệu vai trò quản trị `roleTier`.
  - Hỗ trợ thanh điều hướng `Sidebar.tsx` thu gọn (icon-only mode) trên desktop và Mobile Slide-Over Drawer trên điện thoại.
- **Ambient Canvas Engine & Nền Deep Obsidian (`#0c0d12`):**
  - Nền cực quang sống động (`AmbientBackground.tsx`) với 4 khối cầu neon chuyển động liên tục và tự động đổi dải màu theo phân hệ (Voice: Cyan/Emerald, Perks: Amber/Gold, Permits: Royal Violet, Overview: Blurple/Indigo).
  - Lưới điểm ma trận công nghệ (`cyber-dot-grid`) và lưới vi mạch (`cyber-lines-grid`) phủ mặt nạ xuyên thấu đa tiêu cự.
  - Hiệu ứng con trỏ chuột tương tác (Fluid Pointer Spotlight): Quầng sáng di chuyển mượt mà $0.09$ lerp và chiếu sáng lưới ma trận điểm dưới con trỏ.
  - Kỹ thuật thẻ kính tương tác cao cấp (`Card.tsx`): Tích hợp CSS variables `--mouse-x`, `--mouse-y` tạo viền phát sáng 0ms delay và phản quang mặt kính khi rê chuột qua.
- **Hero Moments & Tính Năng Trực Quan Đắt Giá:**
  - **Discord Native Chat Simulator:** Trình giả lập tin nhắn Discord thời gian thực trên trang Perks, áp dụng trực tiếp Gradient 2 màu (`EnhancedRoleColors`) với CSS background-clip text khi click vào từng role.
  - **12-Bar Audio Equalizer:** Bộ equalizer 12 cột tần số động chuyển màu Cyan $\rightarrow$ Emerald trên trang Voice Keeper 24/7.
  - **Asymmetric Bento Grid Telemetry:** Biểu đồ đường SVG Sparkline đo độ trễ WebSocket Ping 15 điểm thời gian thực, thanh tiến trình đo RAM Heap/RSS và đồng hồ Uptime số.
  - **Hệ Thống Danh Hiệu Donator:** Huy hiệu danh dự Crown 👑 ($\ge 8$ tuần), Diamond 💎 ($\ge 4$ tuần), Flame 🔥 ($\ge 1$ tuần).

### Đã tối ưu (Optimized)
- Tối ưu hóa hiệu năng chuyển động: Thay thế `transition: all 0.3s` bằng hardware-accelerated `translate3d(0, -3px, 0)` $160ms$, triệt tiêu hoàn toàn hiện tượng delay và giật khung hình khi rê chuột qua các thẻ.

---

## [0.7.0] - 2026-10-28 [TRACK-W: Web Management Dashboard & FEAT-07: Wick-style Custom Permit]

### Đã thêm (Added)
- **Hệ Thống Custom Permit Độc Lập Chuẩn Wickbot (FEAT-07):**
  - Xây dựng lát cắt nghiệp vụ `src/features/permit/` và shared engine `src/shared/permit/`.
  - Mô hình phân quyền 4 tầng: Bot Owner (Tier 0) $\rightarrow$ Server Owner (`guild.ownerId`, Tier 1) $\rightarrow$ Co-Owner (Tier 2) $\rightarrow$ Trusted Admin (Tier 3) $\rightarrow$ Custom Module Grants (Tier 4).
  - Ma trận cờ quyền bitfield linh hoạt: `VIEW_DASHBOARD`, `MANAGE_PERMITS`, `MANAGE_SETTINGS`, `MANAGE_PERKS`, `MANAGE_VOICE_KEEPER`, `MANAGE_WORDCHAIN`, `MANAGE_SWARM`.
  - Bộ Slash Command Discord `/permit`: `co_owner` (add/remove), `trusted_admin` (add/remove), `grant` (module flags), `revoke`, `list`.
  - Bổ sung 2 Prisma models: `GuildPermitConfig` và `GuildPermitAssignment` kèm database migration `20261028092358_add_custom_permit_system`.
- **Hạ Tầng Backend REST API & Discord OAuth2 (WEB-01 & WEB-03):**
  - Tích hợp `@fastify/cookie` và `@fastify/static` vào Fastify Web Server.
  - Luồng xác thực Discord OAuth2 an toàn, lưu phiên làm việc qua HTTP-Only Secure SameSite Cookie (`lora_session`) mã hóa HMAC SHA-256.
  - Hỗ trợ Master API Key (`x-api-key`) cho Bot Owner và automated scripts.
  - Hệ thống PreHandler Guards (`requireAuth`, `requirePermit(flag)`) kiểm tra quyền hạn tức thì từ Discord Gateway Member Cache và Database Permit.
  - Server-Sent Events (SSE) Channels: `/api/sse/guilds/:guildId` (live push Voice Connection & Permit changes) và `/api/sse/system` (live push CPU, RAM, WebSocket Ping cho Bot Owner).
  - Tích hợp các REST endpoints theo từng feature slice: `permit.route.ts`, `voice-keeper.route.ts`, `perks.route.ts`, `dashboard-auth.route.ts`, `dashboard-system.route.ts`.
- **Frontend SPA Quản Trị Độc Lập (WEB-02, `dashboard/`):**
  - Khởi tạo Single Page Application bằng Vite + React 18 + Strict TypeScript + Tailwind CSS.
  - Thiết kế Dark Mode Discord Aesthetic đồng bộ với bộ màu Discord (Blurple, Muted Dark, Green, Yellow, Red).
  - 4 Trang quản trị chính:
    - **System Overview:** Giám sát RAM, Uptime, WebSocket ping, tài nguyên bot thời gian thực qua SSE.
    - **Voice Keeper 24/7:** Chọn kênh thoại từ dropdown, bật/tắt self-deaf, self-mute, nút Reconnect tức thì, theo dõi trạng thái sống qua SSE.
    - **Perks Management:** Cấu hình thời gian ân hạn Booster Grace Period, Quỹ thời gian Donator Time-Bank, nạp quỹ thủ công, lịch sử giao dịch.
    - **Custom Permit (RBAC):** Bổ nhiệm Co-Owner, Trusted Admin, ma trận checkbox cấp quyền module theo Role/User.
  - Kiến trúc đóng gói Single-Port Hybrid: Fastify tự động phục vụ `dashboard/dist` trên port 3000 ở production; hỗ trợ Vite proxy ở local dev.

### Đã bảo mật & Tối ưu hóa (Security Hardening & Technical Audit)
- **Bảo mật OAuth2 CSRF:** Bổ sung tham số `state` (CSRF token) được ký số HMAC-SHA256 kèm timestamp và double-submit httpOnly cookie (`lora_oauth_state`) trong luồng Discord OAuth2, chống tấn công Login CSRF và state tampering.
- **Timing Attack Defense:** Sử dụng `crypto.timingSafeEqual` cho xác thực Master API Key (`x-api-key`) và OAuth2 State, loại bỏ triệt để nguy cơ tấn công timing attack.
- **CORS Hardening:** Khắc phục lỗ hổng Insecure CORS Misconfiguration (`origin: true` kết hợp `credentials: true`), chuyển sang whitelist origin có kiểm soát, từ chối mọi origin không tin cậy.
- **Ngăn chặn Privilege Escalation trong Permit Route:** Rà soát và bổ sung kiểm tra phân cấp thẩm quyền nghiêm ngặt trên REST endpoints `/api/guilds/:guildId/permits/assign`, `/revoke`, `/config`, bảo đảm chỉ Server Owner/Bot Owner mới có quyền bổ nhiệm Co-Owner và quản trị Trusted Admin.
- **Bảo vệ Bot Owner Guild Access:** Sửa lỗi Bot Owner bị 403 Forbidden khi quản trị các server trên Dashboard mà Bot Owner không trực tiếp tham gia làm thành viên.
- **Khắc phục Rò rỉ Bộ nhớ SSE (Memory Leak Fix):** Bổ sung cơ chế dọn dẹp kết nối SSE toàn diện (`SSEManager.shutdown()`), quản lý heartbeat timers, hủy đăng ký EventBus listeners khi server tắt và xử lý ngắt socket an toàn.
- **Phòng chống Crash do BigInt & Input Validation:** Kiểm tra số nguyên hợp lệ cho các trường tiền tệ nạp quỹ Donator (`amountVnd`), ngăn ngừa lỗi `RangeError` khi parse BigInt; bổ sung kiểm tra channel type cho Voice Keeper.
- **Frontend Real-time Sync:** Bổ sung kết nối SSE thời gian thực cho trang Quản lý Permit (`permit:changed`) với cấu hình `withCredentials: true`.

---

## [0.6.0] - 2026-10-22 [FEAT-05: Wordchain (Trò Chơi Nối Từ Đa Tầng & Hệ Thống Karma)]

### Đã thêm (Added)
- **Kiến trúc & Động cơ Nối Từ (Word Chain Engine):**
  - Xây dựng lát cắt độc lập `src/features/wordchain/` theo mô hình Vertical Slice Architecture và Zero Cross-Feature Import.
  - Tầng Service `WordChainGameService` (`wordchain-game.service.ts`) điều phối toàn bộ trạng thái ván chơi:
    - Mutex lock tuần tự hóa FIFO per-guild per-mode chống race condition.
    - Giao dịch database atomic bảo đảm tính toàn vẹn trạng thái khi xảy ra lỗi.
    - Bộ nhớ lịch sử biến động 5 từ gần nhất (`serverHistories`) lưu trữ trong RAM, phân rã an toàn khi khởi động lại (`DEC-007`).
    - Hỗ trợ cả 2 chế độ chơi Normal Mode (1 chữ cái) và Hard Mode (2 chữ cái).
  - Kiến trúc từ điển 3 tầng (`WordChainDictionaryService`, `DEC-003`):
    - **Tầng 1 (Local RAM Lexicon):** Nạp danh sách từ vựng thông dụng từ `dictionary_en_common.json` phản hồi siêu tốc.
    - **Tầng 2 (Database Cache):** Bảng `WordChainWordCache` với khóa chính phức hợp `[language, word]`. Positive cache lưu vĩnh viễn; Negative cache lưu 24 giờ.
    - **Tầng 3 (Wiktionary Fallback):** Truy vấn Action API của Wikimedia với timeout 5 giây, exponential backoff cho HTTP 429 và kỹ thuật gộp truy vấn đang bay SingleFlight.
  - Động cơ điểm số Karma hợp tác (`WordChainKarmaService`, `DEC-002`, `DEC-007`):
    - Tần suất ký tự chuẩn hóa từ kho ngữ liệu Leipzig Wortschatz (`scores_en.json`) với giá trị kỳ vọng 1.0 và fallback an toàn 1.0.
    - Cơ chế phân rã lặp hậu tố hàm mũ phạt các chuỗi spam từ cùng đuôi.
  - Tầng Service `WordChainRoleService` (`DEC-008`):
    - Đánh giá vai trò Reliable Role (Karma > 25.0 & Accuracy > 97.5%) và Failed Role (chuỗi phạt cần 30 từ hợp lệ để chuộc lỗi).
- **Bộ 7 Sự Kiện Gateway Discord (`src/features/wordchain/events/`):**
  - `wordchain-message.event.ts`: Bắt từ trong kênh chơi đã đăng ký, phản ứng emoji chính xác và cập nhật chuỗi.
  - `wordchain-edit.event.ts` & `wordchain-delete.event.ts`: Phát hiện hành vi sửa hoặc xóa tin nhắn đã được bot chấp nhận để cảnh báo trong kênh (anti-cheat).
  - `wordchain-guild-join.event.ts` & `wordchain-guild-leave.event.ts`: Quản lý chu kỳ sống và thời gian ân hạn 7 ngày (`DEC-006`).
  - `wordchain-ready.event.ts`: Quét kiểm tra trạng thái kênh khi bot khởi động; triệt tiêu lời chào phục hồi nếu tin nhắn cuối khớp với từ hiện tại.
  - `wordchain-interaction.event.ts`: Điều hướng Dropdown Select Menu cho `/wordchain help` và Autocomplete động cho whitelist, blacklist, language_code.
- **Tác vụ Ngầm Định Kỳ (`wordchain-cleanup.job.ts`):**
  - Watchdog cron `0 0 * * *` tự động dọn dẹp dữ liệu của các máy chủ đã rời quá 7 ngày (`DEC-006`).
- **Bộ Lệnh Slash Commands Đầy Đủ (DEC-008):**
  - Root command `/wordchain`: 6 subcommands (`check`, `definition`, `leaderboard`, `stats`, `languages`, `help`).
  - Root command `/wordchain-manage`: 7 subcommands/groups (`channel`, `role`, `language`, `blacklist`, `whitelist`, `reset-stats`, `admin`).
  - Quyền quản trị GDPR: `/wordchain-manage admin purge-user` (xóa dữ liệu người dùng toàn cục theo điều 17 GDPR), `purge-server`, `ban-member`, `ban-server`.
- **Cơ sở Dữ liệu & Prisma Schema:**
  - 8 Prisma models: `WordChainConfig`, `WordChainMember`, `WordChainUsedWord`, `WordChainBlacklist`, `WordChainWhitelist`, `WordChainWordCache`, `WordChainBannedMember`, `WordChainBannedGuild`.
  - Migration đồng bộ với khóa chính phức hợp `language_word`.
- **Bản địa hóa & Kiểm thử:**
  - Từ điển song ngữ `vi` / `en` chuẩn Zero `any` tại `wordchain.locale.ts`.
  - Bộ 40 automated test cases phủ toàn bộ domain, service, game engine và discord events.

---

## [0.5.0] - 2026-10-22 [FEAT-04: Voice Keeper 24/7 (Treo Kênh Thoại & Tự Phục Hồi)]

### Đã thêm (Added)
- **Kiến trúc & Động cơ Quản lý Kênh Thoại 24/7 (Voice Keeper Engine):**
  - Xây dựng lát cắt độc lập `src/features/voice-keeper/` tuân thủ nghiêm ngặt mô hình Vertical Slice và Zero Cross-Feature Import.
  - Tầng Service `VoiceKeeperService` (`voice-keeper.service.ts`) quản lý VoiceConnection Pool per-guild, tự động tham gia (`joinVoiceChannel`), ngắt kết nối an toàn và theo dõi độ trễ ping WebSocket.
  - Cơ chế tự phục hồi 3 tầng (Three-Tier Self-Healing):
    - **Tầng Khởi động (`voice-ready.event.ts`):** Quét toàn bộ máy chủ kích hoạt `isEnabled = true` trong Database khi bot khởi động (`ClientReady`) để thiết lập lại kết nối tự động.
    - **Tầng Gateway Reactive (`voice-state-update.event.ts`):** Lắng nghe sự kiện `voiceStateUpdate` để phát hiện ngay khi bot bị disconnect/kick ngoài ý muốn hoặc bị di chuyển sang kênh khác, tự động khôi phục về kênh cấu hình.
    - **Tầng Watchdog Chủ động (`voice-health.job.ts`):** Chạy ngầm định kỳ mỗi 10 phút (`*/10 * * * *`) kiểm tra tình trạng kết nối ngầm và tái kích hoạt các kênh bị rớt mà không phát sự kiện.
  - Hệ thống bảo vệ Gateway:
    - **Exponential Backoff:** Giãn cách thời gian thử lại (`5s, 15s, 45s, 90s, 180s`) khi gặp sự cố mạng hoặc lỗi kết nối.
    - **Circuit Breaker:** Ngắt kết nối và chuyển sang trạng thái `SUSPENDED` sau 5 lần thử lại thất bại liên tiếp để chống spam Discord API rate limits.
  - Tối ưu băng thông mạng và quyền riêng tư: Mặc định bật `selfDeaf: true` và `selfMute: true`.
- **Bộ Lệnh Slash Command (`/voice_keeper`):**
  - Triển khai Root Command `/voice_keeper` với 4 subcommands:
    - `/voice_keeper set <channel> [self_deaf] [self_mute] [auto_reconnect]`: Thiết lập và kết nối kênh thoại 24/7 (yêu cầu quyền `ManageChannels` hoặc `Administrator`).
    - `/voice_keeper status`: Xem trạng thái kết nối, trạng thái cờ mic/deaf, ping, thời gian kết nối và số lần retry.
    - `/voice_keeper reconnect`: Ép kết nối lại ngay lập tức và reset bộ đếm retry.
    - `/voice_keeper stop`: Ngắt kết nối và tắt chế độ 24/7 trên máy chủ.
- **Xử lý An toàn Khi Kênh Bị Xóa (`voice-channel-delete.event.ts`):**
  - Tự động phát hiện khi kênh thoại đang treo bị xóa khỏi Discord để tắt cấu hình trong DB và ngắt kết nối an toàn, tránh rơi vào vòng lặp lỗi.
- **Cơ sở Dữ liệu & Prisma Schema:**
  - Bổ sung model Prisma `VoiceKeeperConfig` tại `src/shared/db/schema.prisma`.
  - Thực thi migration `20261022012405_add_voice_keeper_config`.
- **Bản địa hóa & Tài liệu:**
  - Từ điển song ngữ `vi` / `en` chuẩn Zero `any` tại `voice-keeper.locale.ts`.
  - Đặc tả yêu cầu chi tiết tại `FRD.md` và cẩm nang vận hành tại `README.md`.

---

## [0.4.0] - 2026-10-22 [FEAT-03: Swarm Linked Roles & Connection Metadata Engine]

### Đã thêm (Added)
- **Kiến trúc & Động cơ Metadata (Connection Metadata Engine):**
  - Xây dựng lát cắt độc lập hoàn toàn `src/features/swarm-linked-roles/` tuân thủ kiến trúc Vertical Slice.
  - Tầng Service `SwarmMetadataService` (`swarm-metadata.service.ts`) quản lý giao tiếp trực tiếp với Discord REST API (`PUT /users/@me/applications/{id}/role-connection`) và đăng ký schema metadata ở cấp độ Application.
  - Tầng Service `SwarmAuthService` (`swarm-auth.service.ts`) xử lý toàn bộ luồng OAuth2 (`identify`, `role_connections.write`), đổi authorization code lấy token, bảo vệ chống CSRF bằng chữ ký HMAC-SHA256, và cơ chế tự động refresh access token trước khi hết hạn.
  - Tầng Service `SwarmOperatorService` (`swarm-operator.service.ts`) thực thi mô hình phân quyền 2 tầng: Bot Owner (Super Admin) và Delegated Operator.
  - Tầng Service `SwarmNotificationService` (`swarm-notification.service.ts`) quản lý kênh thông báo per-guild, phát Embed thăng cấp và thu hồi role trang trọng.
- **Tích hợp Web Server Kép (Fastify BotRoute):**
  - Triển khai `swarm.route.ts` với prefix `/auth`, tự động nạp qua `route.loader.ts`.
  - Endpoint `GET /auth/discord/login` điều hướng sang Discord consent screen.
  - Endpoint `GET /auth/discord/callback` xác thực state, trao đổi mã token, cập nhật metadata tức thì và trả về trang HTML thông báo thành công với giao diện dark mode hiện đại.
- **Bộ Lệnh Slash Command (`/swarm`):**
  - Triển khai Root Command `/swarm` với 6 subcommands độc lập:
    - `/swarm set <user> <level>`: Operator gán cấp độ từ 1 đến 8 và đẩy dữ liệu lên Discord.
    - `/swarm remove <user>`: Operator thu hồi cấp độ về 0 để Discord gỡ role.
    - `/swarm status [user]`: Tra cứu hồ sơ cấp độ, trạng thái OAuth2 và người cập nhật.
    - `/swarm link`: Nhận liên kết xác thực Discord OAuth2 an toàn.
    - `/swarm delegate add|remove|list`: Bot Owner ủy quyền hoặc gỡ quyền Operator.
    - `/swarm channel set|remove`: Operator cấu hình kênh nhận thông báo thăng cấp/thu hồi.
- **Công cụ CLI & Script Triển khai:**
  - Script CLI `register-metadata.ts` và lệnh `npm run deploy:metadata` để đăng ký schema `swarm_level` (Integer Equal) lên Discord Developer Portal.
- **Cơ sở Dữ liệu & Prisma Schema:**
  - Bổ sung 4 model Prisma mới: `SwarmMemberMetadata`, `SwarmOAuthToken`, `SwarmOperator`, `SwarmGuildConfig`.
  - Thực thi migration `20261021174647_add_swarm_linked_roles`.
- **Bản địa hóa & Tài liệu:**
  - Từ điển song ngữ `vi`/`en` chuẩn Zero `any` tại `swarm.locale.ts`.
  - Bản đặc tả yêu cầu `FRD.md` và cẩm nang vận hành `README.md`.

---

## [0.3.0] - 2026-10-21 [FEAT-02: Perks Management - Donator (Time-Bank & Hybrid Retention)]

### Đã thêm (Added)
- **Nghiệp vụ Cốt lõi & Động cơ Quỹ Thời Gian (Time-Bank Engine):**
  - Xây dựng tầng Service trung tâm `DonatorPerkService` (`donator-perk.service.ts`) quản lý toàn diện vòng đời tài khoản Donator.
  - Cơ chế **Lazy Evaluation Engine**: Tính toán tiêu hao credit chính xác theo $\Delta t$ và burn rate ($1.0x$ khi trang bị, $0.2x$ khi cất kho, $0.0x$ khi đóng băng tắt tính năng).
  - Tối ưu an toàn bộ nhớ: Hàm `getAccountStatus()` thực hiện tính toán thuần túy in-memory (`commit = false`), tuyệt đối không ghi/cập nhật DB, loại bỏ nguy cơ khóa ghi SQLite.
  - Đòn bẩy Thưởng Kép (Hybrid Multiplier): Thưởng giá trị nạp (Volume Bonus $10\% - 35\%$) và Thưởng chuỗi tuần (Weekly Streak Bonus $+5\% - +20\%$) neo cứng múi giờ UTC+7 (`Asia/Ho_Chi_Minh`).
  - Hỗ trợ trần tích lũy chuỗi vinh danh `WeeklyStreakRule.MAX_STREAK = 100` tuần, trong khi trần thưởng kinh tế neo cố định tại mốc $\ge 4$ tuần (`MAX_BONUS_STREAK_TIER = 4`).
- **Gateway Events & Scheduled Background Jobs:**
  - `donator-leave.event.ts`: Lắng nghe sự kiện `Events.GuildMemberRemove` để tự động chốt nợ credit ở tốc độ $1.0x$ và chuyển sang trạng thái cất kho ($0.2x$) nhằm bảo lưu tối đa thời gian cho thành viên khi rời server.
  - `donator-cleanup.job.ts`: Cron job định kỳ mỗi 10 phút (`*/10 * * * *`) tự động quét và thu hồi role của các tài khoản cạn quỹ credit (`creditSeconds <= 0`), hỗ trợ xử lý an toàn lỗi Discord API 50007 (khi user chặn DM) và fallback thông báo sang kênh đã cấu hình.
  - `donator-decay.job.ts`: Cron job chạy lúc 00:00 Thứ Hai hàng tuần (UTC+7) thực hiện suy giảm mềm (-1 streak) cho các user không đạt hạn mức tuần trước.
- **Cơ sở Dữ liệu & Prisma Schema:**
  - Bổ sung 3 model Prisma mới: `DonatorPerkConfig`, `DonatorAccount`, `DonatorTransaction` với khóa ngoại, unique constraints và index tối ưu.
  - Thực thi migration `20261021002237_add_donator_perk_models`.
- **Giao diện & Bộ Lệnh Slash Command (`/perk donator`):**
  - Xây dựng từ điển bản địa hóa song ngữ `vi`/`en` chuẩn Zero `any` tại `src/features/perks/donator/donator.locale.ts`.
  - Triển khai 9 Subcommand Executors độc lập trong `src/features/perks/donator/subcommands/`:
    - `donator-info.sub.ts`: Bảng quy đổi cơ sở (200k = 30 ngày), bảng thưởng Volume (10% - 35%), thưởng Streak (5% - 20%), cơ chế cất kho (0.2x) và đóng băng bảo lưu (0.0x).
    - `donator-status.sub.ts`: Tra cứu chi tiết số dư credit, trạng thái trang bị/cất kho, chuỗi streak tuần này và ngày dự kiến cạn quỹ (bảo vệ quyền riêng tư, chỉ Administrator được xem người khác).
    - `donator-equip.sub.ts`: Thành viên tự chủ động đeo role và kích hoạt tốc độ tiêu hao 1.0x.
    - `donator-unequip.sub.ts`: Thành viên tự chủ cất role vào kho tiết kiệm, giảm tốc độ tiêu hao 5 lần (0.2x).
    - `donator-add.sub.ts`: Administrator ghi nhận khoản ủng hộ, tự động áp dụng công thức thưởng kép, cộng credit và cấp role tức thì.
    - `donator-adjust.sub.ts`: Administrator điều chỉnh tăng/giảm quỹ thời gian credit có ghi nhận lý do.
    - `donator-setstreak.sub.ts`: Administrator can thiệp thủ công bậc streak cho thành viên (0 đến 100).
    - `donator-config.sub.ts`: Cấu hình hệ thống Donator Perk (xem cấu hình `view`, gán role `set_role` có kiểm tra Bot Role Hierarchy, cài đặt kênh thông báo `set_channel`).
    - `donator-toggle.sub.ts`: Administrator Bật/Tắt tính năng Donator Perk (kèm cơ chế đóng băng thời gian 0.0x khi tắt).
  - Tích hợp Subcommand Group `donator` vào Root Command `/perk` (`perks.command.ts`).

### Đã thay đổi (Changed)
- Cập nhật `/perk list` (`list.sub.ts`): Bổ sung phần giới thiệu chi tiết quyền lợi Donator (Gói ủng hộ tự chủ & Thưởng kép).
- Cập nhật `/perk status` (`status.sub.ts`): Bổ sung section "Donator Status" hiển thị hài hòa bên dưới "Booster Status" khi thành viên có credit.
- Nâng cấp phiên bản toàn hệ thống lên `v0.3.0`.

---

## [0.2.8] - 2026-10-19 [FEAT-01: Perks - Booster Housekeeping]

### Đã thêm (Added)
- Bắt buộc kiểm tra mã màu chính (`color1`) khi thành viên cấu hình Custom Role dạng gradient (`color2`) lần đầu (`MISSING_PRIMARY_COLOR`).

### Đã thay đổi (Changed)
- Danh xưng trong lệnh `/perk server_booster role_view` tự động điều chỉnh phù hợp khi Staff có quyền `ManageRoles` tra cứu hồ sơ người dùng khác trong thời gian ân hạn (`của <user>`).
- Chuẩn hóa 100% cờ hiển thị riêng tư từ `ephemeral: true` sang `flags: MessageFlags.Ephemeral` theo chuẩn Discord.js v14.18+.

### Đã xóa (Removed)
- Xóa bỏ bảng và model `RoleUpdateQueue` khỏi database Prisma (thực thi migration `20261019051555_remove_role_update_queue`).
- Loại bỏ kiểu dữ liệu `QueueStatus` thừa trong `perks.types.ts`.

### Tái cấu trúc & Đồng bộ (Refactored)
- Tái cấu trúc hệ thống tài liệu toàn dự án: Tách 80 dòng lịch sử khởi tạo nền tảng sang [`docs/history/01-foundation-core.md`](./docs/history/01-foundation-core.md).
- Tinh gọn [`docs/ROADMAP.md`](./docs/ROADMAP.md) thành Executive Dashboard theo các Workstream Tracks (`FEAT`, `WEB`, `CORE`).

---

## [0.2.7] - 2026-10-19 [FEAT-01: Interactive Unboost Workflow]

### Đã thêm (Added)
- Quy trình unboost tương tác (**Interactive Unboost Workflow**) dành cho Administrator khi đặt số lượt boost về `0` cho thành viên đang sở hữu Custom Role:
  - Cung cấp 2 nút bấm tương tác: `Tiêu Chuẩn (Ân hạn 7 ngày)` và `Can Thiệp (Thu hồi & xóa role ngay lập tức)`.
  - Cơ chế bảo mật 2 lớp: Chỉ Admin đã gõ lệnh mới có quyền xác nhận bấm nút.

---

## [0.2.6] - 2026-10-18 [FEAT-01: Unified Booster Resolution]

### Đã thêm (Added)
- Cơ chế nhận diện Booster hợp nhất (**Unified Booster Resolution**): Thành viên được công nhận là Booster khi có `member.premiumSince != null` trên Discord HOẶC có số lượt boost ghi nhận trong DB `boostCount > 0`.
- Cho phép tài khoản thử nghiệm được gán boost thủ công có thể nhận và cấu hình role đầy đủ như booster thật.

---

## [0.2.5] - 2026-10-18 [FEAT-01: Enhanced Role Colors Automation]

### Đã thêm (Added)
- Tự động hóa 100% đổi màu Gradient 2 màu trực tiếp qua Discord API v10 (`EnhancedRoleColors`).
- Biến đổi màu tức thì trên server sau 0.5s mà không cần Staff duyệt thủ công.

---

## [0.2.4] - 2026-10-18 [FEAT-01: Single Color Reset Fix]

### Đã sửa (Fixed)
- Sửa lỗi kẹt mã màu gradient cũ (`roleColor2`) trong database khi người dùng cấu hình Custom Role từ gradient chuyển về màu đơn sắc.

---

## [0.2.3] - 2026-10-18 [FEAT-01: Restructuring & Grace Period]

### Đã thêm (Added)
- Tách cấu trúc thư mục nội bộ `perks/` thành `common/` (lệnh dùng chung) và `booster/` (nghiệp vụ booster).
- Bổ sung bộ đếm ngược cảnh báo thời gian ân hạn trong lệnh `/perk server_booster role_view`.

---

## [0.2.1] - [0.2.2] - 2026-10-17 [FEAT-01: Authoritative Baseline]

### Đã thêm (Added)
- Bổ sung subcommand `/perk server_booster set_boost user:<@User> count:<number>` dành riêng cho Administrator để đồng bộ số lượt boost chuẩn khi phát sinh sai lệch từ Gateway.

---

## [0.2.0] - 2026-10-17 [FEAT-01: Server Booster Perks Initial Release]

### Đã thêm (Added)
- Khởi tạo lát cắt tính năng `FEAT-01: Server Booster Perks`:
  - Quản lý Custom Role độc quyền cho Booster.
  - Quản lý phân cấp Role Hierarchy thông qua `anchorRoleId`.
  - Bộ lệnh Slash `/perk list`, `/perk status`, `/perk server_booster info|role_view|role_claim|role_unclaim|role_config`.
  - Cron Job định kỳ 10 phút quét dọn và thu hồi Custom Role quá hạn 7 ngày ân hạn.

---

## [0.1.0] - 2026-10-16 [CORE-01: Platform Foundation & Dynamic Loaders]

### Đã thêm (Added)
- Dựng toàn bộ kiến trúc lõi Vertical Slice Architecture.
- Thiết lập TypeScript Strict Mode (ESM NodeNext), Zod Configuration Validation, Pino Logger.
- Singleton `AsyncEventBus` (Error Boundary cô lập, `maxListeners: 50`).
- Cơ chế nạp động (Dynamic Loaders): `command.loader.ts`, `event.loader.ts`, `job.loader.ts`, `route.loader.ts`.
- Cơ sở dữ liệu Prisma với SQLite WAL Mode (`dev.db`).
- Fastify HTTP Web Server chạy song song phục vụ REST API và OAuth2 Linked Roles.
- Quy trình ngắt an toàn Graceful Shutdown bắt `SIGINT` / `SIGTERM`.

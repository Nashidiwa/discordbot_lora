# ENGINEERING CONVENTIONS & CODING STANDARDS

Tài liệu này xác định các quy chuẩn kỹ thuật, phong cách lập trình (style guide), cơ chế xử lý lỗi và quy ước tương tác Discord áp dụng bắt buộc cho toàn bộ dự án. Mọi đoạn code được sinh ra phải tuân thủ nghiêm ngặt các điều luật dưới đây.

---

## 1. Tiêu chuẩn TypeScript & Kiểm soát Kiểu dữ liệu

### 1.1. Chính sách Không Khoan nhượng với `any` (Zero `any` Policy)
* **Cấm tiệt từ khóa `any`:** Không sử dụng `any` trong bất kỳ hoàn cảnh nào (bao gồm cả type casting dạng `as any`).
* **Xử lý dữ liệu chưa rõ kiểu:** Sử dụng `unknown`. Trước khi thao tác trên dữ liệu `unknown`, bắt buộc phải thu hẹp kiểu dữ liệu (type narrowing) thông qua Type Guards, `instanceof`, `typeof` hoặc Zod schema.
* **Strict Mode:** Toàn bộ codebase phải vượt qua trình biên dịch TypeScript với `strict: true`, `noImplicitAny: true` và `strictNullChecks: true`.

### 1.2. Xác thực Dữ liệu Runtime với Zod
* Mọi dữ liệu đi vào hệ thống từ ranh giới bên ngoài (External Boundaries) bắt buộc phải được định nghĩa schema và parse qua **Zod**:
  1. Biến môi trường hệ thống (`.env`).
  2. Request Body, Query Params và Headers từ HTTP Endpoints (Fastify).
  3. Payload từ Webhooks hoặc REST API của bên thứ ba.
* **Đồng nhất Kiểu (Single Source of Truth):** Sử dụng `z.infer<typeof Schema>` để trích xuất TypeScript type tự động từ Zod schema, không khai báo lại interface thủ công.

### 1.3. Kiểu Liệt kê (Enums vs Literal Unions)
* **Cấm sử dụng TypeScript `enum`:** Tránh sinh mã JavaScript phức tạp và lỗi so sánh lỏng lẻo.
* **Chuẩn hóa bằng Object `as const`:**
  ```typescript
  export const FeatureStatus = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    SUSPENDED: 'SUSPENDED',
  } as const;

  export type FeatureStatus = typeof FeatureStatus[keyof typeof FeatureStatus];

---

## 2. Quy chuẩn Vòng đời Tương tác Discord (Discord UI Lifecycle)

### 2.1. Quy tắc Phản hồi & Hoãn phản hồi 2.5 Giây (The 2.5s Interaction Lifecycle)

Discord Gateway sẽ hủy bỏ interaction nếu không nhận được phản hồi (ACK) trong vòng 3 giây. Tuy nhiên, cơ chế ACK phải áp dụng chính xác theo từng loại interaction:

* **ChatInputCommand & ModalSubmit có tác vụ I/O:** Bắt buộc gọi `await interaction.deferReply(...)` ngay tại dòng đầu tiên của hàm xử lý (truy vấn Database, gọi API ngoài, tính toán tốn thời gian). Sau khi đã `deferReply()`, mọi phản hồi tiếp theo phải sử dụng `await interaction.editReply(...)`.
* **Phản hồi tức thì (< 10ms):** Chỉ những lệnh thuần tính toán bộ nhớ (đọc cache in-memory, text tĩnh) mới được phép dùng trực tiếp `await interaction.reply(...)`.
* **Ngoại lệ bắt buộc 1 - Autocomplete (`AutocompleteInteraction`):** CẤM TIỆT gọi `deferReply()`. Discord API không hỗ trợ hoãn autocomplete. Bắt buộc phải trả kết quả gợi ý trực tiếp qua `await interaction.respond(...)` trong vòng 3 giây.
* **Ngoại lệ bắt buộc 2 - Mở Modal (`showModal`):** Theo Discord API, Modal CHỈ CÓ THỂ hiển thị khi interaction chưa được acknowledge. CẤM gọi `deferReply()` trước khi mở Modal; bắt buộc phải gọi trực tiếp `await interaction.showModal(...)`.
* **Ngoại lệ bắt buộc 3 - Cập nhật Component (`ButtonInteraction`, `SelectMenuInteraction`):** Ưu tiên sử dụng `await interaction.deferUpdate()` nếu mục đích chỉ là cập nhật nội dung/trạng thái trên chính message hiện tại. Chỉ dùng `deferReply({ ephemeral: true })` khi cần sinh ra một phản hồi mới độc lập cho người click.

### 2.2. Chính sách Hiển thị Thông tin (Ephemeral vs Public)

* **Bắt buộc `ephemeral: true`:**
* Toàn bộ thông báo lỗi, cảnh báo, hướng dẫn nhập liệu.
* Các tác vụ quản trị, moderation, cấu hình hệ thống.
* Các thông tin nhạy cảm mang tính cá nhân (trạng thái quyền lợi, liên kết tài khoản).


* **Công khai (`ephemeral: false`):**
* Các tương tác mang tính tập thể, trò chơi cộng đồng, trạng thái kênh thoại hoặc phát nhạc.



### 2.3. Quy chuẩn Định dạng `customId` cho Components

Mọi Button, Select Menu, Modal tương tác phải tuân theo cấu trúc phân tách bằng dấu hai chấm, tối đa 100 ký tự:

```text
<feature>:<action>:<payload>

```

* `<feature>`: Định danh module tính năng (dùng để Core Router chuyển tiếp tương tác).
* `<action>`: Hành động cần thực thi (ví dụ: `confirm`, `cancel`, `vote`, `claim`).
* `<payload>`: Dữ liệu đính kèm (ID người dùng, ID thực thể, số trang...).

### 2.4. Bảng Màu Embed Thống nhất (Design Palette)

Toàn bộ Embed phải nhập mã màu từ `src/shared/constants/colors.ts`, cấm hardcode mã hex rải rác:

```typescript
export const EmbedColor = {
  PRIMARY: 0x5865F2,  // Discord Blurple - Giao diện chung
  SUCCESS: 0x57F287,  // Xanh lá - Tác vụ thành công
  ERROR: 0xED4245,    // Đỏ - Lỗi, thất bại
  WARNING: 0xFEE75C,  // Vàng/Cam - Cảnh báo, hết hạn, trạng thái chờ
  MUTED: 0x2B2D31,    // Xám đậm - Thông tin phụ, footer
} as const;
```

* **Quy chế Đề xuất & Bổ sung Màu Sắc:** Cả Chief Architect & Prompt Director lẫn Lead Developer đều có quyền chủ động đề xuất mã màu phù hợp với từng giao diện/tính năng đặc thù (như bảng xếp hạng, mini-game, quản lý quyền lợi). Khi áp dụng, **bắt buộc phải khai báo màu mới vào `src/shared/constants/colors.ts` trước**, sau đó trích xuất dưới dạng hằng số (`EmbedColor.<TÊN_MÀU>`). Nghiêm cấm tuyệt đối việc gõ trực tiếp mã màu hex/decimal bên trong các file logic hoặc UI.

---

## 3. Kiến trúc Xử lý Lỗi (Exception Architecture)

### 3.1. Phân loại Lỗi với `AppError`

Mọi ngoại lệ nghiệp vụ có chủ đích phải kế thừa từ `AppError` đặt tại `src/core/errors.ts`:

```typescript
export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(message: string, code: string = 'INTERNAL_ERROR', isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

```

* **Lỗi Nghiệp vụ (`isOperational: true`):** Lỗi do người dùng nhập sai, vi phạm điều kiện, thiếu quyền... Trả về thông báo lỗi cho người dùng, không ghi log stack trace.
* **Lỗi Hệ thống (`isOperational: false`):** Lỗi không lường trước (Database disconnect, Network timeout, Type crash)... Ghi full stack trace vào Logger, trả về thông báo lỗi hệ thống chung cho người dùng.

### 3.2. Cấm "Nuốt Lỗi" (No Silent Swallowing)

* Tuyệt đối cấm các khối `catch (e) {}` rỗng hoặc chỉ `console.log(e)`.
* Trong các tầng Service: Khi bắt được lỗi, phải bổ sung context và re-throw hoặc chuyển đổi thành `AppError`.
* Trong các file Command: Không cần bọc `try/catch` thủ công nếu chỉ để báo lỗi; hãy để lỗi văng lên Error Boundary tập trung tại `core/events/interactionCreate.ts`.

---

## 4. Quy chuẩn Đa Ngôn ngữ (i18n & Localization)

### 4.1. Chuỗi Phân giải Ngôn ngữ (Locale Resolution Chain)

Hệ thống xác định ngôn ngữ phản hồi theo thứ tự ưu tiên:

1. **User/Guild Preference:** Cài đặt lưu trong Database (nếu feature hỗ trợ và người dùng đã cấu hình).
2. **Discord Client Locale:** Ngôn ngữ từ ứng dụng Discord của người dùng (`interaction.locale`). Nếu là `en-US` hoặc `en-GB`, ưu tiên hiển thị tiếng Anh.
3. **Mặc định Hệ thống (Fallback):** Tiếng Việt (`vi`).

### 4.2. Cấu trúc Từ điển Bản địa hóa

Mỗi feature hỗ trợ đa ngôn ngữ phải có tệp `<feature>.locale.ts` độc lập:

```typescript
export const featureLocale = {
  vi: {
    ACTION_SUCCESS: 'Thao tác thành công.',
    USER_NOT_FOUND: 'Không tìm thấy người dùng.',
  },
  en: {
    ACTION_SUCCESS: 'Action completed successfully.',
    USER_NOT_FOUND: 'User not found.',
  },
} as const;

```

* Phản hồi người dùng phải trích xuất từ file locale hoặc helper chuẩn, cấm viết chuỗi `if (lang === 'en')` rải rác trong code nghiệp vụ.

### 4.3. Luật Bất biến về Thuật ngữ Kỹ thuật

* **Giữ nguyên Tiếng Anh:** Tên tính năng riêng, tên bậc role (ví dụ: `Server Booster`, `Donator`), thuật ngữ kỹ thuật (`Cooldown`, `Timeout`, `OAuth2`, `Channel`, `Role`, `Permission`, `Slash Command`).
* Không dịch gượng gạo các danh từ kỹ thuật chuẩn.

---

## 5. Quy chuẩn Ghi Log (Logging Standards)

### 5.1. Bộ Ghi Log Tập trung

* Cấm tiệt việc dùng `console.log`, `console.error`, `console.warn`.
* Sử dụng duy nhất instance `logger` từ `src/core/logger.ts` (dựa trên thư viện **Pino**).

### 5.2. Cấu trúc Log có Ngữ cảnh (Structured Logging)

Mọi bản ghi log (đặc biệt là log Error và Warn) bắt buộc phải truyền object ngữ cảnh ở tham số đầu tiên, message ở tham số thứ hai:

```typescript
// Chuẩn:
logger.error({ err, userId: interaction.user.id, guildId: interaction.guildId }, 'Failed to execute command');

// Cấm:
logger.error('Failed to execute command: ' + err.message);

```

* **Bảo mật:** Tuyệt đối không log thông tin chứa token, mật khẩu, authorization code, webhook URL hoặc payload nhạy cảm.

---

## 6. Quy ước Đặt tên (Naming Conventions)

| Đối tượng | Quy ước | Ví dụ |
| --- | --- | --- |
| **Thư mục feature** | `kebab-case` | `perks`, `wordchain`, `voice-keeper` |
| **Tệp tin (theo vai trò)** | `kebab-case.<role>.ts` | `rank.command.ts`, `join.event.ts`, `cleanup.job.ts` |
| **Slash Command (Tên)** | Chữ thường, không dấu cách | `/ping`, `/perk`, `/wordchain` |
| **Slash Command (Mô tả)** | Viết hoa chữ đầu, có dấu chấm | `"Hiển thị độ trễ của hệ thống."` |
| **Lớp (Class)** | `PascalCase` | `VoiceKeeperService`, `ExtendedClient` |
| **Hàm & Phương thức** | `camelCase` (bắt đầu bằng động từ) | `calculateExpirationDate`, `fetchMemberData` |
| **Biến & Thuộc tính** | `camelCase` (danh từ rõ nghĩa) | `guildId`, `userCache`, `retryAttempts` |
| **Hằng số & Enums** | `UPPER_SNAKE_CASE` | `DEFAULT_PORT`, `MAX_RETRY_COUNT` |
| **TypeScript Interface/Type** | `PascalCase` | `CommandContext`, `BotJobConfig` |


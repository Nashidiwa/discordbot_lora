# Word Chain Feature (`src/features/wordchain`)

Trò chơi nối từ thông minh nhiều người chơi theo lượt, tích hợp bộ thẩm định từ vựng 3 tầng (Three-Tier Lexicon Engine), hệ số điểm Karma hợp tác chống spam hậu tố (Cooperative Karma & Suffix Decay), và cơ chế quản trị máy chủ linh hoạt.

---

## 1. Kiến Trúc & Cấu Trúc Thư Mục

Tính năng được xây dựng theo mô hình **Vertical Slice Architecture**, độc lập hoàn toàn và tuân thủ nguyên tắc **Zero Cross-Feature Imports**:

```
src/features/wordchain/
├── assets/
│   ├── dictionary_en_common.json      # Tier 1: Tập từ vựng thông dụng nạp sẵn trong RAM
│   ├── scores_en.json                 # Tần suất xuất hiện token (Normal & Hard mode)
│   └── README.md                      # Nguồn gốc Leipzig Wortschatz, pipeline & bản quyền CC
├── events/
│   ├── wordchain-message.event.ts     # Lắng nghe từ nộp trong kênh chơi (MessageCreate)
│   ├── wordchain-edit.event.ts        # Chống gian lận khi sửa tin nhắn (MessageUpdate)
│   ├── wordchain-delete.event.ts      # Chống gian lận khi xóa tin nhắn (MessageDelete)
│   ├── wordchain-guild-join.event.ts  # Khôi phục trạng thái khi tái gia nhập (GuildCreate)
│   ├── wordchain-guild-leave.event.ts # Đánh dấu thời điểm rời cho grace period (GuildDelete)
│   ├── wordchain-ready.event.ts       # Kiểm tra đồng bộ kênh chơi lúc bot khởi động (ClientReady)
│   └── wordchain-interaction.event.ts # Dropdown trợ giúp & Autocomplete (InteractionCreate)
├── jobs/
│   └── wordchain-cleanup.job.ts       # Cron dọn dẹp dữ liệu quá hạn 7 ngày (DEC-006)
├── services/
│   ├── wordchain-language.service.ts  # Xử lý ngôn ngữ, chuẩn hóa ký tự, token, dead-ends
│   ├── wordchain-karma.service.ts     # Tính điểm Karma, phân rã lặp hậu tố mũ (DEC-007)
│   ├── wordchain-role.service.ts      # Tiêu chí xét duyệt vai trò Reliable & Failed (DEC-008)
│   ├── wordchain-dictionary.service.ts# Kiến trúc từ điển 3 tầng & In-flight SingleFlight (DEC-003)
│   └── wordchain-game.service.ts      # Điều phối trạng thái ván chơi, Mutex FIFO, giao dịch DB
├── subcommands/
│   ├── check.sub.ts                   # /wordchain check <word>
│   ├── definition.sub.ts              # /wordchain definition <word>
│   ├── leaderboard.sub.ts             # /wordchain leaderboard [type] [metric] [scope] [mode]
│   ├── stats.sub.ts                   # /wordchain stats [type] [mode] [user]
│   ├── languages.sub.ts               # /wordchain languages
│   ├── help.sub.ts                    # /wordchain help
│   ├── channel-manage.sub.ts          # /wordchain-manage channel set/unset
│   ├── role-manage.sub.ts             # /wordchain-manage role set/unset
│   ├── language-manage.sub.ts         # /wordchain-manage language show-all/add/remove
│   ├── blacklist-manage.sub.ts        # /wordchain-manage blacklist add/remove/show
│   ├── whitelist-manage.sub.ts        # /wordchain-manage whitelist add/remove/show
│   ├── reset-stats.sub.ts             # /wordchain-manage reset-stats
│   └── admin-manage.sub.ts            # /wordchain-manage admin purge-user/purge-server/ban-*
├── types/
│   └── wordchain.types.ts             # Kiểu dữ liệu domain, enums, interface & Zod schemas
├── wordchain.command.ts               # Root slash command /wordchain (người dùng)
├── wordchain-manage.command.ts        # Root slash command /wordchain-manage (quản trị)
├── wordchain.constants.ts             # Hằng số cấu hình, biểu tượng cảm xúc, ngưỡng phạt
├── wordchain.locale.ts                # Từ điển song ngữ vi / en chuẩn type-safe
└── *.test.ts                          # Bộ kiểm thử đơn vị & tích hợp (40 tests)
```

---

## 2. Các Quyết Định Kỹ Thuật Đã Duyệt (DEC-001 -> DEC-008)

1. **DEC-001 (Phạm vi ngôn ngữ ban đầu):** Chỉ hỗ trợ tiếng Anh (`en`) trong đợt phát hành đầu tiên để ngăn chặn bẫy ngữ âm cụt đường của dấu thanh tiếng Việt.
2. **DEC-002 (Dữ liệu tần suất ký tự):** Tạo `scores_en.json` chuẩn hóa từ kho ngữ liệu Leipzig Wortschatz (Simple Wikipedia 300K). Giá trị kỳ vọng trung bình đạt 1.0. Tự động fallback về 1.0 nếu thiếu tệp.
3. **DEC-003 (Kiến trúc từ điển 3 tầng):**
   - **Tầng 1 (Local RAM Lexicon):** Nạp danh sách từ thông dụng từ `dictionary_en_common.json` để phản hồi tức thì.
   - **Tầng 2 (Database Cache):** Bảng `WordChainWordCache` với khóa chính phức hợp `[language, word]`. Positive cache lưu vĩnh viễn; Negative cache lưu 24 giờ.
   - **Tầng 3 (Wiktionary Fallback):** Truy vấn Wikimedia Action API với timeout 5 giây, exponential retry khi gặp HTTP 429 và cơ chế gộp truy vấn đang bay (In-flight Request Coalescing / SingleFlight). Lỗi mạng hoặc 5xx không bao giờ bị ghi đè thành từ không tồn tại.
4. **DEC-004 (Phạm vi quản trị):** Loại bỏ các lệnh Python không cần thiết (`/reload`, `/logging`, `/announce`). Tích hợp 4 công cụ quản trị cấp cao tuân thủ quyền riêng tư GDPR: Xóa người dùng toàn cục (`purge-user`), Xóa dữ liệu máy chủ (`purge-server`), Cấm thành viên (`ban-member`), Cấm máy chủ (`ban-server`).
5. **DEC-005 (Lazy Provisioning):** Cấu hình `WordChainConfig` chỉ được tạo khi máy chủ thực hiện thao tác gán kênh hoặc tương tác lệnh đầu tiên.
6. **DEC-006 (Thời gian ân hạn 7 ngày):** Lưu `leftAt` khi bot bị mời ra khỏi máy chủ. Tự động khôi phục dữ liệu nếu bot được mời lại trong vòng 7 ngày; xóa vĩnh viễn thông qua cron job hàng ngày nếu quá hạn 7 ngày.
7. **DEC-007 (Bộ nhớ lịch sử biến động):** Lịch sử 5 từ gần nhất per-guild được lưu trong RAM (`maxlen=5`), biến mất an toàn khi tiến trình khởi động lại.
8. **DEC-008 (Phân cấp Slash Command):** Gom toàn bộ chức năng vào 2 lệnh chính: `/wordchain` (Public) và `/wordchain-manage` (Manager / Admin).

---

## 3. Hệ Thống Điểm Karma & Chống Phá Chuỗi

- **Hàm Điểm Thước Đo (Token Score Function):**
  $$f(s) = \sqrt{s} + 0.025$$
- **Karma Cơ bản (Base Karma):**
  - Thành phần token bắt đầu ($s_1$): $k_1^* = \max(0, 1.0 - f(s_1))$ (thưởng khi tìm được từ bắt đầu bằng chữ cái hiếm).
  - Thành phần token kết thúc ($s_2$): $k_2 = f(s_2) - 1.0$ (thưởng khi để lại chữ cái kết thúc thân thiện, phổ biến cho đồng đội).
  - Tổng Karma cơ sở: $\kappa_{\text{base}} = k_1^* + 0.7 \times k_2$.
- **Suy giảm Lặp Hậu Tố Hàm Mũ (Exponential Suffix Decay):**
  - Trọng số mức độ gần đây cho $L$ từ gần nhất trong lịch sử bộ nhớ biến động:
    $$n_{\text{decay}} = \sum_{i=1}^L \frac{2(L - i)}{L} \cdot \mathbf{1}_{\{w_i\text{ có cùng hậu tố}\}}$$
  - Hệ số suy giảm:
    $$D = 2.0 \cdot e^{-0.33 \cdot n_{\text{decay}}} - 1.0$$
  - Điểm thưởng/phạt thực tế: $\Delta \kappa = \kappa_{\text{base}} \times D$ (nếu phạm quy làm đứt chuỗi, phạt trực tiếp $-5.0$ Karma).
- **Vai trò Tự động (Role Automation):**
  - **Reliable Role:** Dành cho người chơi tích cực có $\text{Karma} > 25.0$ và độ chính xác $\text{Accuracy} > 97.5\%$.
  - **Failed Role:** Tạm thời gán cho người làm đứt chuỗi; tự động gỡ bỏ sau khi người đó đóng góp đủ 30 từ hợp lệ tiếp theo.

---

## 4. Hướng Dẫn Kiểm Thử

Chạy toàn bộ 40 test suites của tính năng Word Chain:

```bash
# Chạy toàn bộ kiểm thử Word Chain
npx tsx --test src/features/wordchain/*.test.ts

# Kiểm tra biên dịch TypeScript
npm run build
```

export const EmbedColor = {
  PRIMARY: 0x5865f2, // Discord Blurple - Giao diện chung
  SUCCESS: 0x57f287, // Xanh lá - Tác vụ thành công
  ERROR: 0xed4245, // Đỏ - Lỗi, thất bại
  WARNING: 0xfee75c, // Vàng/Cam - Cảnh báo, hết hạn, trạng thái chờ
  MUTED: 0x2b2d31, // Xám đậm - Thông tin phụ, footer
} as const;

export type EmbedColor = (typeof EmbedColor)[keyof typeof EmbedColor];

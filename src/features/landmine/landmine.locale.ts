export const landmineLocale = {
  vi: {
    DEFAULT_SUCCESS_MSG:
      '{user} đã dẫm mìn rồi. Hết thời ăn may rồi cưng, mời bạn nhận một vé timeout thẳng tiến vào ô mất lượt!',
    DEFAULT_FAILED_MSG:
      '{user} đã dẫm mìn rồi nhưng có vẻ người đặt mìn chưa kiểm tra hạn sử dụng.',
    FOUNDATION_TITLE: '💥 Landmine Foundation',
    ADVANCED_TITLE: '🎲 Landmine Advanced',
    CUSTOM_TITLE: '💣 Landmine M{id}',
    STATIC_FOOTER: 'Tỉ lệ: {rate}% • Hình phạt: {duration}',
    DYNAMIC_FOOTER:
      'Xổ số: RM x{rm} (Tier {tier}: {rate}%) • PM x{pm} • Phạt: {duration}',
    ADMIN_ONLY:
      'Yêu cầu bị từ chối: Lệnh này chỉ dành riêng cho Server Administrator.',
    MODULE_NOT_FOUND: 'Không tìm thấy module mìn này.',
    CANNOT_DELETE_DEFAULT:
      'Không thể xóa 2 module mặc định (Foundation & Advanced). Bạn chỉ có thể dùng lệnh /landmine toggle để bật hoặc tắt.',
    MAX_MODULES_REACHED:
      'Máy chủ đã đạt giới hạn tối đa 10 module mìn (M1 - M10). Hãy xóa bớt module tùy chỉnh cũ (M3 - M10) trước khi tạo mới.',
    CANNOT_EDIT_DEFAULT_ALGORITHM:
      'Không thể chỉnh sửa tỉ lệ hoặc thời gian phạt của 2 module mặc định (Foundation & Advanced).',
    INVALID_RATE:
      'Tỉ lệ phần trăm phải nằm trong khoảng từ 0.01% đến 100% (ví dụ: 0.8 hoặc 5).',
    INVALID_DURATION:
      'Thời gian phạt phải nằm trong khoảng từ 5 giây đến tối đa 28 ngày (ví dụ: 60s, 5m, 1h).',
    TOGGLE_SUCCESS: 'Đã **{state}** module **{module}** thành công.',
    CREATE_SUCCESS:
      'Đã tạo thành công custom module **{module}** (Tỉ lệ: {rate}%, Phạt: {duration}). Trạng thái hiện tại: Đang tắt.',
    DELETE_SUCCESS: 'Đã xóa vĩnh viễn custom module **{module}**.',
    EDIT_SUCCESS: 'Cập nhật cấu hình module **{module}** thành công.',
    CHANNELS_SUCCESS:
      'Cập nhật phạm vi kênh cho **{module}** thành công! Chế độ: **{mode}** | Số kênh: **{count}**.',
    ROLES_SUCCESS:
      'Cập nhật phạm vi vai trò cho **{module}** thành công! Chế độ: **{mode}** | Số vai trò: **{count}**.',
    RESET_SUCCESS:
      'Đã làm mới (reset) dữ liệu bảng xếp hạng cho **{module}** thành công.',
    LOCALE_SET_SUCCESS:
      'Đã cập nhật chế độ ngôn ngữ của Landmine Embed thành: **{locale}**.',
    LEADERBOARD_EMPTY:
      'Chưa có dữ liệu dẫm mìn nào được ghi nhận trong phạm vi này.',
    LEADERBOARD_TITLE: '🏆 BẢNG VÀNG DẪM MÌN ({scope})',
    LEADERBOARD_FOOTER: 'Sắp xếp theo: {sortBy}',
    LEADERBOARD_STEPS: 'lần dẫm',
    LEADERBOARD_DETONATED: 'Nổ',
    LEADERBOARD_HIGH_AURA: 'Aura cao',
    LEADERBOARD_TOTAL_PUNISHMENT: 'Tổng thời gian phạt',
    LIST_TITLE: '💣 Danh Sách Mìn Server ({server})',
    LIST_DESC: 'Máy chủ hiện đang có **{count}** module mìn được cấu hình:',
    LIST_DYNAMIC_ALGO: 'Thuật toán: **Động 3 Bậc (0.1%-5m / 0.3%-2m / 1.0%-1m)**',
    LIST_ALL: 'Tất cả',
    LIST_CHANNEL_PREFIX: 'Kênh',
    LIST_ROLE_PREFIX: 'Role',
    LIST_AUTODEL_ON: '⏳ Tự xóa sau 15s',
    LIST_AUTODEL_OFF: 'Giữ tin nhắn',
    LIST_LB_ON: '📊 Tính BXH',
    LIST_LB_OFF: 'Không tính BXH',
    STATUS_ENABLED: 'Đang Bật',
    STATUS_DISABLED: 'Đang Tắt',
    SCOPE_ALL: 'Tất cả',
    SCOPE_WHITELIST: 'Chỉ áp dụng',
    SCOPE_BLACKLIST: 'Miễn trừ / Bỏ qua',
    NO_CHANNELS_FOUND:
      'Không tìm thấy ID hoặc tag kênh hợp lệ nào trong chuỗi đã nhập (Vui lòng tag #kênh hoặc nhập ID 17-20 chữ số).',
    NO_ROLES_FOUND:
      'Không tìm thấy ID hoặc tag vai trò hợp lệ nào trong chuỗi đã nhập (Vui lòng tag @role hoặc nhập ID 17-20 chữ số).',
  },
  en: {
    DEFAULT_SUCCESS_MSG:
      '{user} stepped on a landmine! Your luck just ran out, enjoy your express ticket to timeout!',
    DEFAULT_FAILED_MSG:
      '{user} stepped on a landmine, but it seems the mine installer forgot to check the expiration date!',
    FOUNDATION_TITLE: '💥 Landmine Foundation',
    ADVANCED_TITLE: '🎲 Landmine Advanced',
    CUSTOM_TITLE: '💣 Landmine M{id}',
    STATIC_FOOTER: 'Rate: {rate}% • Punishment: {duration}',
    DYNAMIC_FOOTER:
      'Roll: RM x{rm} (Tier {tier}: {rate}%) • PM x{pm} • Punishment: {duration}',
    ADMIN_ONLY:
      'Permission denied: This command requires Server Administrator privileges.',
    MODULE_NOT_FOUND: 'Landmine module not found.',
    CANNOT_DELETE_DEFAULT:
      'Cannot delete default modules (Foundation & Advanced). Use /landmine toggle to enable or disable them.',
    MAX_MODULES_REACHED:
      'Server has reached the maximum of 10 modules (M1 - M10). Delete an existing custom module (M3 - M10) before creating a new one.',
    CANNOT_EDIT_DEFAULT_ALGORITHM:
      'Cannot modify rate or punishment duration for default modules (Foundation & Advanced).',
    INVALID_RATE:
      'Percentage rate must be between 0.01% and 100% (e.g. 0.8 or 5).',
    INVALID_DURATION:
      'Punishment duration must be between 5 seconds and 28 days (e.g. 60s, 5m, 1h).',
    TOGGLE_SUCCESS: 'Successfully updated module **{module}** to **{state}**.',
    CREATE_SUCCESS:
      'Successfully created custom module **{module}** (Rate: {rate}%, Duration: {duration}). Default status: Disabled.',
    DELETE_SUCCESS: 'Successfully deleted custom module **{module}**.',
    EDIT_SUCCESS:
      'Successfully updated configuration for module **{module}**.',
    CHANNELS_SUCCESS:
      'Successfully configured channels for **{module}**! Mode: **{mode}** | Channel count: **{count}**.',
    ROLES_SUCCESS:
      'Successfully configured roles for **{module}**! Mode: **{mode}** | Role count: **{count}**.',
    RESET_SUCCESS:
      'Successfully reset leaderboard statistics for **{module}**.',
    LOCALE_SET_SUCCESS:
      'Successfully set Landmine Embed language mode to: **{locale}**.',
    LEADERBOARD_EMPTY: 'No landmine triggers recorded in this scope yet.',
    LEADERBOARD_TITLE: '🏆 LANDMINE LEADERBOARD ({scope})',
    LEADERBOARD_FOOTER: 'Sorted by: {sortBy}',
    LEADERBOARD_STEPS: 'steps',
    LEADERBOARD_DETONATED: 'Detonated',
    LEADERBOARD_HIGH_AURA: 'High Aura',
    LEADERBOARD_TOTAL_PUNISHMENT: 'Total punishment',
    LIST_TITLE: '💣 Server Landmine Modules ({server})',
    LIST_DESC: 'Server currently has **{count}** landmine modules configured:',
    LIST_DYNAMIC_ALGO: 'Algorithm: **Dynamic Chaos (0.1%-5m / 0.3%-2m / 1.0%-1m)**',
    LIST_ALL: 'All',
    LIST_CHANNEL_PREFIX: 'Channels',
    LIST_ROLE_PREFIX: 'Roles',
    LIST_AUTODEL_ON: '⏳ 15s auto-delete',
    LIST_AUTODEL_OFF: 'Keep message',
    LIST_LB_ON: '📊 Leaderboard: Yes',
    LIST_LB_OFF: 'Leaderboard: No',
    STATUS_ENABLED: 'Enabled',
    STATUS_DISABLED: 'Disabled',
    SCOPE_ALL: 'All',
    SCOPE_WHITELIST: 'Whitelist',
    SCOPE_BLACKLIST: 'Blacklist',
    NO_CHANNELS_FOUND:
      'No valid channel mentions or IDs found in the input (Please tag #channel or provide 17-20 digit Snowflake IDs).',
    NO_ROLES_FOUND:
      'No valid role mentions or IDs found in the input (Please tag @role or provide 17-20 digit Snowflake IDs).',
  },
} as const;

export type LandmineLocale = typeof landmineLocale.vi;

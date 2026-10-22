import { type SupportedLocale, t } from '../../shared/utils/i18n.util.js';

export const wordChainLocale = {
  vi: {
    // Lỗi hệ thống & phân quyền
    ERR_GUILD_ONLY: 'Lệnh này chỉ có thể sử dụng bên trong một máy chủ Discord.',
    ERR_PERMISSION_MANAGE_GUILD:
      'Bạn cần có quyền `Manage Server` hoặc `Administrator` để thực hiện thao tác này.',
    ERR_PERMISSION_ADMIN:
      'Bạn cần có quyền Quản trị viên hệ thống (Bot Owner / Operator) để thực hiện lệnh quản trị cấp cao này.',
    ERR_INVALID_WORD:
      'Từ nhập vào không hợp lệ. Từ phải chứa ít nhất 2 ký tự và chỉ gồm các chữ cái từ a đến z.',
    ERR_CHANNEL_ALREADY_USED:
      'Kênh này đã được gán cho chế độ chơi khác trong máy chủ.',
    ERR_ROLE_HIERARCHY:
      'Vai trò được chọn cao hơn hoặc ngang bằng vai trò cao nhất của bot. Bot không thể quản lý vai trò này.',
    ERR_LANGUAGE_MAX:
      'Mỗi máy chủ chỉ có thể kích hoạt tối đa 2 ngôn ngữ cùng lúc.',
    ERR_LANGUAGE_MIN:
      'Máy chủ phải duy trì ít nhất 1 ngôn ngữ hoạt động.',
    ERR_LANGUAGE_NOT_SUPPORTED:
      'Hiện tại hệ thống chỉ hỗ trợ tiếng Anh (`en`). Các ngôn ngữ khác sẽ ra mắt trong phiên bản sau.',
    ERR_BLACKLIST_DUPLICATE:
      'Từ này đã có sẵn trong danh sách đen (blacklist) của máy chủ.',
    ERR_BLACKLIST_NOT_FOUND:
      'Không tìm thấy từ này trong danh sách đen (blacklist) của máy chủ.',
    ERR_WHITELIST_DUPLICATE:
      'Từ này đã có sẵn trong danh sách trắng (whitelist) của máy chủ.',
    ERR_WHITELIST_NOT_FOUND:
      'Không tìm thấy từ này trong danh sách trắng (whitelist) của máy chủ.',
    ERR_CONFIG_NOT_FOUND:
      'Máy chủ chưa được cấu hình Word Chain. Dùng `/wordchain-manage channel set` để bắt đầu.',
    ERR_USER_NOT_FOUND:
      'Không tìm thấy thông tin thành viên này trong hệ thống.',
    ERR_ONLY_INVOKER_CAN_INTERACT:
      'Chỉ người dùng thực hiện lệnh mới có thể tương tác với menu trợ giúp này.',

    // Lệnh kiểm tra từ & tra nghĩa
    CHECK_VALID_TITLE: 'Từ Hợp Lệ',
    CHECK_VALID_DESC:
      'Từ **{word}** hợp lệ và thỏa mãn mọi quy tắc định dạng và từ điển.',
    CHECK_INVALID_TITLE: 'Từ Không Hợp Lệ',
    CHECK_INVALID_DESC:
      'Từ **{word}** không hợp lệ. Lý do: **{reason}**.',
    DEF_TITLE: 'Định Nghĩa Từ: {word}',
    DEF_NOT_FOUND:
      'Không tìm thấy định nghĩa cho từ **{word}** trên từ điển Wiktionary tiếng Anh.',
    DEF_PART_OF_SPEECH: 'Từ loại',
    DEF_DEFINITIONS: 'Các định nghĩa tiêu biểu',

    // Bảng xếp hạng & Thống kê
    LB_TITLE_USER_SERVER: 'Bảng Xếp Hạng Người Chơi (Máy Chủ - Theo {metric})',
    LB_TITLE_USER_GLOBAL: 'Bảng Xếp Hạng Người Chơi Toàn Cầu (Theo {metric})',
    LB_TITLE_SERVER: 'Bảng Xếp Hạng Máy Chủ (Chế Độ {mode})',
    LB_EMPTY: 'Chưa có dữ liệu thành viên nào được ghi nhận.',
    LB_ROW: '**#{rank}** <@{userId}> • Điểm: **{score}** | Karma: **{karma}**',
    LB_ROW_SERVER: '**#{rank}** Máy chủ: `{guildId}` • Chuỗi Kỷ Lục: **{highScore}** từ',

    STATS_SERVER_TITLE: 'Thống Kê Word Chain Máy Chủ',
    STATS_USER_TITLE: 'Thống Kê Word Chain Cá Nhân',
    STATS_CURRENT_CHAIN: 'Độ Dài Chuỗi Hiện Tại',
    STATS_HIGH_SCORE: 'Kỷ Lục Cao Nhất (High Score)',
    STATS_LAST_WORD: 'Từ Vừa Chơi Gần Nhất',
    STATS_LAST_PLAYER: 'Người Chơi Gần Nhất',
    STATS_CHANNEL: 'Kênh Chơi Đang Gán',
    STATS_SCORE: 'Tổng Điểm',
    STATS_KARMA: 'Điểm Karma Hợp Tác',
    STATS_CORRECT: 'Số Từ Hợp Lệ Đã Gửi',
    STATS_MISTAKES: 'Số Lần Phá Hỏng Chuỗi',
    STATS_ACCURACY: 'Tỷ Lệ Chính Xác',
    STATS_RANK: 'Thứ Hạng Trong Máy Chủ',
    STATS_RELIABLE: 'Đạt Chuẩn Reliable Role',
    STATS_FAILED: 'Đang Gánh Failed Role',
    YES: 'Có',
    NO: 'Không',

    // Ngôn ngữ
    LANG_ACTIVE_TITLE: 'Ngôn Ngữ Đang Kích Hoạt Trong Máy Chủ',
    LANG_ACTIVE_DESC: 'Danh sách ngôn ngữ được phép nối từ:',
    LANG_SHOW_ALL_TITLE: 'Tất Cả Ngôn Ngữ Được Hỗ Trợ',

    // Trợ giúp
    HELP_TITLE: 'Cẩm Nang & Hướng Dẫn Trò Chơi Nối Từ (Word Chain)',
    HELP_DESC:
      'Vui lòng chọn một chuyên đề bên dưới để xem hướng dẫn luật chơi, cơ chế tính điểm Karma và lệnh quản trị.',
    HELP_TOPIC_HOW_TO_PLAY: 'Cách Chơi Cơ Bản',
    HELP_TOPIC_GAME_RULES: 'Luật Chơi & Các Chế Độ (Normal / Hard)',
    HELP_TOPIC_SERVER_SETUP: 'Cài Đặt Máy Chủ Cho Quản Trị Viên',
    HELP_TOPIC_KARMA_SYSTEM: 'Cơ Chế Điểm Karma & Hạn Chế Lặp Hậu Tố',
    HELP_TOPIC_LIST_COMMANDS: 'Danh Sách Lệnh Đầy Đủ',
    HELP_TOPIC_PRIVACY_POLICY: 'Chính Sách Bảo Mật & Lưu Trữ Dữ Liệu',
    HELP_TOPIC_SUPPORT_SERVER: 'Máy Chủ Hỗ Trợ Kỹ Thuật',
    HELP_TOPIC_OTHER_INFO: 'Thông Tin Mã Nguồn & Dự Án Tham Chiếu',
    HELP_TOPIC_VOTE: 'Bình Chọn Cho Bot',
    HELP_TOPIC_MULTI_LANGUAGE: 'Hệ Thống Đa Ngôn Ngữ',

    // Quản trị viên
    CHANNEL_SET_SUCCESS:
      'Đã thiết lập kênh <#{channelId}> cho chế độ chơi **{mode} Mode** thành công.',
    CHANNEL_UNSET_SUCCESS:
      'Đã hủy gán kênh cho chế độ **{mode} Mode** thành công.',
    ROLE_SET_RELIABLE_SUCCESS:
      'Đã thiết lập vai trò Reliable Role: <@&{roleId}> (Yêu cầu: Karma > 25.0 & Độ chính xác > 97.5%).',
    ROLE_SET_FAILED_SUCCESS:
      'Đã thiết lập vai trò Failed Role: <@&{roleId}> (Tự động gán cho người phá hỏng chuỗi).',
    ROLE_UNSET_SUCCESS:
      'Đã gỡ bỏ thiết lập vai trò **{type} Role** thành công.',
    BLACKLIST_ADD_SUCCESS: 'Đã thêm từ **{word}** vào danh sách đen của máy chủ.',
    BLACKLIST_REMOVE_SUCCESS: 'Đã gỡ từ **{word}** khỏi danh sách đen của máy chủ.',
    BLACKLIST_SHOW_TITLE: 'Danh Sách Đen (Blacklist) Của Máy Chủ',
    BLACKLIST_EMPTY: 'Danh sách đen hiện đang trống.',
    WHITELIST_ADD_SUCCESS: 'Đã thêm từ **{word}** vào danh sách trắng của máy chủ.',
    WHITELIST_REMOVE_SUCCESS: 'Đã gỡ từ **{word}** khỏi danh sách trắng của máy chủ.',
    WHITELIST_SHOW_TITLE: 'Danh Sách Trắng (Whitelist) Của Máy Chủ',
    WHITELIST_EMPTY: 'Danh sách trắng hiện đang trống.',
    RESET_STATS_SUCCESS:
      'Đã đặt lại toàn bộ thống kê người chơi và chuỗi nối từ của máy chủ thành công.',
    ADMIN_PURGE_USER_SUCCESS:
      'Tuân thủ GDPR: Đã xóa toàn bộ bản ghi người chơi của User `{userId}` trên mọi máy chủ.',
    ADMIN_PURGE_SERVER_SUCCESS:
      'Đã xóa sạch toàn bộ dữ liệu Word Chain của máy chủ `{guildId}`.',
    ADMIN_BAN_MEMBER_SUCCESS:
      'Đã cập nhật trạng thái cấm chơi toàn cầu cho User `{userId}`: **{banned}**.',
    ADMIN_BAN_SERVER_SUCCESS:
      'Đã cập nhật trạng thái ẩn khỏi BXH máy chủ `{guildId}`: **{banned}**.',
  },
  en: {
    // Errors & permissions
    ERR_GUILD_ONLY: 'This command can only be used within a Discord server.',
    ERR_PERMISSION_MANAGE_GUILD:
      'You need `Manage Server` or `Administrator` permission to perform this action.',
    ERR_PERMISSION_ADMIN:
      'You need System Administrator (Bot Owner / Operator) permission to perform this administrative operation.',
    ERR_INVALID_WORD:
      'Invalid word input. Words must be at least 2 characters long and contain only letters a to z.',
    ERR_CHANNEL_ALREADY_USED:
      'This channel is already assigned to the other game mode in this server.',
    ERR_ROLE_HIERARCHY:
      'The selected role is higher than or equal to the bot highest role. The bot cannot manage this role.',
    ERR_LANGUAGE_MAX:
      'A server can have at most 2 active languages enabled simultaneously.',
    ERR_LANGUAGE_MIN:
      'A server must have at least one active language enabled.',
    ERR_LANGUAGE_NOT_SUPPORTED:
      'Only English (`en`) is supported in the current release. Additional languages will arrive in later phases.',
    ERR_BLACKLIST_DUPLICATE:
      'This word already exists in the server blacklist.',
    ERR_BLACKLIST_NOT_FOUND:
      'This word was not found in the server blacklist.',
    ERR_WHITELIST_DUPLICATE:
      'This word already exists in the server whitelist.',
    ERR_WHITELIST_NOT_FOUND:
      'This word was not found in the server whitelist.',
    ERR_CONFIG_NOT_FOUND:
      'Word Chain is not yet configured for this server. Use `/wordchain-manage channel set` to begin.',
    ERR_USER_NOT_FOUND:
      'No player records found for this member.',
    ERR_ONLY_INVOKER_CAN_INTERACT:
      'Only the user who executed the original command can interact with this menu.',

    // Word checking & definitions
    CHECK_VALID_TITLE: 'Word is Valid',
    CHECK_VALID_DESC:
      'Word **{word}** is valid and satisfies all token formatting and dictionary criteria.',
    CHECK_INVALID_TITLE: 'Word is Invalid',
    CHECK_INVALID_DESC:
      'Word **{word}** is invalid. Reason: **{reason}**.',
    DEF_TITLE: 'Definition for: {word}',
    DEF_NOT_FOUND:
      'No definition found for word **{word}** on English Wiktionary.',
    DEF_PART_OF_SPEECH: 'Part of Speech',
    DEF_DEFINITIONS: 'Definitions',

    // Leaderboards & Statistics
    LB_TITLE_USER_SERVER: 'Player Leaderboard (Server - By {metric})',
    LB_TITLE_USER_GLOBAL: 'Global Player Leaderboard (By {metric})',
    LB_TITLE_SERVER: 'Server Leaderboard ({mode} Mode)',
    LB_EMPTY: 'No member records have been recorded yet.',
    LB_ROW: '**#{rank}** <@{userId}> • Score: **{score}** | Karma: **{karma}**',
    LB_ROW_SERVER: '**#{rank}** Server: `{guildId}` • Record Chain: **{highScore}** words',

    STATS_SERVER_TITLE: 'Word Chain Server Statistics',
    STATS_USER_TITLE: 'Word Chain Player Statistics',
    STATS_CURRENT_CHAIN: 'Current Chain Length',
    STATS_HIGH_SCORE: 'Server High Score',
    STATS_LAST_WORD: 'Last Word Played',
    STATS_LAST_PLAYER: 'Last Player',
    STATS_CHANNEL: 'Active Channel',
    STATS_SCORE: 'Score',
    STATS_KARMA: 'Cooperative Karma',
    STATS_CORRECT: 'Correct Words',
    STATS_MISTAKES: 'Mistakes Made',
    STATS_ACCURACY: 'Accuracy Rate',
    STATS_RANK: 'Server Rank',
    STATS_RELIABLE: 'Reliable Role Qualified',
    STATS_FAILED: 'Currently Failed Member',
    YES: 'Yes',
    NO: 'No',

    // Languages
    LANG_ACTIVE_TITLE: 'Active Languages in this Server',
    LANG_ACTIVE_DESC: 'Enabled chaining languages:',
    LANG_SHOW_ALL_TITLE: 'All Supported Languages',

    // Help
    HELP_TITLE: 'Word Chain Bot Help & Guide',
    HELP_DESC:
      'Please select a topic from the dropdown menu below to view detailed rules, scoring mechanics, and instructions.',
    HELP_TOPIC_HOW_TO_PLAY: 'How to Play',
    HELP_TOPIC_GAME_RULES: 'Game Rules & Modes (Normal / Hard)',
    HELP_TOPIC_SERVER_SETUP: 'Server Setup Guide for Managers',
    HELP_TOPIC_KARMA_SYSTEM: 'Karma Engine & Suffix Repetition Decay',
    HELP_TOPIC_LIST_COMMANDS: 'Complete List of Commands',
    HELP_TOPIC_PRIVACY_POLICY: 'Privacy Policy & Data Retention',
    HELP_TOPIC_SUPPORT_SERVER: 'Support Server & Community',
    HELP_TOPIC_OTHER_INFO: 'Open Source Credits & Attribution',
    HELP_TOPIC_VOTE: 'Vote for the Bot',
    HELP_TOPIC_MULTI_LANGUAGE: 'Multi-Language Support',

    // Manager
    CHANNEL_SET_SUCCESS:
      'Successfully bound <#{channelId}> to **{mode} Mode**.',
    CHANNEL_UNSET_SUCCESS:
      'Successfully unbound **{mode} Mode** channel.',
    ROLE_SET_RELIABLE_SUCCESS:
      'Reliable role set to <@&{roleId}> (Requirements: Karma > 25.0 & Accuracy > 97.5%).',
    ROLE_SET_FAILED_SUCCESS:
      'Failed role set to <@&{roleId}> (Assigned to player who broke the chain).',
    ROLE_UNSET_SUCCESS:
      'Successfully unset **{type} Role**.',
    BLACKLIST_ADD_SUCCESS: 'Added **{word}** to the server blacklist.',
    BLACKLIST_REMOVE_SUCCESS: 'Removed **{word}** from the server blacklist.',
    BLACKLIST_SHOW_TITLE: 'Server Word Blacklist',
    BLACKLIST_EMPTY: 'Server blacklist is currently empty.',
    WHITELIST_ADD_SUCCESS: 'Added **{word}** to the server whitelist.',
    WHITELIST_REMOVE_SUCCESS: 'Removed **{word}** from the server whitelist.',
    WHITELIST_SHOW_TITLE: 'Server Word Whitelist',
    WHITELIST_EMPTY: 'Server whitelist is currently empty.',
    RESET_STATS_SUCCESS:
      'Successfully reset all player stats and chain state for this server.',
    ADMIN_PURGE_USER_SUCCESS:
      'GDPR Compliance: Successfully wiped all player records for user `{userId}` across all servers.',
    ADMIN_PURGE_SERVER_SUCCESS:
      'Successfully wiped all Word Chain records for guild `{guildId}`.',
    ADMIN_BAN_MEMBER_SUCCESS:
      'Successfully updated global ban state for user `{userId}`: **{banned}**.',
    ADMIN_BAN_SERVER_SUCCESS:
      'Successfully updated leaderboard ban state for guild `{guildId}`: **{banned}**.',
  },
} as const;

export function tWordChain(
  key: keyof (typeof wordChainLocale)['vi'],
  locale: SupportedLocale,
  params?: Record<string, string | number>,
): string {
  let text = t(wordChainLocale, key, locale);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}


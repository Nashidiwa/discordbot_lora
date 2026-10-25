import { type SupportedLocale, t } from '../../shared/utils/i18n.util.js';

export const wordChainLocale = {
  vi: {
    // Lỗi hệ thống & phân quyền
    ERR_GUILD_ONLY: 'Yêu cầu bị từ chối: Không thể thực hiện yêu cầu này ngoài một server.',
    ERR_PERMISSION_MANAGE_GUILD:
      'Yêu cầu bị từ chối: Bạn đang cố gắng trở thành Channel Manager hoặc Administrator.',
    ERR_PERMISSION_ADMIN:
      'Yêu cầu bị từ chối: Bạn đang cố gắng trở thành Authorized Operator.',
    ERR_INVALID_WORD:
      'Yêu cầu bị từ chối: Từ không hợp lệ (từ phải chứa ít nhất 2 ký tự và chỉ gồm các chữ cái từ a-z).',
    ERR_CHANNEL_ALREADY_USED:
      'Yêu cầu bị từ chối: Kênh này đã được gán cho chế độ chơi khác trong server.',
    ERR_ROLE_HIERARCHY:
      'Yêu cầu bị từ chối: Role được chọn cao hơn hoặc ngang bằng role cao nhất của bot. Bot không thể quản lý role này.',
    ERR_LANGUAGE_MAX:
      'Yêu cầu bị từ chối: Server đã đạt giới hạn số lượng ngôn ngữ tối đa cùng lúc (2).',
    ERR_LANGUAGE_MIN:
      'Máy chủ phải duy trì ít nhất 1 ngôn ngữ hoạt động.',
    ERR_LANGUAGE_NOT_SUPPORTED:
      'Yêu cầu bị từ chối: Ngôn ngữ không hỗ trợ. Hiện tại chỉ hỗ trợ tiếng Anh (`en`), các ngôn ngữ khác sẽ được cập nhật trong các phiên bản tiếp theo.',
    ERR_BLACKLIST_DUPLICATE:
      'Yêu cầu bị từ chối: Có vẻ từ này đã có sẵn trong blacklist của server.',
    ERR_BLACKLIST_NOT_FOUND:
      'Yêu cầu bị từ chối: Không tìm thấy từ này trong blacklist của server.',
    ERR_WHITELIST_DUPLICATE:
      'Yêu cầu bị từ chối: Có vẻ từ này đã có sẵn trong whitelist của server.',
    ERR_WHITELIST_NOT_FOUND:
      'Yêu cầu bị từ chối: Không tìm thấy từ này trong whitelist của server.',
    ERR_CONFIG_NOT_FOUND:
      'Server chưa được cấu hình Word Chain. Dùng `/wordchain-manage channel set` để bắt đầu.',
    ERR_USER_NOT_FOUND:
      'Không tìm thấy thông tin user này trên hệ thống.',
    ERR_ONLY_INVOKER_CAN_INTERACT:
      'Yêu cầu bị từ chối: Bạn đang cố gắng đoán mong muốn của người khác.',

    // Lệnh kiểm tra từ & tra nghĩa
    CHECK_VALID_TITLE: 'Từ Hợp Lệ',
    CHECK_VALID_DESC:
      'Từ **{word}** hợp lệ và thỏa mãn mọi quy tắc định dạng và từ điển.',
    CHECK_INVALID_TITLE: 'Từ Không Hợp Lệ',
    CHECK_INVALID_DESC:
      'Từ **{word}** không hợp lệ. Lý do: **{reason}**.',
    DEF_TITLE: 'Định Nghĩa Từ: {word}',
    DEF_NOT_FOUND:
      'Không tìm thấy định nghĩa cho từ **{word}** trên từ điển Wiktionary.',
    DEF_PART_OF_SPEECH: 'Từ loại',
    DEF_DEFINITIONS: 'Các định nghĩa tiêu biểu',

    // Bảng xếp hạng & Thống kê
    LB_TITLE_USER_SERVER: 'Bảng Xếp Hạng Người Chơi Server (Theo {metric})',
    LB_TITLE_USER_GLOBAL: 'Bảng Xếp Hạng Người Chơi Toàn Cầu (Theo {metric})',
    LB_TITLE_SERVER: 'Bảng Xếp Hạng Server (Chế Độ {mode})',
    LB_EMPTY: 'Chưa có dữ liệu user nào được ghi nhận.',
    LB_ROW: '**#{rank}** <@{userId}> • Điểm: **{score}** | Karma: **{karma}**',
    LB_ROW_SERVER: '**#{rank}** Server: `{guildId}` • Chuỗi Kỷ Lục: **{highScore}** từ',

    STATS_SERVER_TITLE: 'Thống Kê Word Chain Server',
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
    LANG_ACTIVE_TITLE: 'Ngôn Ngữ Đang Được Đặt Trong Server',
    LANG_ACTIVE_DESC: 'Danh sách ngôn ngữ được phép nối từ:',
    LANG_SHOW_ALL_TITLE: 'Tất Cả Ngôn Ngữ Được Hỗ Trợ',

    // Trợ giúp
    HELP_TITLE: 'Hướng Dẫn Trò Chơi Word Chain (Nối Từ)',
    HELP_DESC:
      'Vui lòng chọn một chủ đề bên dưới để xem hướng dẫn luật chơi, cơ chế tính điểm Karma và lệnh quản trị.',
    HELP_TOPIC_HOW_TO_PLAY: 'Cách Chơi Cơ Bản',
    HELP_TOPIC_GAME_RULES: 'Luật Chơi & Các Chế Độ (Normal / Hard)',
    HELP_TOPIC_SERVER_SETUP: 'Cài Đặt Server Cho Quản Trị Viên',
    HELP_TOPIC_KARMA_SYSTEM: 'Cơ Chế Điểm Karma & Hạn Chế Lặp Hậu Tố',
    HELP_TOPIC_LIST_COMMANDS: 'Danh Sách Lệnh Đầy Đủ',
    HELP_TOPIC_PRIVACY_POLICY: 'Chính Sách Bảo Mật & Lưu Trữ Dữ Liệu',
    HELP_TOPIC_SUPPORT_SERVER: 'Server Hỗ Trợ Kỹ Thuật',
    HELP_TOPIC_OTHER_INFO: 'Thông Tin Mã Nguồn & Dự Án Tham Chiếu',
    HELP_TOPIC_VOTE: 'Vote Cho Bot',
    HELP_TOPIC_MULTI_LANGUAGE: 'Hệ Thống Đa Ngôn Ngữ',

    // Quản trị viên
    CHANNEL_SET_SUCCESS:
      'Hoàn tất thiết lập channel <#{channelId}> cho chế độ chơi **{mode} Mode**.',
    CHANNEL_UNSET_SUCCESS:
      'Hoàn tất hủy gán channel cho chế độ **{mode} Mode**.',
    ROLE_SET_RELIABLE_SUCCESS:
      'Hoàn tất thiết lập Reliable Role: <@&{roleId}> (Yêu cầu: Karma > 25.0 & Độ chính xác > 97.5%).',
    ROLE_SET_FAILED_SUCCESS:
      'Hoàn tất thiết lập Failed Role: <@&{roleId}> (Tự động gán cho người phá hỏng chuỗi).',
    ROLE_UNSET_SUCCESS:
      'Hoàn tất gỡ bỏ thiết lập role **{type} Role**.',
    BLACKLIST_ADD_SUCCESS: 'Hoàn tất thêm **{word}** vào blacklist của server.',
    BLACKLIST_REMOVE_SUCCESS: 'Hoàn tất gỡ **{word}** khỏi blacklist của server.',
    BLACKLIST_SHOW_TITLE: 'Server Blacklist',
    BLACKLIST_EMPTY: 'Blacklist hiện đang trống.',
    WHITELIST_ADD_SUCCESS: 'Hoàn tất thêm **{word}** vào whitelist của server.',
    WHITELIST_REMOVE_SUCCESS: 'Hoàn tất gỡ **{word}** khỏi whitelist của server.',
    WHITELIST_SHOW_TITLE: 'Server Whitelist',
    WHITELIST_EMPTY: 'Whitelist hiện đang trống.',
    RESET_STATS_SUCCESS:
      'Hoàn tất đặt lại toàn bộ thống kê user và chuỗi nối từ của server.',
    ADMIN_PURGE_USER_SUCCESS:
      'Tuân thủ GDPR: Hoàn tất xóa toàn bộ bản ghi của User `{userId}` trên toàn hệ thống.',
    ADMIN_PURGE_SERVER_SUCCESS:
      'Hoàn tất xóa sạch toàn bộ dữ liệu Word Chain của server `{guildId}`.',
    ADMIN_BAN_MEMBER_SUCCESS:
      'Hoàn tất cập nhật trạng thái cấm chơi toàn cầu cho User `{userId}`: **{banned}**.',
    ADMIN_BAN_SERVER_SUCCESS:
      'Hoàn tất cập nhật trạng thái ẩn khỏi leaderboard server `{guildId}`: **{banned}**.',
  },
  en: {
    // Errors & permissions
    ERR_GUILD_ONLY: 'Request denied: This request cannot be performed outside of a server.',
    ERR_PERMISSION_MANAGE_GUILD:
      'Request denied: You are attempting to become a Server Manager or Administrator.',
    ERR_PERMISSION_ADMIN:
      'Request denied: You are attempting to become an Authorized Operator.',
    ERR_INVALID_WORD:
      'Request denied: Invalid word input (words must be at least 2 characters long and contain only letters a-z).',
    ERR_CHANNEL_ALREADY_USED:
      'Request denied: This channel is already assigned to the other game mode in this server.',
    ERR_ROLE_HIERARCHY:
      'Request denied: The selected role is higher than or equal to the bot highest role, bot cannot manage this role.',
    ERR_LANGUAGE_MAX:
      'Request denied: Server has reached the maximum limit for simultaneous languages (2).',
    ERR_LANGUAGE_MIN:
      'A server must have at least one active language enabled.',
    ERR_LANGUAGE_NOT_SUPPORTED:
      'Request denied: Language not supported. Currently, only English (`en`) is supported, other languages will be added in future updates.',
    ERR_BLACKLIST_DUPLICATE:
      'Request denied: This word already exists in the server blacklist.',
    ERR_BLACKLIST_NOT_FOUND:
      'Request denied: This word was not found in the server blacklist.',
    ERR_WHITELIST_DUPLICATE:
      'Request denied: This word already exists in the server whitelist.',
    ERR_WHITELIST_NOT_FOUND:
      'Request denied: This word was not found in the server whitelist.',
    ERR_CONFIG_NOT_FOUND:
      'Word Chain is not yet configured for this server. Use `/wordchain-manage channel set` to begin.',
    ERR_USER_NOT_FOUND:
      'No player records found for this member.',
    ERR_ONLY_INVOKER_CAN_INTERACT:
      'Request denied: You are attempting to make a move on behalf of another user.',

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
    LB_TITLE_USER_SERVER: 'Server Player Leaderboard (By {metric})',
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


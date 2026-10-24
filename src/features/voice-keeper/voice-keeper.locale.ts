export const voiceKeeperLocale = {
  vi: {
    // Errors
    ERR_GUILD_ONLY: 'Không thể thực hiện yêu cầu này ngoài một server.',
    ERR_PERMISSION_MANAGE_CHANNELS:
      'Yêu cầu bị từ chối: Bạn đang cố gắng trở thành Channel Manager hoặc Administrator.',
    ERR_INVALID_CHANNEL:
      'Yêu cầu không hợp lệ: Kênh mục tiêu không hợp lệ.',
    ERR_BOT_NO_CONNECT_PERMISSION:
      'Yêu cầu bị từ chối: Bot thiếu quyền connect vào voice channel mục tiêu.',
    ERR_BOT_NO_SPEAK_PERMISSION:
      'Nhắc nhở: Bot thiếu quyền speak ở voice channel mục tiêu.',
    ERR_CONFIG_NOT_FOUND:
      'Nhắc nhở: Server chưa thiết lập cấu hình Voice Keeper 24/7. Dùng `/voice_keeper set` để bắt đầu.',
    ERR_CONNECT_FAILED:
      'Lỗi nội bộ: Không thể kết nối vào voice channel mục tiêu. Vui lòng kiểm tra quyền hạn và thử lại.',

    // Success
    SET_SUCCESS_TITLE: 'Hoàn tất cấu hình Voice Keeper',
    SET_SUCCESS_DESC:
      'Đã lưu cấu hình và kết nối bot vào voice channel <#{channelId}>.',
    STOP_SUCCESS_TITLE: 'Đã ngừng Voice Keeper',
    STOP_SUCCESS_DESC:
      'Đã ngắt kết nối và tắt Voice Keeper trên server.',
    RECONNECT_SUCCESS_TITLE: 'Hoàn tất tái kết nối',
    RECONNECT_SUCCESS_DESC:
      'Hoàn tất buộc tái kết nối bot vào voice channel <#{channelId}>.',

    // Status UI
    STATUS_TITLE: 'Trạng thái Voice Keeper',
    STATUS_NOT_CONFIGURED:
      'Server chưa cấu hình Voice Keeper. Dùng `/voice_keeper set` để thiết lập.',
    STATUS_FIELD_CHANNEL: 'Voice Channel',
    STATUS_FIELD_STATE: 'Trạng thái kết nối',
    STATUS_FIELD_DEAF: 'Tự tắt nghe (self_deaf)',
    STATUS_FIELD_MUTE: 'Tự tắt mic (self_mute)',
    STATUS_FIELD_AUTO_RECONNECT: 'Tự động tái kết nối',
    STATUS_FIELD_CONNECTED_AT: 'Thời gian kết nối',
    STATUS_FIELD_PING: 'Độ trễ (ping)',
    STATUS_FIELD_RETRY: 'Số lần thử lại',

    // Connection States
    STATE_READY: '🟢 Đang Trực Tuyến (Connected)',
    STATE_CONNECTING: '🟡 Đang Kết Nối (Connecting)',
    STATE_RECONNECTING: '🟠 Đang Tự Phục Hồi (Reconnecting)',
    STATE_DISCONNECTED: '🔴 Đã Ngắt Kết Nối (Disconnected)',
    STATE_SUSPENDED: '⛔ Đã Buộc Đóng Kết Nối (Suspended)',
    STATE_IDLE: '⚪ Đã Tắt (Disabled)',

    // Common
    ENABLED: 'Bật',
    DISABLED: 'Tắt',
  },
  en: {
    // Errors
    ERR_GUILD_ONLY: 'This request cannot be performed outside of a server.',
    ERR_PERMISSION_MANAGE_CHANNELS:
      'Request denied: You are attempting to become a Channel Manager or Administrator.',
    ERR_INVALID_CHANNEL:
      'Invalid request: Target channel is invalid.',
    ERR_BOT_NO_CONNECT_PERMISSION:
      'Request denied: Bot does not have permission to connect to the target voice channel.',
    ERR_BOT_NO_SPEAK_PERMISSION:
      'Notice: Bot lacks permission to speak in the target voice channel.',
    ERR_CONFIG_NOT_FOUND:
      'Notice: Voice Keeper is not configured for this server. Use `/voice_keeper set` to get started.',
    ERR_CONNECT_FAILED:
      'Internal error: Unable to connect to the target voice channel. Please verify permissions and try again.',

    // Success
    SET_SUCCESS_TITLE: 'Voice Keeper Configured',
    SET_SUCCESS_DESC:
      'Configuration saved. Bot is now connected to <#{channelId}> 24/7.',
    STOP_SUCCESS_TITLE: 'Voice Keeper Stopped',
    STOP_SUCCESS_DESC:
      'Disconnected from voice channel and disabled Voice Keeper for this server.',
    RECONNECT_SUCCESS_TITLE: 'Reconnection Initiated',
    RECONNECT_SUCCESS_DESC:
      'Successfully reconnected bot to voice channel <#{channelId}>.',

    // Status UI
    STATUS_TITLE: 'Voice Keeper Status',
    STATUS_NOT_CONFIGURED:
      'Voice Keeper is not configured for this server. Use `/voice_keeper set` to set it up.',
    STATUS_FIELD_CHANNEL: 'Voice Channel',
    STATUS_FIELD_STATE: 'Connection State',
    STATUS_FIELD_DEAF: 'Self Deafened',
    STATUS_FIELD_MUTE: 'Self Muted',
    STATUS_FIELD_AUTO_RECONNECT: 'Auto Reconnect',
    STATUS_FIELD_CONNECTED_AT: 'Connected Since',
    STATUS_FIELD_PING: 'Latency (Ping)',
    STATUS_FIELD_RETRY: 'Retry Attempts',

    // Connection States
    STATE_READY: '🟢 Connected',
    STATE_CONNECTING: '🟡 Connecting',
    STATE_RECONNECTING: '🟠 Reconnecting (Self-Healing)',
    STATE_DISCONNECTED: '🔴 Disconnected',
    STATE_SUSPENDED: '⛔ Suspended (Circuit Breaker)',
    STATE_IDLE: '⚪ Disabled',

    // Common
    ENABLED: 'Enabled',
    DISABLED: 'Disabled',
  },
} as const;

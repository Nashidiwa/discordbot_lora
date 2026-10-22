export const voiceKeeperLocale = {
  vi: {
    // Errors
    ERR_GUILD_ONLY: 'Lệnh này chỉ có thể sử dụng bên trong một máy chủ Discord.',
    ERR_PERMISSION_MANAGE_CHANNELS:
      'Bạn cần có quyền `Manage Channels` hoặc `Administrator` để thực hiện thao tác này.',
    ERR_INVALID_CHANNEL:
      'Kênh được chọn không phải là kênh thoại (Voice Channel hoặc Stage Channel) hợp lệ.',
    ERR_BOT_NO_CONNECT_PERMISSION:
      'Bot không có quyền `Connect` (Kết nối) vào kênh thoại này.',
    ERR_BOT_NO_SPEAK_PERMISSION:
      'Bot không có quyền `Speak` (Nói) vào kênh thoại này.',
    ERR_CONFIG_NOT_FOUND:
      'Máy chủ này chưa được thiết lập cấu hình Voice Keeper 24/7. Dùng `/voice_keeper set` để bắt đầu.',
    ERR_CONNECT_FAILED:
      'Không thể kết nối vào kênh thoại. Vui lòng kiểm tra quyền hạn và thử lại.',

    // Success
    SET_SUCCESS_TITLE: 'Cấu hình Voice Keeper 24/7 Thành Công',
    SET_SUCCESS_DESC:
      'Đã lưu cấu hình và kết nối bot vào kênh thoại <#{channelId}> 24/7.',
    STOP_SUCCESS_TITLE: 'Đã Dừng Voice Keeper 24/7',
    STOP_SUCCESS_DESC:
      'Đã ngắt kết nối và tạm ngưng chế độ giữ kênh thoại 24/7 trên máy chủ này.',
    RECONNECT_SUCCESS_TITLE: 'Tái Kết Nối Thành Công',
    RECONNECT_SUCCESS_DESC:
      'Đã ép kết nối lại bot vào kênh thoại <#{channelId}>.',

    // Status UI
    STATUS_TITLE: 'Trạng Thái Voice Keeper 24/7',
    STATUS_NOT_CONFIGURED:
      'Máy chủ này chưa cấu hình giữ kênh thoại 24/7. Dùng `/voice_keeper set` để thiết lập.',
    STATUS_FIELD_CHANNEL: 'Kênh Thoại',
    STATUS_FIELD_STATE: 'Trạng Thái Kết Nối',
    STATUS_FIELD_DEAF: 'Tự Tắt Tiếng (Self Deaf)',
    STATUS_FIELD_MUTE: 'Tự Tắt Mic (Self Mute)',
    STATUS_FIELD_AUTO_RECONNECT: 'Tự Động Kết Nối Lại',
    STATUS_FIELD_CONNECTED_AT: 'Thời Gian Kết Nối',
    STATUS_FIELD_PING: 'Độ Trễ (Ping)',
    STATUS_FIELD_RETRY: 'Số Lần Thử Lại (Retry)',

    // Connection States
    STATE_READY: '🟢 Đang Trực Tuyến (Connected)',
    STATE_CONNECTING: '🟡 Đang Kết Nối (Connecting)',
    STATE_RECONNECTING: '🟠 Đang Tự Phục Hồi (Reconnecting)',
    STATE_DISCONNECTED: '🔴 Đã Ngắt Kết Nối (Disconnected)',
    STATE_SUSPENDED: '⛔ Tạm Ngưng do Lỗi Quá Ngưỡng (Suspended)',
    STATE_IDLE: '⚪ Tạm Dừng (Disabled)',

    // Common
    ENABLED: 'Bật',
    DISABLED: 'Tắt',
  },
  en: {
    // Errors
    ERR_GUILD_ONLY: 'This command can only be used within a Discord server.',
    ERR_PERMISSION_MANAGE_CHANNELS:
      'You need `Manage Channels` or `Administrator` permission to perform this action.',
    ERR_INVALID_CHANNEL:
      'The selected channel is not a valid Voice or Stage channel.',
    ERR_BOT_NO_CONNECT_PERMISSION:
      'Bot does not have `Connect` permission in this voice channel.',
    ERR_BOT_NO_SPEAK_PERMISSION:
      'Bot does not have `Speak` permission in this voice channel.',
    ERR_CONFIG_NOT_FOUND:
      'Voice Keeper 24/7 is not configured for this server. Use `/voice_keeper set` to get started.',
    ERR_CONNECT_FAILED:
      'Failed to connect to the voice channel. Please verify permissions and try again.',

    // Success
    SET_SUCCESS_TITLE: 'Voice Keeper 24/7 Configured',
    SET_SUCCESS_DESC:
      'Configuration saved. Bot is now connected to <#{channelId}> 24/7.',
    STOP_SUCCESS_TITLE: 'Voice Keeper 24/7 Stopped',
    STOP_SUCCESS_DESC:
      'Disconnected from voice channel and disabled 24/7 mode for this server.',
    RECONNECT_SUCCESS_TITLE: 'Reconnection Initiated',
    RECONNECT_SUCCESS_DESC:
      'Successfully reconnected bot to voice channel <#{channelId}>.',

    // Status UI
    STATUS_TITLE: 'Voice Keeper 24/7 Status',
    STATUS_NOT_CONFIGURED:
      'Voice Keeper 24/7 is not configured for this server. Use `/voice_keeper set` to set it up.',
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

/**
 * Swarm Linked Roles - Localization Dictionary (Bilingual: vi & en)
 * Strictly follows Zero any & Object as const pattern
 */

export const swarmLocale = {
  vi: {
    // Permissions & Access Control
    OWNER_ONLY: 'Yêu cầu bị từ chối: Bạn muốn nhận nuôi mình sao.',
    OPERATOR_ONLY: 'Yêu cầu bị từ chối: Bạn đang cố gắng trở thành Operator.',
    INVALID_LEVEL: 'Yêu cầu bị từ chối: Phân cấp The Swarm không hợp lệ.',
    TARGET_REQUIRED: 'Yêu cầu bị từ chối: Có vẻ bạn đang cố gắng ghi lại một bản ghi vô danh, vui lòng để lại member mục tiêu.',
    FEATURE_CONFIG_MISSING:
      'Lỗi nội bộ: Dường như cấu hình Client Secret hoặc Redirect URI chưa được thiết lập.',

    // /swarm set
    SET_SUCCESS_TITLE: '✅ Hoàn Tất Cập Nhật',
    SET_SUCCESS_DESC:
      'Đã ghi lại đặc quyền linked role **The Swarm** cho {user}.\n\n• **Phân cấp mới**: **Level {level}** ({roleName})\n• **Cập nhật Metadata**: {syncStatus}',
    SYNC_SUCCESS: 'Hoàn tất đẩy dữ liệu Metadata lên Discord API.',
    SYNC_PENDING_LINK: 'Chưa ủy quyền OAuth2. Cần ủy quyền qua `/swarm link` để được update app metadata.',

    // /swarm remove
    REMOVE_SUCCESS_TITLE: '🔻 Hoàn Tất Thu Hồi',
    REMOVE_SUCCESS_DESC:
      'Đã thu hồi đặc quyền linked role The Swarm của {user}.\n\n• **Trạng thái**: Đã reset về 0 \n• **Cập nhật Metadata**: {syncStatus}',
    REMOVE_SYNC_SUCCESS: 'Theo mặc định, metadata sẽ được tự động cập nhật.',

    // /swarm status
    STATUS_TITLE: '🌌 Trạng Thái Đặc Quyền Linked Role: The Swarm',
    STATUS_FIELD_LEVEL: '🎖️ Phân Cấp',
    STATUS_FIELD_ROLE: '🏷️ Tên Role',
    STATUS_FIELD_OAUTH: '🔗 Ủy Quyền OAuth2',
    STATUS_FIELD_EXPIRES: '⏳ Thời Hạn Token',
    STATUS_FIELD_UPDATED_AT: '🕒 Cập Nhật Cuối',
    STATUS_FIELD_UPDATED_BY: '👤 Người Cập Nhật',
    STATUS_LINKED: 'Đã liên kết',
    STATUS_NOT_LINKED: 'Chưa liên kết (sử dụng `/swarm link` để thực hiện ủy quyền)',
    STATUS_NO_ROLE: 'Chưa có',

    // /swarm delegate
    DELEGATE_ADD_SUCCESS: '✅ {user} đã được ủy quyền Operator.',
    DELEGATE_REMOVE_SUCCESS: '🗑️ {user} đã bị thu hồi quyền hạn Operator.',
    DELEGATE_ALREADY_EXISTS: '{user} đã và đang là Operator.',
    DELEGATE_NOT_FOUND: '{user} không được ủy quyền Operator.',
    DELEGATE_LIST_TITLE: '🛡️ Danh Sách Operators Được Ủy Quyền',
    DELEGATE_LIST_EMPTY: 'Không tìm thấy bất kỳ bản ghi Operator được ủy quyền nào.',

    // /swarm channel
    CHANNEL_SET_SUCCESS: '✅ Đã thiết lập channel thông báo cập nhật bản ghi đặc quyền linked role The Swarm mới: {channel}',
    CHANNEL_REMOVE_SUCCESS: '🗑️ Đã hủy bỏ channel thông báo cập nhật bản ghi đặc quyền linked role The Swarm mới của server',
    CHANNEL_NOT_FOUND: 'Channel không hợp lệ. Vui lòng thử lại.',

    // /swarm link
    LINK_BUTTON_LABEL: '🔗 Kết Nối Tài Khoản Discord',
    LINK_EMBED_TITLE: '🔗 Xác Thực Liên Kết The Swarm',
    LINK_EMBED_DESC:
      'Nhấp vào button dưới đây để ủy quyền `role_connections.write` cho Lora.\n\nSau khi ủy quyền, metadata sẽ được cập nhật tương ứng với bản ghi xác nhận đặc quyền của bạn.\n\n*(Liên kết có hiệu lực trong 10 phút)*',

    // Guild Notifications
    ANNOUNCE_UPGRADE_TITLE: '🌌 ANNOUNCEMENT: Linked role perk: The Swarm',
    ANNOUNCE_UPGRADE_DESC:
      'Đặc quyền linked role The Swarm của {user} đã được cập nhật: **{roleName}**.\n\n⚠️ **Lưu ý:**\nDo cơ chế đồng bộ metadata, vai trò cũ đã tự động thu hồi.\nĐể nhận role mới hãy vào **Server Settings $\\rightarrow$ Linked Roles** và nhấp chọn role **{roleName}** và làm theo hướng dẫn (nếu được yêu cầu).\nHoặc bạn có thể mở link dưới đây để cập nhật metadata rồi vào Server Settings $\\rightarrow$ Linked Roles để nhận role.',
    ANNOUNCE_REVOKE_TITLE: '🔻 REVOCATION: Linked role perk: The Swarm',
    ANNOUNCE_REVOKE_DESC:
      'Đặc quyền linked role The Swarm của {user} đã bị thu hồi.\n\nℹ️ **Trạng thái:**\n Đã chuyển về **0**.\nĐã đẩy Metadata, thực tế cập nhật sẽ tùy thuộc vào trạng thái ủy quyền.',
  },
  en: {
    // Permissions & Access Control
    OWNER_ONLY: 'Request denied: Are you trying to adopt me?',
    OPERATOR_ONLY: 'Request denied: You are attempting to become an Operator.',
    INVALID_LEVEL: 'Request denied: hierarchy level is invalid.',
    TARGET_REQUIRED: 'Request denied: It seems you are trying to create a record without a target; please specify a member.',
    FEATURE_CONFIG_MISSING:
      'Internal error: Client Secret or Redirect URI is missing from bot configuration.',

    // /swarm set
    SET_SUCCESS_TITLE: '✅ Swarm Level Updated Successfully',
    SET_SUCCESS_DESC:
      'Linked role **The Swarm** privilege have been recorded for {user}.\n\n• **New Hierarchy Level**: **Level {level}** ({roleName})\n• **Metadata Update**: {syncStatus}',
    SYNC_SUCCESS: 'Metadata successfully pushed to Discord API.',
    SYNC_PENDING_LINK: 'OAuth2 authorization is pending. Authorization via `/swarm link` is required to update app metadata.',

    // /swarm remove
    REMOVE_SUCCESS_TITLE: '🔻 Swarm Rank Revoked Successfully',
    REMOVE_SUCCESS_DESC:
      'Linked role **The Swarm** privilege for {user} have been revoked.\n\n• **Status**: Reset to 0 \n• **Metadata Update**: {syncStatus}',
    REMOVE_SYNC_SUCCESS: 'By default, metadata will be updated automatically.',

    // /swarm status
    STATUS_TITLE: '🌌 Linked Role The Swarm Status',
    STATUS_FIELD_LEVEL: '🎖️ Tier',
    STATUS_FIELD_ROLE: '🏷️ Role Title',
    STATUS_FIELD_OAUTH: '🔗 OAuth2 Authorization',
    STATUS_FIELD_EXPIRES: '⏳ Token Expiration',
    STATUS_FIELD_UPDATED_AT: '🕒 Last Updated',
    STATUS_FIELD_UPDATED_BY: '👤 Updated By',
    STATUS_LINKED: 'Linked (Ready)',
    STATUS_NOT_LINKED: 'Unlinked (Use `/swarm link` to authorize)',
    STATUS_NO_ROLE: 'None',

    // /swarm delegate
    DELEGATE_ADD_SUCCESS: '✅ Successfully added {user} to Delegated Operators.',
    DELEGATE_REMOVE_SUCCESS: '🗑️ Successfully removed {user} from Delegated Operators.',
    DELEGATE_ALREADY_EXISTS: '{user} is already an authorized Operator.',
    DELEGATE_NOT_FOUND: '{user} is not in the Operator list.',
    DELEGATE_LIST_TITLE: '🛡️ Authorized Swarm Operators List',
    DELEGATE_LIST_EMPTY: 'No operators have been authorized yet.',

    // /swarm channel
    CHANNEL_SET_SUCCESS: '✅ Configured notification channel receive linked role The Swarm new record updates: {channel}',
    CHANNEL_REMOVE_SUCCESS: '🗑️ Notification channel receive linked role The Swarm new record updates removed.',
    CHANNEL_NOT_FOUND: 'Invalid channel. Please try again.',

    // /swarm link
    LINK_BUTTON_LABEL: '🔗 Connect Discord Account',
    LINK_EMBED_TITLE: '🔗 Linked Role The Swarm Authentication',
    LINK_EMBED_DESC:
      'Click the button below to authorize `role_connections.write` for Lora.\n\nOnce authorized, your metadata will be automatically updated to reflect your linked role perk status.\n\n*(Link expires in 10 minutes)*',

    // Guild Notifications
    ANNOUNCE_UPGRADE_TITLE: '🌌 ANNOUNCEMENT: Linked role perk: The Swarm',
    ANNOUNCE_UPGRADE_DESC:
      'Linked role The Swarm perk of {user} has been updated: **{roleName}**!\n\n⚠️ **Notice:**\nDue to metadata synchronization mechanism, the old role has been automatically revoked.\nTo claim your new role, go to **Server Settings $\\rightarrow$ Linked Roles** and select **{roleName}** and follow the instructions (if any).\nAlternatively, you can use the link below to manually update your metadata, then go to Server Settings $\\rightarrow$ Linked Roles to claim your role.',
    ANNOUNCE_REVOKE_TITLE: '🔻 REVOCATION: Linked role perk: The Swarm',
    ANNOUNCE_REVOKE_DESC:
      'Linked role The Swarm perk of {user} has been revoked.\n\nℹ️ **Status:**\nReset to **0**\nMetadata has been pushed; the actual update will depend on your current authorization status.',
  },
} as const;

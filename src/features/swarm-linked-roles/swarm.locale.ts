/**
 * Swarm Linked Roles - Localization Dictionary (Bilingual: vi & en)
 * Strictly follows Zero any & Object as const pattern
 */

export const swarmLocale = {
  vi: {
    // Permissions & Access Control
    OWNER_ONLY: 'Yêu cầu bị từ chối: Lệnh này chỉ dành riêng cho Bot Owner (Super Admin).',
    OPERATOR_ONLY: 'Yêu cầu bị từ chối: Bạn không có quyền Operator để thực thi lệnh này.',
    INVALID_LEVEL: 'Cấp độ Swarm không hợp lệ! Vui lòng chọn số nguyên từ 1 đến 8.',
    TARGET_REQUIRED: 'Vui lòng chỉ định thành viên mục tiêu.',
    FEATURE_CONFIG_MISSING:
      'Cấu hình Client Secret hoặc Redirect URI chưa được thiết lập trên bot.',

    // /swarm set
    SET_SUCCESS_TITLE: '✅ Cập Nhật Cấp Độ Swarm Thành Công',
    SET_SUCCESS_DESC:
      'Đã cập nhật cấp độ **The Swarm** cho {user}.\n\n• **Cấp độ mới**: **Level {level}** ({roleName})\n• **Đồng bộ Discord**: {syncStatus}',
    SYNC_SUCCESS: 'Đã đẩy dữ liệu trực tiếp sang Discord API.',
    SYNC_PENDING_LINK: 'Chưa liên kết Discord. Cần xác thực qua `/swarm link` để kích hoạt Role.',

    // /swarm remove
    REMOVE_SUCCESS_TITLE: '🔻 Thu Hồi Danh Hiệu Swarm Thành Công',
    REMOVE_SUCCESS_DESC:
      'Đã thu hồi danh hiệu The Swarm của {user}.\n\n• **Trạng thái**: Đã reset về Level 0 (Unranked)\n• **Đồng bộ Discord**: {syncStatus}',
    REMOVE_SYNC_SUCCESS: 'Discord đã tự động gỡ bỏ vai trò Linked Role.',

    // /swarm status
    STATUS_TITLE: '🌌 Trạng Thái Danh Hiệu: The Swarm',
    STATUS_FIELD_LEVEL: '🎖️ Cấp Độ Swarm',
    STATUS_FIELD_ROLE: '🏷️ Tên Vai Trò',
    STATUS_FIELD_OAUTH: '🔗 Liên Kết Discord OAuth2',
    STATUS_FIELD_EXPIRES: '⏳ Thời Hạn Token',
    STATUS_FIELD_UPDATED_AT: '🕒 Cập Nhật Cuối',
    STATUS_FIELD_UPDATED_BY: '👤 Người Cập Nhật',
    STATUS_LINKED: 'Đã liên kết (Sẵn sàng nhận Role)',
    STATUS_NOT_LINKED: 'Chưa liên kết (Gõ `/swarm link` để kết nối)',
    STATUS_NO_ROLE: 'Chưa có cấp độ (Unranked)',

    // /swarm delegate
    DELEGATE_ADD_SUCCESS: '✅ Đã thêm {user} vào danh sách Operator được ủy quyền.',
    DELEGATE_REMOVE_SUCCESS: '🗑️ Đã xóa {user} khỏi danh sách Operator.',
    DELEGATE_ALREADY_EXISTS: 'Thành viên {user} đã là Operator từ trước.',
    DELEGATE_NOT_FOUND: 'Thành viên {user} không nằm trong danh sách Operator.',
    DELEGATE_LIST_TITLE: '🛡️ Danh Sách Swarm Operators Được Ủy Quyền',
    DELEGATE_LIST_EMPTY: 'Hiện chưa có Operator nào được ủy quyền trong hệ thống.',

    // /swarm channel
    CHANNEL_SET_SUCCESS: '✅ Đã cấu hình kênh thông báo Swarm cho máy chủ: {channel}',
    CHANNEL_REMOVE_SUCCESS: '🗑️ Đã hủy kênh thông báo Swarm của máy chủ này. Bot sẽ giữ im lặng.',
    CHANNEL_NOT_FOUND: 'Vui lòng chọn kênh văn bản hợp lệ trong máy chủ.',

    // /swarm link
    LINK_BUTTON_LABEL: '🔗 Kết Nối Tài Khoản Discord',
    LINK_EMBED_TITLE: '🔗 Xác Thực Liên Kết The Swarm',
    LINK_EMBED_DESC:
      'Nhấp vào nút bên dưới để cấp quyền kết nối `role_connections.write` cho bot Lora.\n\nSau khi liên kết, Discord sẽ tự động trao cho bạn vai trò **The Swarm** tương ứng với cấp độ đã đạt được!\n\n*(Liên kết có hiệu lực trong 10 phút)*',

    // Guild Notifications
    ANNOUNCE_UPGRADE_TITLE: '🌌 ANNOUNCEMENT: THE SWARM',
    ANNOUNCE_UPGRADE_DESC:
      'Chúc mừng {user} đã được cập nhật cấp bậc danh hiệu: **{roleName}**!\n\n⚠️ **Lưu ý để nhận Role mới:**\nDo cơ chế đồng bộ của Discord, vai trò cũ đã được thu hồi. Hãy thực hiện 1 trong 2 cách sau để nhận role mới:\n1. Vào **Server Settings $\\rightarrow$ Linked Roles** và nhấp chọn role **{roleName}**.\n2. Hoặc nhấp vào nút **[🔗 Receive Role]** dưới đây.',
    ANNOUNCE_REVOKE_TITLE: '🔻 REVOCATION: THE SWARM',
    ANNOUNCE_REVOKE_DESC:
      'Danh hiệu **The Swarm** của {user} đã bị thu hồi bởi Ban Quản Trị.\n\nℹ️ **Trạng thái:**\n• Cấp độ Swarm: Đã chuyển về **0** (Unranked / Đã thu hồi).\n• Quyền hạn: Discord sẽ tự động thu hồi vai trò Linked Role tương ứng khỏi hồ sơ thành viên.',
  },
  en: {
    // Permissions & Access Control
    OWNER_ONLY: 'Access Denied: This command is restricted to the Bot Owner (Super Admin).',
    OPERATOR_ONLY: 'Access Denied: You require Operator privileges to execute this command.',
    INVALID_LEVEL: 'Invalid Swarm level! Please choose an integer between 1 and 8.',
    TARGET_REQUIRED: 'Please specify a target member.',
    FEATURE_CONFIG_MISSING:
      'Client Secret or Redirect URI is missing from bot configuration.',

    // /swarm set
    SET_SUCCESS_TITLE: '✅ Swarm Level Updated Successfully',
    SET_SUCCESS_DESC:
      'Updated **The Swarm** rank for {user}.\n\n• **New Rank**: **Level {level}** ({roleName})\n• **Discord Sync**: {syncStatus}',
    SYNC_SUCCESS: 'Metadata pushed directly to Discord API.',
    SYNC_PENDING_LINK: 'Not yet linked via OAuth2. Run `/swarm link` to claim your role.',

    // /swarm remove
    REMOVE_SUCCESS_TITLE: '🔻 Swarm Rank Revoked Successfully',
    REMOVE_SUCCESS_DESC:
      'Revoked The Swarm rank from {user}.\n\n• **Status**: Reset to Level 0 (Unranked)\n• **Discord Sync**: {syncStatus}',
    REMOVE_SYNC_SUCCESS: 'Discord has automatically removed the Linked Role.',

    // /swarm status
    STATUS_TITLE: '🌌 Title Status: The Swarm',
    STATUS_FIELD_LEVEL: '🎖️ Swarm Level',
    STATUS_FIELD_ROLE: '🏷️ Role Title',
    STATUS_FIELD_OAUTH: '🔗 Discord OAuth2 Link',
    STATUS_FIELD_EXPIRES: '⏳ Token Expiration',
    STATUS_FIELD_UPDATED_AT: '🕒 Last Updated',
    STATUS_FIELD_UPDATED_BY: '👤 Updated By',
    STATUS_LINKED: 'Linked (Ready to receive roles)',
    STATUS_NOT_LINKED: 'Unlinked (Use `/swarm link` to connect)',
    STATUS_NO_ROLE: 'No rank assigned (Unranked)',

    // /swarm delegate
    DELEGATE_ADD_SUCCESS: '✅ Successfully added {user} to Delegated Operators.',
    DELEGATE_REMOVE_SUCCESS: '🗑️ Successfully removed {user} from Delegated Operators.',
    DELEGATE_ALREADY_EXISTS: '{user} is already an authorized Operator.',
    DELEGATE_NOT_FOUND: '{user} is not in the Operator list.',
    DELEGATE_LIST_TITLE: '🛡️ Authorized Swarm Operators List',
    DELEGATE_LIST_EMPTY: 'No operators have been authorized yet.',

    // /swarm channel
    CHANNEL_SET_SUCCESS: '✅ Swarm notification channel configured: {channel}',
    CHANNEL_REMOVE_SUCCESS:
      '🗑️ Swarm notification channel removed. The bot will remain silent in this guild.',
    CHANNEL_NOT_FOUND: 'Please specify a valid text channel in this guild.',

    // /swarm link
    LINK_BUTTON_LABEL: '🔗 Connect Discord Account',
    LINK_EMBED_TITLE: '🔗 The Swarm Account Verification',
    LINK_EMBED_DESC:
      'Click the button below to authorize `role_connections.write` for Lora Bot.\n\nOnce authorized, Discord will automatically grant you the **The Swarm** Linked Role matching your tier!\n\n*(Link expires in 10 minutes)*',

    // Guild Notifications
    ANNOUNCE_UPGRADE_TITLE: '🌌 ANNOUNCEMENT: THE SWARM',
    ANNOUNCE_UPGRADE_DESC:
      'Congratulations to {user} on receiving the title: **{roleName}**!\n\n⚠️ **Action Required to Claim New Role:**\nDue to Discord synchronization rules, the old role has been revoked. Claim your new role using either method:\n1. Navigate to **Server Settings $\\rightarrow$ Linked Roles** and select **{roleName}**.\n2. Or click the **[🔗 Receive Role]** button below.',
    ANNOUNCE_REVOKE_TITLE: '🔻 REVOCATION: THE SWARM',
    ANNOUNCE_REVOKE_DESC:
      'The title **The Swarm** held by {user} has been revoked by Administrators.\n\nℹ️ **Status:**\n• Swarm Level: Reset to **0** (Unranked).\n• Roles: Discord will automatically remove the corresponding Linked Role from your profile.',
  },
} as const;

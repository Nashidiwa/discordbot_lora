/**
 * Donator Perks - Localization Dictionary (Bilingual: vi & en)
 * Adheres strictly to Zero any & Object as const pattern
 */

export const donatorLocale = {
  vi: {
    // General & Permissions
    ADMIN_ONLY: 'Yêu cầu bị từ chối: Bạn đang cố gắng trở thành Administrator.',
    FEATURE_DISABLED:
      'Yêu cầu bị từ chối: Tính năng Donator hiện đang tắt trên server này.',
    ROLE_NOT_CONFIGURED:
      'Yêu cầu bị từ chối: Đã xảy ra lỗi nội bộ. Vui lòng liên hệ Server Administrator. Mã lỗi: PERKS.DONATOR.ROLE_NOT_CONFIGURED',
    ACCOUNT_NOT_FOUND:
      'Không tìm thấy thông tin tài khoản Donator của member  này.',
    PERMISSION_DENIED:
      'Yêu cầu bị từ chối: Bạn không có quyền thực thi hành động này.',
    INVALID_AMOUNT:
      'Yêu cầu bị từ chối: Số tiền ủng hộ không hợp lệ.',
    BOT_HIERARCHY_ERROR:
      'Yêu cầu bị từ chối: Đã xảy ra lỗi nội bộ. Vui lòng liên hệ Server Administrator. Mã lỗi: PERKS.DONATOR.BOT_HIERARCHY_ERROR',

    // Equip & Unequip
    EQUIP_SUCCESS_TITLE: '✅ Hoàn Tất Trang Bị Role Donator',
    EQUIP_SUCCESS_DESC:
      'Bạn đã trang bị **Role Donator**.\n\n• **Hệ số tiêu hao**: **1.0x** (1 giây thực tế = 1 giây credit)\n• **Thời gian còn lại**: **{remainingDuration}**\n• **Dự kiến cạn quỹ**: {depletionDate}\n\n💡 *Khi bận hoặc không hoạt động trên server, bạn có thể dùng `/perk donator unequip` để tạm gỡ role với hệ số tiêu hao bằng 0.2x.*',
    ALREADY_EQUIPPED: 'Bạn đã trang bị Role Donator rồi.',
    INSUFFICIENT_CREDIT:
      'Thời gian credit của bạn đã hết. Cảm ơn vì đã ủng hộ.',
    UNEQUIP_SUCCESS_TITLE: '📦 Hoàn Tất Tạm Gỡ Role Donator',
    UNEQUIP_SUCCESS_DESC:
      'Role Donator của bạn đã được tạm gỡ.\n\n• **Hệ số tiêu hao**: **0.2x** (5 giây thực tế = 1 giây credit)\n• **Thời gian còn lại**: **{remainingDuration}**\n• **Dự kiến cạn quỹ**: {depletionDate}\n\n💡 *Dùng `/perk donator equip` bất kỳ lúc nào để đeo lại.*',
    ALREADY_UNEQUIPPED: 'Bạn hiện không đeo role Donator.',

    // Add Donation
    ADD_SUCCESS_TITLE: '🎉 Hoàn Tất Ghi Nhận Ủng Hộ Donator',
    ADD_SUCCESS_DESC:
      'Đã ghi nhận khoản ủng hộ và tự động cấp đặc quyền cho {user}.',
    ADD_FIELD_RECIPIENT: '👤 Người Hưởng',
    ADD_FIELD_AMOUNT: '💵 Số Tiền',
    ADD_FIELD_BONUS: '🎁 Đòn Bẩy Thưởng Kép',
    ADD_FIELD_ADDED_TIME: '⏱️ Thời Gian Được Cộng',
    ADD_FIELD_TOTAL_CREDIT: '📊 Tổng Quỹ Hiện Tại',
    ADD_FIELD_ROLE_STATUS: '🏷️ Trạng Thái Role',
    ADD_ROLE_EQUIPPED_MSG: 'Đã tự động trang bị (Hệ số tiêu hao 1.0x)',
    ADD_FIELD_NOTE: '📝 Ghi Chú',

    // Adjust Credit
    ADJUST_SUCCESS_TITLE: '🛠️ Hoàn Tất Điều Chỉnh Donator Credit',
    ADJUST_SUCCESS_DESC: 'Đã điều chỉnh quỹ thời gian của {user}.',
    ADJUST_FIELD_TARGET: '👤 Member',
    ADJUST_FIELD_AMOUNT: '⚖️ Mức Điều Chỉnh',
    ADJUST_FIELD_NEW_BALANCE: '⏱️ Số Dư Quỹ Mới',
    ADJUST_FIELD_REASON: '📝 Lý Do',

    // Set Streak
    SET_STREAK_SUCCESS_TITLE: '🔥 Hoàn Tất Cập Nhật Streak',
    SET_STREAK_SUCCESS_DESC:
      'Đã cập nhật bậc Streak cho {user}.',
    SET_STREAK_FIELD_TARGET: '👤 Member',
    SET_STREAK_FIELD_NEW_STREAK: '🔥 Bậc Streak Mới',
    SET_STREAK_FIELD_BONUS: '🎁 Tỷ Lệ Thưởng Streak',

    // Config
    CONFIG_VIEW_TITLE: '⚙️ Cấu Hình Tính Năng Perk Donator',
    CONFIG_VIEW_DESC:
      'Chi tiết cấu hình tính năng Perk Donator tại server này:',
    CONFIG_FIELD_STATUS: '🔘 Trạng Thái Tính Năng',
    CONFIG_FIELD_ROLE: '🏷️ Role Donator',
    CONFIG_FIELD_CHANNEL: '📢 Kênh Thông Báo',
    CONFIG_FIELD_BENCHMARK: '⏱️ Mốc Quy Đổi Chuẩn',
    CONFIG_FIELD_WEEKLY_MIN: '🔥 Mốc Đạt Streak Tuần',
    CONFIG_FIELD_VAULT_RATE: '📦 Tốc Độ Tiêu Hao Kho',
    CONFIG_STATUS_ON: '🟢 Đang BẬT',
    CONFIG_STATUS_OFF: '🔴 Đang TẮT',
    CONFIG_NOT_CONFIGURED: '*Chưa thiết lập*',
    CONFIG_DEFAULT_DM: '*Chưa thiết lập (Luôn gửi DM theo mặc định)*',
    CONFIG_ROLE_SUCCESS_TITLE: '✅ Hoàn Tất Cập Nhật Role Donator',
    CONFIG_ROLE_SUCCESS_DESC:
      'Đã thiết lập Role Donator thành {role}.\nĐã xác minh Role Hierarchy.',
    CONFIG_CHANNEL_SUCCESS_TITLE: '✅ Hoàn Tất Cập Nhật Kênh Thông Báo',
    CONFIG_CHANNEL_SUCCESS_DESC:
      'Đã thiết lập kênh thông báo Donator công khai: {channel}.',
    CONFIG_CHANNEL_CLEARED_TITLE: '✅ Hoàn Tất Xóa Kênh Thông Báo',
    CONFIG_CHANNEL_CLEARED_DESC:
      'Đã hủy kênh thông báo công khai. Bot sẽ luôn ưu tiên gửi DM trực tiếp cho member.',
    CONFIG_ROLE_REQUIRED:
      'Yêu cầu bị từ chối: Vui lòng chọn Role Donator cần gán (qua option role).',

    // Toggle
    TOGGLE_ON_SUCCESS_TITLE: '🟢 Hoàn Tất Bật Tính Năng Donator Perk',
    TOGGLE_ON_SUCCESS_DESC:
      'Tính năng Donator Perk đã được bật trên server.\n\n• Role {role} đã được cấp lại cho các thành viên hợp lệ.\n• Quỹ thời gian tiếp tục được tính toán từ thời điểm hiện tại.',
    TOGGLE_OFF_SUCCESS_TITLE: '🔴 Hoàn Tất Tắt Tính Năng Donator Perk',
    TOGGLE_OFF_SUCCESS_DESC:
      'Tính năng Donator Perk đã được tạm tắt.\n\n• Toàn bộ credit của tất cả member đã được **đóng băng (0.0x)**.\n• Role Donator đã được tạm thu hồi an toàn cho đến khi tính năng được mở lại.',

    // Status
    STATUS_TITLE: '📊 Trạng Thái Donator - {user}',
    STATUS_NO_ACCOUNT_SELF:
      'Bạn chưa có quỹ credit Donator nào trên server.\n\n💡 *Hãy dùng `/perk donator info` để xem thông tin chi tiết.*',
    STATUS_NO_ACCOUNT_OTHER:
      'Member {user} chưa có thông tin tài khoản Donator.',
    STATUS_FIELD_BALANCE: '⏱️ Số Dư Credit',
    STATUS_FIELD_EQUIP: '🎭 Trạng Thái Trang Bị',
    STATUS_FIELD_STREAK: '🔥 Streak',
    STATUS_FIELD_DEPLETION: '⏳ Dự Kiến Cạn Quỹ',
    STATUS_FIELD_TOTAL_DONATED: '💰 Tổng Đã Ủng Hộ',
    STATUS_EQUIPPED_TEXT: '🔥 Đang trang bị (Hệ số 1.0x - 1s thực = 1s credit)',
    STATUS_VAULT_TEXT: '📦 Đang tạm gỡ (Hệ số 0.2x - 5s thực = 1s credit)',
    STATUS_FROZEN_TEXT: '❄️ Đang đóng băng (0.0x - Tính năng tạm tắt)',
    STATUS_DEPLETED_TEXT: 'Đã hết hạn',
    STATUS_INDEFINITE_TEXT: 'Đang đóng băng thời gian / Vô thời hạn',

    // Info
    INFO_TITLE: '💎 Đặc Quyền Dành Cho Donator (Time-Bank & Hybrid Retention)',
    INFO_DESC:
      'Chào mừng đến với tính năng Perk Donator. Donator Credit áp dụng mô hình **Quỹ Thời Gian Tự Chủ** kết hợp **Đòn Bẩy Thưởng Kép** giúp tối đa hóa quyền lợi của bạn.',
    INFO_FIELD_TIMEBANK: '⏱️ 1. Time-Bank',
    INFO_FIELD_TIMEBANK_VAL:
      '• **Mốc quy đổi cơ sở**: 200.000đ = 30 ngày sử dụng liên tục (12.96 giây / 1 VNĐ).\n• **Khi trang bị Role (`/perk donator equip`)**: Hệ số tiêu hao **1.0x** (1 giây thực tế = 1 giây credit).\n• **Khi tạm gỡ (`/perk donator unequip`)**: Hệ số tiêu hao **0.2x** (5 giây thực tế = 1 giây credit).\n• **Bảo vệ đóng băng**: Khi hệ thống bảo trì hoặc tắt, hệ số tiêu hao **0.0x**, bảo lưu 100% credit.',
    INFO_FIELD_VOLUME: '🎁 2. Volume Bonus',
    INFO_FIELD_VOLUME_VAL:
      'Tự động cộng thêm % credit cho mỗi lần nạp đơn lẻ:\n• Dưới 50.000đ: `+0%`\n• 50.000đ - 199.999đ: **`+10%`**\n• 200.000đ - 499.999đ: **`+20%`**\n• Từ 500.000đ trở lên: **`+35%`**',
    INFO_FIELD_STREAK: '🔥 3. Weekly Streak Bonus',
    INFO_FIELD_STREAK_VAL:
      'Tích lũy tối thiểu **50.000đ/tuần dương lịch** (Thứ Hai - Chủ Nhật, UTC+7) để duy trì và tăng chuỗi:\n• Chuỗi 1 tuần: `+0%`\n• Chuỗi 2 tuần: **`+5%`**\n• Chuỗi 3 tuần: **`+10%`**\n• Chuỗi ≥ 4 tuần: **`+20%`**\n• **Soft Decay**: Nếu một tuần không đạt mốc, chuỗi chỉ giảm 1 bậc thay vì reset về 0.',
    INFO_FIELD_GUIDE: '📜 4. Hướng Dẫn & Lệnh Thao Tác',
    INFO_FIELD_GUIDE_VAL:
      '• `/perk donator status`: Tra cứu số dư credit, trạng thái trang bị và ngày cạn quỹ.\n• `/perk donator equip`: Đeo role Donator.\n• `/perk donator unequip`: Tạm gỡ role.\n• `/perk donator info`: Xem lại bảng thông tin này.',
  },
  en: {
    // General & Permissions
    ADMIN_ONLY: 'Request denied: You are attempting to become a Server Administrator.',
    FEATURE_DISABLED:
      'Request denied: Donator perk feature is currently disabled on this server.',
    ROLE_NOT_CONFIGURED:
      'Request denied: An internal error occurred. Please contact Server Administrator. Error code: PERKS.DONATOR.ROLE_NOT_CONFIGURED',
    ACCOUNT_NOT_FOUND: 'No Donator account information found for this member.',
    PERMISSION_DENIED:
      'Request denied: You do not have permission to perform this action.',
    INVALID_AMOUNT:
      'Request denied: Invalid donation amount.',
    BOT_HIERARCHY_ERROR:
      'Request denied: An internal error occurred. Please contact Server Administrator. Error code: PERKS.DONATOR.BOT_HIERARCHY_ERROR',

    // Equip & Unequip
    EQUIP_SUCCESS_TITLE: '✅ Donator Role Equipped Successfully',
    EQUIP_SUCCESS_DESC:
      'You have successfully equipped the **Donator Role**!\n\n• **Burn Rate**: **1.0x** (1 real second = 1 credit second)\n• **Remaining Duration**: **{remainingDuration}**\n• **Estimated Depletion**: {depletionDate}\n\n💡 *When you are away or inactive, use `/perk donator unequip` to unequip and reduce burn rate to 0.2x.*',
    ALREADY_EQUIPPED: 'You have already equipped your Donator Role.',
    INSUFFICIENT_CREDIT:
      'Your credit balance has depleted. Thank for your support.',
    UNEQUIP_SUCCESS_TITLE: '📦 Donator Role Unequipped Successfully',
    UNEQUIP_SUCCESS_DESC:
      'Your Donator Role has been unequipped.\n\n• **Burn Rate**: **0.2x** (5 real second = 1 credit second)\n• **Remaining Duration**: **{remainingDuration}**\n• **Estimated Depletion**: {depletionDate}\n\n💡 *Use `/perk donator equip` anytime to re-equip your role.*',
    ALREADY_UNEQUIPPED: 'Your Donator Role is already unequipped.',

    // Add Donation
    ADD_SUCCESS_TITLE: '🎉 Donation Recorded Successfully',
    ADD_SUCCESS_DESC:
      'Successfully recorded donation and automatically granted perks to {user}.',
    ADD_FIELD_RECIPIENT: '👤 Recipient',
    ADD_FIELD_AMOUNT: '💵 Amount',
    ADD_FIELD_BONUS: '🎁 Hybrid Multiplier',
    ADD_FIELD_ADDED_TIME: '⏱️ Credit Added',
    ADD_FIELD_TOTAL_CREDIT: '📊 Total Credit Balance',
    ADD_FIELD_ROLE_STATUS: '🏷️ Role Status',
    ADD_ROLE_EQUIPPED_MSG: 'Automatically equipped (Burn Rate 1.0x)',
    ADD_FIELD_NOTE: '📝 Note',

    // Adjust Credit
    ADJUST_SUCCESS_TITLE: '🛠️ Donator Credit Adjusted Successfully',
    ADJUST_SUCCESS_DESC: 'Successfully adjusted credit time for member {user}.',
    ADJUST_FIELD_TARGET: '👤 Member',
    ADJUST_FIELD_AMOUNT: '⚖️ Adjustment Amount',
    ADJUST_FIELD_NEW_BALANCE: '⏱️ New Balance',
    ADJUST_FIELD_REASON: '📝 Reason',

    // Set Streak
    SET_STREAK_SUCCESS_TITLE: '🔥 Streak Tier Updated Successfully',
    SET_STREAK_SUCCESS_DESC:
      'Successfully updated Weekly Streak tier for member {user}.',
    SET_STREAK_FIELD_TARGET: '👤 Member',
    SET_STREAK_FIELD_NEW_STREAK: '🔥 New Streak Tier',
    SET_STREAK_FIELD_BONUS: '🎁 Streak Bonus Rate',

    // Config
    CONFIG_VIEW_TITLE: '⚙️ Donator Perk Configuration',
    CONFIG_VIEW_DESC:
      'Operational parameters of the Donator Perk system on this server:',
    CONFIG_FIELD_STATUS: '🔘 Feature Status',
    CONFIG_FIELD_ROLE: '🏷️ Donator Role',
    CONFIG_FIELD_CHANNEL: '📢 Notification Channel',
    CONFIG_FIELD_BENCHMARK: '⏱️ Benchmark Rate',
    CONFIG_FIELD_WEEKLY_MIN: '🔥 Weekly Streak Threshold',
    CONFIG_FIELD_VAULT_RATE: '📦 Vault Burn Rate',
    CONFIG_STATUS_ON: '🟢 ENABLED',
    CONFIG_STATUS_OFF: '🔴 DISABLED',
    CONFIG_NOT_CONFIGURED: '*Not configured*',
    CONFIG_DEFAULT_DM: '*Not configured (Direct Message default)*',
    CONFIG_ROLE_SUCCESS_TITLE: '✅ Donator Role Updated',
    CONFIG_ROLE_SUCCESS_DESC:
      'Donator Role set to {role}.\nBot successfully verified Role Hierarchy permissions.',
    CONFIG_CHANNEL_SUCCESS_TITLE: '✅ Notification Channel Updated',
    CONFIG_CHANNEL_SUCCESS_DESC:
      'Public Donator notification channel set to: {channel}.',
    CONFIG_CHANNEL_CLEARED_TITLE: '✅ Notification Channel Cleared',
    CONFIG_CHANNEL_CLEARED_DESC:
      'Public notification channel cleared. Bot will prioritize direct messages.',
    CONFIG_ROLE_REQUIRED:
      'Request denied: Please specify the Donator Role to assign via the role option.',

    // Toggle
    TOGGLE_ON_SUCCESS_TITLE: '🟢 Donator Perk Enabled',
    TOGGLE_ON_SUCCESS_DESC:
      'Donator Perk feature has been successfully enabled on this server.\n\n• Role {role} has been restored to eligible members.\n• Credit consumption starts from the current moment.',
    TOGGLE_OFF_SUCCESS_TITLE: '🔴 Donator Perk Disabled',
    TOGGLE_OFF_SUCCESS_DESC:
      'Donator Perk feature has been temporarily disabled.\n\n• All members credit balances are now **frozen (0.0x)**.\n• Donator Role has been temporarily removed until re-enabled.',

    // Status
    STATUS_TITLE: '📊 Donator Status - {user}',
    STATUS_NO_ACCOUNT_SELF:
      'You do not have any Donator credit balance on this server yet.\n\n💡 *Use `/perk donator info` to view detailed information.*',
    STATUS_NO_ACCOUNT_OTHER:
      'Member {user} does not have a Donator account.',
    STATUS_FIELD_BALANCE: '⏱️ Credit Balance',
    STATUS_FIELD_EQUIP: '🎭 Equipment Status',
    STATUS_FIELD_STREAK: '🔥 Weekly Streak',
    STATUS_FIELD_DEPLETION: '⏳ Estimated Depletion',
    STATUS_FIELD_TOTAL_DONATED: '💰 Total Donated',
    STATUS_EQUIPPED_TEXT: '🔥 Equipped (1.0x - 1 real sec = 1 credit sec)',
    STATUS_VAULT_TEXT: '📦 In Vault (0.2x - Burns 5x slower)',
    STATUS_FROZEN_TEXT: '❄️ Frozen (0.0x - Feature in maintenance)',
    STATUS_DEPLETED_TEXT: 'Expired',
    STATUS_INDEFINITE_TEXT: 'Time Frozen / Indefinite',

    // Info
    INFO_TITLE: '💎 Donator Perks (Time-Bank & Hybrid Retention)',
    INFO_DESC:
      'Welcome to Donator Perks! Donator Credit uses a **Time-Bank** model combined with **Hybrid Multipliers** to maximize your contribution value.',
    INFO_FIELD_TIMEBANK: '⏱️ 1. Time-Bank Mechanism',
    INFO_FIELD_TIMEBANK_VAL:
      '• **Base Rate**: 200,000 VND = 30 days continuous usage (12.96 seconds / 1 VND).\n• **When Equipped (`/perk donator equip`)**: Standard **1.0x** burn rate (1 second = 1 credit second).\n• **When Unequipped (`/perk donator unequip`)**: Reduced **0.2x** burn rate (5 seconds = 1 credit second).\n• **State Freeze Protection**: During maintenance or when disabled, time freezes at **0.0x**, preserving 100% of your credit.',
    INFO_FIELD_VOLUME: '🎁 2. Volume Bonus Tiers',
    INFO_FIELD_VOLUME_VAL:
      'Automatically adds bonus credit per single donation:\n• Under 50,000 VND: `+0%`\n• 50,000 - 199,999 VND: **`+10%`**\n• 200,000 - 499,999 VND: **`+20%`**\n• 500,000 VND and above: **`+35%`**',
    INFO_FIELD_STREAK: '🔥 3. Weekly Streak Bonus',
    INFO_FIELD_STREAK_VAL:
      'Accumulate at least **50,000 VND per calendar week** (Monday - Sunday, UTC+7) to maintain and advance your streak:\n• 1 Week Streak: `+0%`\n• 2 Weeks Streak: **`+5%`**\n• 3 Weeks Streak: **`+10%`**\n• ≥ 4 Weeks Streak: **`+20%`**\n• **Soft Decay**: If you miss a week, your streak only drops by 1 tier rather than resetting to 0.',
    INFO_FIELD_GUIDE: '📜 4. Guide & Command Usage',
    INFO_FIELD_GUIDE_VAL:
      '• `/perk donator status`: Check credit balance, equipment state, and depletion date.\n• `/perk donator equip`: Equip Donator Role.\n• `/perk donator unequip`: Unequip Donator Role.\n• `/perk donator info`: View this guide and policies again.',
  },
} as const;

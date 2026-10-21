/**
 * Donator Perks - Localization Dictionary (Bilingual: vi & en)
 * Adheres strictly to Zero any & Object as const pattern
 */

export const donatorLocale = {
  vi: {
    // General & Permissions
    ADMIN_ONLY: 'Yêu cầu bị từ chối: Lệnh này yêu cầu quyền Administrator.',
    FEATURE_DISABLED:
      'Yêu cầu bị từ chối: Tính năng Donator hiện đang tắt trên máy chủ này.',
    ROLE_NOT_CONFIGURED:
      'Yêu cầu bị từ chối: Role Donator chưa được cấu hình. Vui lòng liên hệ Administrator.',
    ACCOUNT_NOT_FOUND:
      'Không tìm thấy thông tin tài khoản Donator của thành viên này.',
    PERMISSION_DENIED:
      'Yêu cầu bị từ chối: Bạn không có quyền thực thi hành động này.',
    INVALID_AMOUNT:
      'Yêu cầu bị từ chối: Số tiền ủng hộ không hợp lệ (phải lớn hơn 0).',
    BOT_HIERARCHY_ERROR:
      'Yêu cầu bị từ chối: Role của Bot thấp hơn Role Donator. Vui lòng liên hệ Administrator để sắp xếp lại thứ tự Role trong Server Settings.',

    // Equip & Unequip
    EQUIP_SUCCESS_TITLE: '✅ Trang Bị Role Donator Thành Công',
    EQUIP_SUCCESS_DESC:
      'Bạn đã trang bị **Role Donator** thành công!\n\n• **Tốc độ tiêu hao**: **1.0x** (1 giây thực tế = 1 giây credit)\n• **Thời gian còn lại**: **{remainingDuration}**\n• **Dự kiến cạn quỹ**: {depletionDate}\n\n💡 *Khi bận hoặc không hoạt động trên server, bạn có thể dùng `/perk donator unequip` để cất role vào kho và tiết kiệm thời gian gấp 5 lần.*',
    ALREADY_EQUIPPED: 'Bạn đã trang bị Role Donator rồi.',
    INSUFFICIENT_CREDIT:
      'Thời gian credit của bạn đã hết. Vui lòng ủng hộ thêm để kích hoạt lại role.',
    UNEQUIP_SUCCESS_TITLE: '📦 Cất Role Donator Vào Kho Thành Công',
    UNEQUIP_SUCCESS_DESC:
      'Role Donator của bạn đã được chuyển vào **Kho Tiết Kiệm** an toàn!\n\n• **Tốc độ tiêu hao**: **0.2x** (Tiết kiệm thời gian **gấp 5 lần** so với khi đeo)\n• **Thời gian còn lại**: **{remainingDuration}**\n• **Dự kiến cạn quỹ trong kho**: {depletionDate}\n\n💡 *Dùng `/perk donator equip` bất kỳ lúc nào để lấy role ra đeo lại.*',
    ALREADY_UNEQUIPPED: 'Role Donator của bạn hiện đang được cất trong kho rồi.',

    // Add Donation
    ADD_SUCCESS_TITLE: '🎉 Ghi Nhận Ủng Hộ Donator Thành Công',
    ADD_SUCCESS_DESC:
      'Đã ghi nhận khoản ủng hộ và tự động cấp quyền lợi cho {user}.',
    ADD_FIELD_RECIPIENT: '👤 Người Nhận',
    ADD_FIELD_AMOUNT: '💵 Số Tiền',
    ADD_FIELD_BONUS: '🎁 Đòn Bẩy Thưởng Kép',
    ADD_FIELD_ADDED_TIME: '⏱️ Thời Gian Được Cộng',
    ADD_FIELD_TOTAL_CREDIT: '📊 Tổng Quỹ Hiện Tại',
    ADD_FIELD_ROLE_STATUS: '🏷️ Trạng Thái Role',
    ADD_ROLE_EQUIPPED_MSG: 'Đã tự động trang bị (Tốc độ tiêu hao 1.0x)',
    ADD_FIELD_NOTE: '📝 Ghi Chú',

    // Adjust Credit
    ADJUST_SUCCESS_TITLE: '🛠️ Điều Chỉnh Quỹ Credit Donator Thành Công',
    ADJUST_SUCCESS_DESC: 'Đã điều chỉnh quỹ thời gian của thành viên {user}.',
    ADJUST_FIELD_TARGET: '👤 Thành Viên',
    ADJUST_FIELD_AMOUNT: '⚖️ Mức Điều Chỉnh',
    ADJUST_FIELD_NEW_BALANCE: '⏱️ Số Dư Quỹ Mới',
    ADJUST_FIELD_REASON: '📝 Lý Do',

    // Set Streak
    SET_STREAK_SUCCESS_TITLE: '🔥 Cập Nhật Chuỗi Streak Thành Công',
    SET_STREAK_SUCCESS_DESC:
      'Đã cập nhật bậc chuỗi tuần (Weekly Streak) cho thành viên {user}.',
    SET_STREAK_FIELD_TARGET: '👤 Thành Viên',
    SET_STREAK_FIELD_NEW_STREAK: '🔥 Bậc Streak Mới',
    SET_STREAK_FIELD_BONUS: '🎁 Tỷ Lệ Thưởng Streak',

    // Config
    CONFIG_VIEW_TITLE: '⚙️ Cấu Hình Hệ Thống Donator Perk',
    CONFIG_VIEW_DESC:
      'Chi tiết các tham số vận hành của hệ thống Donator Perk tại máy chủ này:',
    CONFIG_FIELD_STATUS: '🔘 Trạng Thái Tính Năng',
    CONFIG_FIELD_ROLE: '🏷️ Role Donator',
    CONFIG_FIELD_CHANNEL: '📢 Kênh Thông Báo',
    CONFIG_FIELD_BENCHMARK: '⏱️ Mốc Quy Đổi Chuẩn',
    CONFIG_FIELD_WEEKLY_MIN: '🔥 Mốc Đạt Streak Tuần',
    CONFIG_FIELD_VAULT_RATE: '📦 Tốc Độ Tiêu Hao Kho',
    CONFIG_STATUS_ON: '🟢 Đang BẬT',
    CONFIG_STATUS_OFF: '🔴 Đang TẮT',
    CONFIG_NOT_CONFIGURED: '*Chưa thiết lập*',
    CONFIG_DEFAULT_DM: '*Chưa thiết lập (Gửi DM mặc định)*',
    CONFIG_ROLE_SUCCESS_TITLE: '✅ Cập Nhật Role Donator Thành Công',
    CONFIG_ROLE_SUCCESS_DESC:
      'Đã thiết lập Role Donator thành {role}.\nBot đã xác minh quyền phân cấp Role Hierarchy thành công.',
    CONFIG_CHANNEL_SUCCESS_TITLE: '✅ Cập Nhật Kênh Thông Báo Thành Công',
    CONFIG_CHANNEL_SUCCESS_DESC:
      'Đã thiết lập kênh thông báo Donator công khai: {channel}.',
    CONFIG_CHANNEL_CLEARED_TITLE: '✅ Đã Xóa Kênh Thông Báo',
    CONFIG_CHANNEL_CLEARED_DESC:
      'Đã hủy kênh thông báo công khai. Hệ thống sẽ ưu tiên gửi tin nhắn riêng (DM) trực tiếp cho thành viên.',
    CONFIG_ROLE_REQUIRED:
      'Yêu cầu bị từ chối: Vui lòng chọn Role Donator cần gán qua option role.',

    // Toggle
    TOGGLE_ON_SUCCESS_TITLE: '🟢 Đã Bật Tính Năng Donator Perk',
    TOGGLE_ON_SUCCESS_DESC:
      'Tính năng Donator Perk đã được kích hoạt thành công trên máy chủ.\n\n• Role {role} đã được cấp lại cho các thành viên hợp lệ.\n• Quỹ thời gian bắt đầu được tính toán từ thời điểm hiện tại.',
    TOGGLE_OFF_SUCCESS_TITLE: '🔴 Đã Tắt Tính Năng Donator Perk',
    TOGGLE_OFF_SUCCESS_DESC:
      'Tính năng Donator Perk đã được tạm tắt để bảo trì.\n\n• Toàn bộ quỹ credit của tất cả thành viên đã được **đóng băng (0.0x)**.\n• Role Donator đã được tạm thu hồi an toàn cho đến khi tính năng được mở lại.',

    // Status
    STATUS_TITLE: '📊 Trạng Thái Donator - {user}',
    STATUS_NO_ACCOUNT_SELF:
      'Bạn chưa có quỹ credit Donator nào trên máy chủ.\n\n💡 *Hãy dùng `/perk donator info` để xem chính sách và cách ủng hộ máy chủ.*',
    STATUS_NO_ACCOUNT_OTHER:
      'Thành viên {user} chưa có thông tin tài khoản Donator.',
    STATUS_FIELD_BALANCE: '⏱️ Số Dư Quỹ Thời Gian',
    STATUS_FIELD_EQUIP: '🎭 Trạng Thái Trang Bị',
    STATUS_FIELD_STREAK: '🔥 Chuỗi Tuần (Streak)',
    STATUS_FIELD_DEPLETION: '⏳ Dự Kiến Cạn Quỹ',
    STATUS_FIELD_TOTAL_DONATED: '💰 Tổng Đã Ủng Hộ',
    STATUS_EQUIPPED_TEXT: '🔥 Đang trang bị (1.0x - 1s thực = 1s credit)',
    STATUS_VAULT_TEXT: '📦 Đang cất kho (0.2x - Tiết kiệm gấp 5 lần)',
    STATUS_FROZEN_TEXT: '❄️ Đang đóng băng (0.0x - Tính năng bảo trì)',
    STATUS_DEPLETED_TEXT: 'Đã hết hạn',
    STATUS_INDEFINITE_TEXT: 'Đang đóng băng thời gian / Vô thời hạn',

    // Info
    INFO_TITLE: '💎 Quyền Lợi Dành Cho Donator (Time-Bank & Hybrid Retention)',
    INFO_DESC:
      'Chào mừng bạn đến với hệ thống Donator Perk! Hệ thống áp dụng mô hình **Quỹ Thời Gian Tự Chủ (Time-Bank)** kết hợp **Đòn Bẩy Thưởng Kép** giúp tối đa hóa quyền lợi của bạn.',
    INFO_FIELD_TIMEBANK: '⏱️ 1. Quỹ Thời Gian Tự Chủ (Time-Bank)',
    INFO_FIELD_TIMEBANK_VAL:
      '• **Mốc quy đổi cơ sở**: 200.000đ = 30 ngày sử dụng liên tục (12.96 giây / 1 VNĐ).\n• **Khi trang bị Role (`/perk donator equip`)**: Tốc độ tiêu hao chuẩn **1.0x** (1 giây trôi qua trừ 1 giây credit).\n• **Khi cất vào kho (`/perk donator unequip`)**: Tốc độ tiêu hao giảm còn **0.2x** (5 giây trôi qua mới trừ 1 giây credit, kéo dài thời gian **gấp 5 lần**).\n• **Bảo vệ đóng băng**: Khi hệ thống bảo trì hoặc tắt, thời gian đóng băng **0.0x**, bảo lưu 100% credit.',
    INFO_FIELD_VOLUME: '🎁 2. Bảng Thưởng Giá Trị Nạp (Volume Bonus)',
    INFO_FIELD_VOLUME_VAL:
      'Tự động cộng thêm % credit cho mỗi lần nạp đơn lẻ:\n• Dưới 50.000đ: `+0%`\n• 50.000đ - 199.999đ: **`+10%`**\n• 200.000đ - 499.999đ: **`+20%`**\n• Từ 500.000đ trở lên: **`+35%`** *(Mức thưởng cao nhất)*',
    INFO_FIELD_STREAK: '🔥 3. Bảng Thưởng Chuỗi Tuần (Weekly Streak Bonus)',
    INFO_FIELD_STREAK_VAL:
      'Tích lũy tối thiểu **50.000đ/tuần dương lịch** (Thứ Hai - Chủ Nhật, UTC+7) để duy trì và tăng chuỗi:\n• Chuỗi 1 tuần: `+0%`\n• Chuỗi 2 tuần: **`+5%`**\n• Chuỗi 3 tuần: **`+10%`**\n• Chuỗi ≥ 4 tuần: **`+20%`** *(Mức trần thưởng)*\n• **Suy giảm mềm (Soft Decay)**: Nếu một tuần không đạt mốc, chuỗi chỉ giảm 1 bậc thay vì reset về 0.',
    INFO_FIELD_GUIDE: '📜 4. Hướng Dẫn & Lệnh Thao Tác',
    INFO_FIELD_GUIDE_VAL:
      '• `/perk donator status`: Tra cứu số dư credit, trạng thái trang bị và ngày cạn quỹ.\n• `/perk donator equip`: Đeo Role Donator (kích hoạt 1.0x).\n• `/perk donator unequip`: Cất Role vào kho (kích hoạt 0.2x tiết kiệm).\n• `/perk donator info`: Xem lại bảng hướng dẫn và chính sách này.',
  },
  en: {
    // General & Permissions
    ADMIN_ONLY: 'Request rejected: This command requires Administrator permission.',
    FEATURE_DISABLED:
      'Request rejected: Donator perk feature is currently disabled on this server.',
    ROLE_NOT_CONFIGURED:
      'Request rejected: Donator Role has not been configured. Please contact an Administrator.',
    ACCOUNT_NOT_FOUND: 'No Donator account information found for this member.',
    PERMISSION_DENIED:
      'Request rejected: You do not have permission to perform this action.',
    INVALID_AMOUNT:
      'Request rejected: Invalid donation amount (must be greater than 0).',
    BOT_HIERARCHY_ERROR:
      'Request rejected: Bot role is lower than Donator Role in hierarchy. Please contact an Administrator to adjust role order in Server Settings.',

    // Equip & Unequip
    EQUIP_SUCCESS_TITLE: '✅ Donator Role Equipped Successfully',
    EQUIP_SUCCESS_DESC:
      'You have successfully equipped the **Donator Role**!\n\n• **Burn Rate**: **1.0x** (1 real second = 1 credit second)\n• **Remaining Duration**: **{remainingDuration}**\n• **Estimated Depletion**: {depletionDate}\n\n💡 *When you are away or inactive, use `/perk donator unequip` to store your role in the vault and burn 5x slower.*',
    ALREADY_EQUIPPED: 'You have already equipped your Donator Role.',
    INSUFFICIENT_CREDIT:
      'Your credit balance has depleted. Please donate more to reactivate your role.',
    UNEQUIP_SUCCESS_TITLE: '📦 Donator Role Stored in Vault',
    UNEQUIP_SUCCESS_DESC:
      'Your Donator Role has been safely moved to the **Savings Vault**!\n\n• **Burn Rate**: **0.2x** (Burns **5 times slower** than equipped mode)\n• **Remaining Duration**: **{remainingDuration}**\n• **Estimated Depletion in Vault**: {depletionDate}\n\n💡 *Use `/perk donator equip` anytime to re-equip your role.*',
    ALREADY_UNEQUIPPED: 'Your Donator Role is already stored in the vault.',

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
      'Public notification channel cleared. The system will prioritize direct messages (DM).',
    CONFIG_ROLE_REQUIRED:
      'Request rejected: Please specify the Donator Role to assign via the role option.',

    // Toggle
    TOGGLE_ON_SUCCESS_TITLE: '🟢 Donator Perk Enabled',
    TOGGLE_ON_SUCCESS_DESC:
      'Donator Perk feature has been successfully enabled on this server.\n\n• Role {role} has been restored to eligible members.\n• Credit consumption starts from the current moment.',
    TOGGLE_OFF_SUCCESS_TITLE: '🔴 Donator Perk Disabled',
    TOGGLE_OFF_SUCCESS_DESC:
      'Donator Perk feature has been temporarily disabled for maintenance.\n\n• All members credit balances are now **frozen (0.0x)**.\n• Donator Role has been temporarily removed until re-enabled.',

    // Status
    STATUS_TITLE: '📊 Donator Status - {user}',
    STATUS_NO_ACCOUNT_SELF:
      'You do not have any Donator credit balance on this server yet.\n\n💡 *Use `/perk donator info` to check policies and ways to support the server.*',
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
      'Welcome to Donator Perks! The system uses a **Time-Bank** model combined with **Hybrid Multipliers** to maximize your contribution value.',
    INFO_FIELD_TIMEBANK: '⏱️ 1. Time-Bank Mechanism',
    INFO_FIELD_TIMEBANK_VAL:
      '• **Base Rate**: 200,000 VND = 30 days continuous usage (12.96 seconds / 1 VND).\n• **When Equipped (`/perk donator equip`)**: Standard **1.0x** burn rate (1 second = 1 credit second).\n• **When Stored in Vault (`/perk donator unequip`)**: Reduced **0.2x** burn rate (5 seconds = 1 credit second, lasts **5x longer**).\n• **State Freeze Protection**: During maintenance or when disabled, time freezes at **0.0x**, preserving 100% of your credit.',
    INFO_FIELD_VOLUME: '🎁 2. Volume Bonus Tiers',
    INFO_FIELD_VOLUME_VAL:
      'Automatically adds bonus credit per single donation:\n• Under 50,000 VND: `+0%`\n• 50,000 - 199,999 VND: **`+10%`**\n• 200,000 - 499,999 VND: **`+20%`**\n• 500,000 VND and above: **`+35%`** *(Top tier)*',
    INFO_FIELD_STREAK: '🔥 3. Weekly Streak Bonus',
    INFO_FIELD_STREAK_VAL:
      'Accumulate at least **50,000 VND per calendar week** (Monday - Sunday, UTC+7) to maintain and advance your streak:\n• 1 Week Streak: `+0%`\n• 2 Weeks Streak: **`+5%`**\n• 3 Weeks Streak: **`+10%`**\n• ≥ 4 Weeks Streak: **`+20%`** *(Max bonus)*\n• **Soft Decay**: If you miss a week, your streak only drops by 1 tier rather than resetting to 0.',
    INFO_FIELD_GUIDE: '📜 4. Guide & Command Usage',
    INFO_FIELD_GUIDE_VAL:
      '• `/perk donator status`: Check credit balance, equipment state, and depletion date.\n• `/perk donator equip`: Equip Donator Role (1.0x burn rate).\n• `/perk donator unequip`: Store Role in vault (0.2x savings rate).\n• `/perk donator info`: View this guide and policies again.',
  },
} as const;

export const perksLocale = {
  vi: {
    NOT_A_BOOSTER:
      'Yêu cầu bị từ chối: Bạn không thể thực thi lệnh này.',
    SINGLE_BOOSTER_REJECT:
      'Yêu cầu bị từ chối: Bạn không thể thực thi lệnh này.\n\n💡 *Lưu ý: Do đặc tính kỹ thuật, nếu bạn đã boost từ 2 lần trở lên nhưng vẫn bị từ chối, vui lòng liên hệ Staff để kiểm tra và đồng bộ lại.*',
    ROLE_CLAIM_NEW: 'Đã tạo và cấp thành công Custom Role của bạn!',
    ROLE_CLAIM_REEQUIP: 'Đã cấp lại Custom Role của bạn!',
    ROLE_ALREADY_EQUIPPED:
      'Bạn đang sở hữu custom role của mình rồi.\nGợi ý: Dùng /perk server_booster role_unclaim để tạm gỡ custom role của bạn.',
    ROLE_UNCLAIM_SUCCESS:
      'Đã tạm gỡ custom role cho bạn. Dùng /perk server_booster role_claim để nhận lại role.',
    ROLE_CONFIG_SUCCESS: 'Cập nhật cấu hình Custom Role thành công!',
    ROLE_LIMIT_REACHED:
      'Yêu cầu bị từ chối: Server đã đạt giới hạn số lượng Role tối đa. Vui lòng thử lại sau.',
    BOT_HIERARCHY_ERROR:
      'Yêu cầu bị từ chối: Đã xảy ra lỗi nội bộ, vui lòng liên hệ hỗ trợ.\nMã lỗi: PERKS.BOT_HIERARCHY_ERROR.',
    INVALID_COLOR_HEX:
      'Mã màu không hợp lệ. Vui lòng nhập mã màu Hex (ví dụ: #FF5733 hoặc FF5733).',
    MISSING_PRIMARY_COLOR:
      'Yêu cầu bị từ chối: Vui lòng cung cấp mã màu chính (color1) khi cấu hình Custom Role dạng gradient.',
    NO_ROLE_FOUND:
      'Không tìm thấy Custom Role của bạn. Vui lòng liên hệ hỗ trợ.',
    PERK_NOT_CLAIMED:
      'Bạn chưa tạo Custom Role. Hãy sử dụng lệnh /perk server_booster role_claim trước.',
    PERMISSION_DENIED:
      'Yêu cầu bị từ chối: Bạn không có quyền thực thi hành động này.',
    ADMIN_ONLY:
      'Yêu cầu bị từ chối: Bạn đang cố gắng trở thành Server Administrator.',
    SET_BOOST_SUCCESS:
      'Đã cập nhật số lượt boost của {user} thành **{count}** lượt.',
    SERVER_LACKS_ENHANCED_ROLE_COLORS:
      'Yêu cầu bị từ chối: Server hiện chưa kích hoạt Enhanced Role Styles. Do đó server chưa thể áp dụng Custom Role 2 màu (gradient style).',
    BOOSTER_PERK_SUSPENDED:
      'Hệ thống Server Booster Perk hiện đang tạm ngưng hoạt động (SUSPENDED). Mọi thao tác tùy chỉnh tạm thời bị khóa.',
    BOOSTER_PERK_DISABLED:
      'Tính năng Server Booster Perk hiện đang bị tắt trên máy chủ này.',
    BOOSTER_RESUME_SUCCESS:
      'Đã khôi phục hoạt động cho hệ thống Server Booster Perk thành công! Các thành viên có thể tiếp tục nhận và tùy chỉnh Custom Role.',
    BOOSTER_SUSPEND_SUCCESS_KEEP:
      'Đã tạm ngưng (đóng băng) hệ thống Server Booster Perk. Các Custom Role trên Discord được giữ nguyên; mọi thao tác tạo mới/chỉnh sửa của thành viên tạm thời bị khóa. Hệ thống vẫn tiếp tục theo dõi trạng thái boost.',
    BOOSTER_SUSPEND_SUCCESS_CLEAR:
      'Đã tạm ngưng (đóng băng) hệ thống Server Booster Perk. Đã thu hồi và xóa **{count}** Custom Role trên Discord để giải phóng danh sách role. Cấu hình cá nhân của thành viên vẫn được bảo lưu an toàn trong Database.',
    BOOSTER_PURGE_CONFIRM_TITLE:
      '⚠️ Xác Nhận Xóa Sạch & Tắt Vĩnh Viễn Server Booster Perk',
    BOOSTER_PURGE_CONFIRM_DESC:
      'Bạn đang thực hiện thao tác nghiêm trọng: **Xóa sạch toàn bộ Custom Role** của Server Booster và tắt tính năng trên máy chủ này.\n\n• Toàn bộ Custom Role trên server Discord sẽ bị xóa vĩnh viễn.\n• Toàn bộ cấu hình role cá nhân sẽ bị hủy bỏ.\n• **Dữ liệu số lượt boost của thành viên vẫn được bảo lưu an toàn.**\n\nBạn có chắc chắn muốn thực hiện?',
    BOOSTER_PURGE_SUCCESS:
      'Đã tắt vĩnh viễn tính năng Server Booster Perk và xóa thành công **{count}** Custom Role trên server. Trạng thái số lượt boost của thành viên vẫn được bảo lưu.',
    BOOSTER_PURGE_CANCELLED:
      'Đã hủy bỏ thao tác xóa sạch Server Booster Perk.',
    MENTIONABLE_STATUS_ON: 'Bật',
    MENTIONABLE_STATUS_OFF: 'Tắt',
  },
} as const;

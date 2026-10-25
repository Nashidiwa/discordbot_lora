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
  },
} as const;

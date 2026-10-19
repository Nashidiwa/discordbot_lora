import type { ChatInputCommandInteraction } from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { createBaseEmbed } from '../../../../shared/utils/embed.util.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const embed = createBaseEmbed({
    title: '🚀 Quyền Lợi Dành Riêng Cho Server Booster',
    description:
      'Cảm ơn bạn đã đóng góp Nitro Boost để nâng cấp server! Dưới đây là các chính sách và đặc quyền riêng biệt của bạn:',
  }).addFields(
    {
      name: '👑 1. Custom Role Độc Quyền',
      value:
        '• Nhận ngay 1 Custom Role riêng biệt được đặt ở vị trí vinh danh trên bảng danh sách thành viên.\n• Sử dụng `/perk server_booster role_claim` để tạo và trang bị role.',
    },
    {
      name: '🎨 2. Tự Do Tùy Biến Tên & Màu Sắc',
      value:
        '• Đổi tên role và mã màu Hex (ví dụ: `#FF5733`) không giới hạn số lần.\n• Sử dụng lệnh: `/perk server_booster role_config name: <tên> color1: <màu>`',
    },
    {
      name: '🌈 3. Đặc Quyền Gradient Role (2 Màu)',
      value:
        '• Dành riêng cho thành viên boost server từ **2 lần trở lên**.\n• Nhập cả `color1` và `color2` khi cấu hình để tự động áp dụng phối màu gradient 2 màu ngay lập tức (yêu cầu máy chủ mở tính năng Enhanced Role Colors).',
    },
    {
      name: '🛡️ 4. Quản Lý Trang Bị & Chính Sách Ân Hạn',
      value:
        '• Có thể tạm gỡ role qua `/perk server_booster role_unclaim` và nhận lại qua `role_claim` bất kỳ lúc nào.\n• Khi hết hạn boost, bạn có **7 ngày ân hạn (Grace Period)** để re-boost mà không bị mất Custom Role.',
    },
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;

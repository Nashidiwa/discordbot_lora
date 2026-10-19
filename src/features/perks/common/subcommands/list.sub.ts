import type { ChatInputCommandInteraction } from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { createBaseEmbed } from '../../../../shared/utils/embed.util.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const embed = createBaseEmbed({
    title: '✨ Danh Sách Quyền Lợi Máy Chủ (Server Perks)',
    description:
      'Dưới đây là các bậc quyền lợi vinh danh dành cho thành viên tích cực đóng góp cho máy chủ:',
  }).addFields(
    {
      name: '🚀 1. Server Booster',
      value:
        '• Nhận 1 Custom Role độc quyền tự đặt tên & màu sắc.\n• Hỗ trợ Custom Role Gradient 2 màu khi boost từ 2 lần trở lên.\n• Chính sách ân hạn 7 ngày bảo lưu role khi hết hạn boost.\n• Dùng lệnh: `/perk server_booster info` để xem chi tiết.',
    },
    {
      name: '💎 2. Donator Perks',
      value:
        '• Dành cho các thành viên ủng hộ tài chính và tài trợ cho server.\n• Các quyền lợi role đặc biệt và quyền truy cập phòng VIP.\n• Liên hệ Staff Team để biết thêm chi tiết.',
    },
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;

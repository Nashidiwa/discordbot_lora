import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { createBaseEmbed } from '../../../../shared/utils/embed.util.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

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
      name: '💎 2. Donator Perks (Gói Ủng Hộ Tự Chủ & Thưởng Kép)',
      value:
        '• Quỹ thời gian tự chủ (Time-Bank): Tự do trang bị (1.0x) hoặc cất vào kho tiết kiệm (0.2x).\n• Cơ chế Thưởng Kép: Thưởng giá trị nạp (Volume Bonus +10% đến +35%) và Thưởng chuỗi tuần (Streak Bonus +5% đến +20%).\n• Tự động đóng băng bảo lưu thời gian (0.0x) khi hệ thống bảo trì.\n• Dùng lệnh: `/perk donator info` để xem biểu phí và công thức chi tiết.',
    },
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;

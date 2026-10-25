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
    title: '✨ Danh Sách Đặc Quyền Server',
    description:
      'Dưới đây là các đặc quyền dành cho member đóng góp:',
  }).addFields(
    {
      name: '🚀 1. Server Booster',
      value:
        '• Nhận 1 Custom Role độc quyền tự đặt tên & màu sắc.\n• Hỗ trợ Custom Role Gradient 2 màu khi boost từ 2 lần trở lên.\n• Chính sách ân hạn bảo lưu role khi hết hạn boost.\n• Dùng: `/perk server_booster info` để xem chi tiết.',
    },
    {
      name: '💎 2. Donator',
      value:
        '• Quỹ thời gian tự chủ (Time-Bank): Tự do trang bị (1.0x) hoặc lưu kho (0.2x).\n• Cơ chế Thưởng Kép: Volume Bonus +10% đến +35% và Streak Bonus +5% đến +20%.\n• Bảo lưu thời gian (0.0x) khi bảo trì.\n• Dùng: `/perk donator info` để xem thông tin chi tiết.',
    },
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;

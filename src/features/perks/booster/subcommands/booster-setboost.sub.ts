import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type GuildMember,
  PermissionFlagsBits,
} from 'discord.js';
import { logger } from '../../../../core/logger.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import {
  createBaseEmbed,
  createErrorEmbed,
  createSuccessEmbed,
} from '../../../../shared/utils/embed.util.js';
import { perksLocale } from '../../common/perks.locale.js';
import { PerkStatus } from '../../common/perks.types.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const member = interaction.member as GuildMember;

  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    const errEmbed = createErrorEmbed(perksLocale.vi.ADMIN_ONLY);
    await interaction.editReply({ embeds: [errEmbed] });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const count = interaction.options.getInteger('count', true);
  const guildId = interaction.guildId!;

  // 1. Kịch bản đặc biệt: Admin đặt count = 0 cho thành viên đang có Custom Role
  if (count === 0) {
    const perk = await boosterPerkService.getPerk(guildId, targetUser.id);
    const config = await boosterPerkService.getOrCreateConfig(guildId);

    if (perk && perk.roleId && perk.status === PerkStatus.ACTIVE) {
      const confirmEmbed = createBaseEmbed({
        title: '⚠️ Xác Nhận Quy Trình Thu Hồi Custom Role',
        description: `Bạn đang thực thi hành động đặc biệt: **Đặt số lượt boost về 0** cho thành viên <@${targetUser.id}>.\nPhát hiện thành viên đang sở hữu Custom Role <@&${perk.roleId}>.\n\nVui lòng xác nhận quy trình thu hồi perk:\n• **Tiêu chuẩn**: Perk sẽ được bảo lưu trong thời gian ân hạn (${config.gracePeriodDays} ngày), role sẽ tự động thu hồi sau khi hết hạn.\n• **Can thiệp**: Perk và Custom Role bị xóa thu hồi ngay lập tức (và vĩnh viễn).`,
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`perks:setboost_standard:${targetUser.id}:${interaction.user.id}`)
          .setLabel(`Tiêu Chuẩn (${config.gracePeriodDays} Ngày Ân Hạn)`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`perks:setboost_instant:${targetUser.id}:${interaction.user.id}`)
          .setLabel('Can Thiệp (Thu Hồi Ngay)')
          .setStyle(ButtonStyle.Danger),
      );

      await interaction.editReply({
        embeds: [confirmEmbed],
        components: [row],
      });
      return;
    }
  }

  // 2. Kịch bản thông thường (count >= 1 hoặc count = 0 khi user chưa có role)
  await boosterPerkService.setBoostCount(
    guildId,
    targetUser.id,
    count,
  );

  logger.info(
    {
      adminId: interaction.user.id,
      targetUserId: targetUser.id,
      count,
      guildId,
    },
    'Administrator manually updated member boost count',
  );

  const successMessage = perksLocale.vi.SET_BOOST_SUCCESS
    .replace('{user}', `<@${targetUser.id}>`)
    .replace('{count}', count.toString());

  const embed = createSuccessEmbed(successMessage);
  await interaction.editReply({ embeds: [embed] });
};

export default execute;

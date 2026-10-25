import {
  Events,
  type GuildMember,
  type Interaction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotEvent } from '../../../../core/types/index.js';
import {
  createSuccessEmbed,
  createWarningEmbed,
} from '../../../../shared/utils/embed.util.js';
import { perksLocale } from '../../common/perks.locale.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  once: false,
  execute: async (interaction: Interaction): Promise<void> => {
    if (
      !interaction.isButton() ||
      !interaction.customId.startsWith('perks:setboost_')
    ) {
      return;
    }

    const [, rawAction, targetUserId, adminId] = interaction.customId.split(':');
    if (!rawAction || !targetUserId || !adminId) {
      return;
    }

    const action = rawAction.startsWith('setboost_')
      ? rawAction.replace('setboost_', '')
      : rawAction;

    // 1. Bảo mật: Chỉ Admin khởi tạo lệnh mới được bấm nút
    if (interaction.user.id !== adminId) {
      await interaction.reply({
        content: perksLocale.vi.ADMIN_ONLY,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = interaction.member as GuildMember;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: perksLocale.vi.ADMIN_ONLY,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferUpdate();

    // 2. Quy trình Tiêu Chuẩn: Ân Hạn 7 Ngày
    if (action === 'standard') {
      await boosterPerkService.setBoostCountStandardGrace(
        interaction.guildId!,
        targetUserId,
      );

      const config = await boosterPerkService.getOrCreateConfig(
        interaction.guildId!,
      );

      const embed = createSuccessEmbed(
        `⏳ Đã áp dụng quy trình **Tiêu Chuẩn**: Đặt số lượt boost của <@${targetUserId}> về **0** và tiến hành thời gian ân hạn (${config.gracePeriodDays} ngày).`,
      );

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
      return;
    }

    // 3. Quy trình Can Thiệp: Xóa Role Ngay Lập Tức
    if (action === 'instant') {
      await boosterPerkService.setBoostCountInstantRevoke(
        interaction.guild!,
        targetUserId,
      );

      const embed = createWarningEmbed(
        `🛑 Đã áp dụng quy trình **Can Thiệp**: Đặt số lượt boost của <@${targetUserId}> về **0** và đã thu hồi vĩnh viễn Custom Role ngay.`,
      );

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    }
  },
};

export default event;

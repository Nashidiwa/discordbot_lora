import {
  Events,
  type Interaction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotEvent } from '../../../../core/types/index.js';
import {
  createBaseEmbed,
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
      !interaction.customId.startsWith('perks:purge_')
    ) {
      return;
    }

    const [, action, guildId, adminId] = interaction.customId.split(':');
    if (!action || !guildId || !adminId) {
      return;
    }

    // 1. Bảo mật: Chỉ Admin khởi tạo lệnh mới được bấm nút
    if (interaction.user.id !== adminId) {
      await interaction.reply({
        content: perksLocale.vi.ADMIN_ONLY,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: perksLocale.vi.ADMIN_ONLY,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferUpdate();

    // 2. Xác nhận Purge
    if (action === 'purge_confirm') {
      const result = await boosterPerkService.purgeSystem(interaction.guild!);

      const embed = createWarningEmbed(
        perksLocale.vi.BOOSTER_PURGE_SUCCESS.replace(
          '{count}',
          result.deletedCount.toString(),
        ),
      );

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
      return;
    }

    // 3. Hủy bỏ
    if (action === 'purge_cancel') {
      const embed = createBaseEmbed({
        title: 'Đã Hủy Thao Tác',
        description: perksLocale.vi.BOOSTER_PURGE_CANCELLED,
      });

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    }
  },
};

export default event;

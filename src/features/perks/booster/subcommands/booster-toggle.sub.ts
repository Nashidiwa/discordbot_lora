import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import {
  createBaseEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from '../../../../shared/utils/embed.util.js';
import { perksLocale } from '../../common/perks.locale.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    const errEmbed = createErrorEmbed(perksLocale.vi.ADMIN_ONLY);
    await interaction.editReply({ embeds: [errEmbed] });
    return;
  }

  const action = interaction.options.getString('action', true);
  const guild = interaction.guild!;

  // 1. Khôi phục hoạt động (Resume)
  if (action === 'resume') {
    await boosterPerkService.resumeSystem(guild);
    const embed = createSuccessEmbed(perksLocale.vi.BOOSTER_RESUME_SUCCESS);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // 2. Tạm ngưng (Suspend)
  if (action === 'suspend') {
    const clearRoles = interaction.options.getBoolean('clear_roles') ?? false;
    const result = await boosterPerkService.suspendSystem(guild, clearRoles);

    const message = clearRoles
      ? perksLocale.vi.BOOSTER_SUSPEND_SUCCESS_CLEAR.replace(
          '{count}',
          result.clearedCount.toString(),
        )
      : perksLocale.vi.BOOSTER_SUSPEND_SUCCESS_KEEP;

    const embed = createWarningEmbed(message);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // 3. Xóa sạch & Tắt vĩnh viễn (Purge) - Yêu cầu xác nhận 2 nút bấm
  if (action === 'purge') {
    const confirmEmbed = createBaseEmbed({
      title: perksLocale.vi.BOOSTER_PURGE_CONFIRM_TITLE,
      description: perksLocale.vi.BOOSTER_PURGE_CONFIRM_DESC,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`perks:purge_confirm:${guild.id}:${interaction.user.id}`)
        .setLabel('Xác Nhận Xóa Sạch (Purge)')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`perks:purge_cancel:${guild.id}:${interaction.user.id}`)
        .setLabel('Hủy Bỏ')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({
      embeds: [confirmEmbed],
      components: [row],
    });
  }
};

export default execute;

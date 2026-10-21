import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { createSuccessEmbed } from '../../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../../shared/utils/i18n.util.js';
import { donatorLocale } from '../donator.locale.js';
import { formatDurationVietnamese } from '../donator.utils.js';
import { donatorPerkService } from '../services/donator-perk.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const locale = await getUserLocale({
    locale: interaction.locale,
    guildId: interaction.guildId,
  });
  const t = donatorLocale[locale];

  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  const updatedAccount = await donatorPerkService.equipRole(
    guildId,
    userId,
    interaction.guild!,
  );

  const status = await donatorPerkService.getAccountStatus(guildId, userId);

  let depletionDateStr: string = t.STATUS_INDEFINITE_TEXT;
  if (status?.estimatedDepletionDate) {
    const unixTimestamp = Math.floor(
      status.estimatedDepletionDate.getTime() / 1000,
    );
    depletionDateStr = `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)`;
  }

  const remainingDurationStr = formatDurationVietnamese(
    updatedAccount.creditSeconds,
  );

  const description = t.EQUIP_SUCCESS_DESC
    .replace('{remainingDuration}', remainingDurationStr)
    .replace('{depletionDate}', depletionDateStr);

  const embed = createSuccessEmbed(description, t.EQUIP_SUCCESS_TITLE);

  await interaction.editReply({ embeds: [embed] });
};

export default execute;

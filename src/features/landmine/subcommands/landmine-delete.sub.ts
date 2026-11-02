import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { createSuccessEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { landmineLocale } from '../landmine.locale.js';
import { landmineService } from '../services/landmine.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const guildId = interaction.guildId!;
  const locale = await getUserLocale({
    locale: interaction.locale,
    guildId,
  });
  const t = landmineLocale[locale];

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    throw new AppError(t.ADMIN_ONLY, 'ADMIN_ONLY', true);
  }

  const moduleKey = interaction.options.getString('module', true);

  const deletedKey = await landmineService.deleteCustomModule(
    guildId,
    moduleKey,
  );

  const message = t.DELETE_SUCCESS.replace('{module}', deletedKey);
  const embed = createSuccessEmbed(message);
  await interaction.editReply({ embeds: [embed] });
};

export default execute;

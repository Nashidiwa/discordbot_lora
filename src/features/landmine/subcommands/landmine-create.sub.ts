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

  const ratePercent = interaction.options.getNumber('rate', true);
  const rawDuration = interaction.options.getString('duration', true);
  const note = interaction.options.getString('note') ?? undefined;

  const durationSeconds = landmineService.parseDurationString(rawDuration);

  const createdKey = await landmineService.createCustomModule(guildId, {
    ratePercent,
    durationSeconds,
    note,
  });

  const durationFormatted = landmineService.formatDurationSeconds(
    durationSeconds,
    locale,
  );

  const message = t.CREATE_SUCCESS.replace('{module}', createdKey)
    .replace('{rate}', ratePercent.toString())
    .replace('{duration}', durationFormatted);

  const embed = createSuccessEmbed(message);
  await interaction.editReply({ embeds: [embed] });
};

export default execute;

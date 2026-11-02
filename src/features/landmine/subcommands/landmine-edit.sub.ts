import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { createSuccessEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { ScopeType } from '../landmine.constants.js';
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
  const note = interaction.options.getString('note') ?? undefined;
  const ratePercent = interaction.options.getNumber('rate') ?? undefined;
  const rawDuration = interaction.options.getString('duration') ?? undefined;
  const channelScope =
    (interaction.options.getString('channel_scope') as ScopeType) ?? undefined;
  const roleScope =
    (interaction.options.getString('role_scope') as ScopeType) ?? undefined;
  const leaderboard =
    interaction.options.getBoolean('leaderboard') ?? undefined;
  const autodelete =
    interaction.options.getBoolean('autodelete') ?? undefined;
  const successMsg =
    interaction.options.getString('success_msg') ?? undefined;
  const failedMsg =
    interaction.options.getString('failed_msg') ?? undefined;

  let durationSeconds: number | undefined;
  if (rawDuration !== undefined) {
    durationSeconds = landmineService.parseDurationString(rawDuration);
  }

  const updatedKey = await landmineService.editModule(guildId, moduleKey, {
    note,
    ratePercent,
    durationSeconds,
    channelScopeType: channelScope,
    roleScopeType: roleScope,
    includeInServerLeaderboard: leaderboard,
    autoDeleteNotification: autodelete,
    successMessage: successMsg,
    failedMessage: failedMsg,
  });

  const message = t.EDIT_SUCCESS.replace('{module}', updatedKey);
  const embed = createSuccessEmbed(message);
  await interaction.editReply({ embeds: [embed] });
};

export default execute;

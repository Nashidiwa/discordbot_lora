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
import {
  extractSnowflakeIds,
  landmineService,
} from '../services/landmine.service.js';

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
  const mode = interaction.options.getString('mode', true) as ScopeType;
  const rawChannels = interaction.options.getString('channels');
  let channelIds: string[] | undefined;
  if (rawChannels) {
    channelIds = extractSnowflakeIds(rawChannels);
    if (channelIds.length === 0) {
      throw new AppError(t.NO_CHANNELS_FOUND, 'NO_CHANNELS_FOUND', true);
    }
  }

  const result = await landmineService.setChannels(
    guildId,
    moduleKey,
    mode,
    channelIds,
  );

  let modeDisplay: string = t.SCOPE_ALL;
  if (result.mode === ScopeType.WHITELIST) {
    modeDisplay = t.SCOPE_WHITELIST;
  } else if (result.mode === ScopeType.BLACKLIST) {
    modeDisplay = t.SCOPE_BLACKLIST;
  }

  const message = t.CHANNELS_SUCCESS.replace('{module}', result.moduleKey)
    .replace('{mode}', modeDisplay)
    .replace('{count}', String(result.count));

  const embed = createSuccessEmbed(message);
  await interaction.editReply({ embeds: [embed] });
};

export default execute;
